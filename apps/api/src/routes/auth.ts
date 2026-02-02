import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, users, sessions, passwordResetTokens, publisherAdmins } from '../db';
import { eq, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { TIMEOUTS } from '../constants/timeouts';

interface LoginBody {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  publisherId?: string;
  // Note: publisherIds removed from JWT - now looked up on each request
}

// Stricter rate limiting for login endpoint
const loginRateLimiter = {
  max: TIMEOUTS.LOGIN_RATE_LIMIT_MAX,
  timeWindow: TIMEOUTS.RATE_LIMIT_WINDOW,
  errorResponseBuilder: () => ({
    error: 'Too many login attempts',
    message: 'Please try again in a minute'
  })
};

export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * Authenticate user and generate JWT token
   * @route POST /api/auth/login
   * @access Public
   * @param {LoginBody} body - Email and password credentials
   * @returns {Promise<{token: string, user: User}>} JWT token and user details
   * @throws {400} Email and password are required
   * @throws {401} Invalid credentials or account disabled
   * @description Rate limited to 5 attempts per minute. Updates last login timestamp and creates refresh token session.
   */
  fastify.post<{ Body: LoginBody }>('/login', {
    config: {
      rateLimit: loginRateLimiter
    }
  }, async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = db.select().from(users).where(eq(users.email, email.toLowerCase())).get();

    if (!user) {
      return reply.code(401).send({ message: 'Invalid email or password' });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return reply.code(401).send({ message: 'Account is disabled' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return reply.code(401).send({ message: 'Invalid email or password' });
    }

    // Update last login
    db.update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.id, user.id))
      .run();

    // Generate JWT token (publisherIds will be looked up on each request, not stored in JWT)
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      publisherId: user.publisherId ?? undefined,
    };

    const token = fastify.jwt.sign(tokenPayload, { expiresIn: TIMEOUTS.JWT_EXPIRY });

    // Generate refresh token
    const refreshToken = uuidv4();
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + TIMEOUTS.REFRESH_TOKEN_EXPIRY_DAYS);

    // Store refresh token in sessions table
    db.insert(sessions).values({
      id: uuidv4(),
      userId: user.id,
      refreshToken: refreshToken,
      userAgent: request.headers['user-agent'] || '',
      ipAddress: request.ip,
      expiresAt: refreshExpiry.toISOString(),
      createdAt: new Date().toISOString(),
    }).run();

    // Set refresh token as HttpOnly cookie
    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TIMEOUTS.SESSION_COOKIE_MAX_AGE,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        publisherId: user.publisherId,
      },
    };
  });

  /**
   * Log out user and invalidate refresh token
   * @route POST /api/auth/logout
   * @access Public
   * @returns {Promise<{message: string}>} Success message
   * @description Deletes the session from database and clears the refresh token cookie
   */
  fastify.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (refreshToken) {
      // Delete the session
      db.delete(sessions).where(eq(sessions.refreshToken, refreshToken)).run();
    }

    // Clear the cookie
    reply.clearCookie('refreshToken', { path: '/' });

    return { message: 'Logged out successfully' };
  });

  /**
   * Refresh JWT access token using refresh token cookie
   * @route POST /api/auth/refresh
   * @access Public (requires valid refresh token cookie)
   * @returns {Promise<{token: string, user: User}>} New JWT token and user details
   * @throws {401} No refresh token provided, invalid token, or expired token
   * @description Validates refresh token from cookie, generates new JWT, and rotates refresh token for security
   */
  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken) {
      return reply.code(401).send({ message: 'No refresh token provided' });
    }

    // Find the session
    const session = db.select().from(sessions).where(eq(sessions.refreshToken, refreshToken)).get();

    if (!session) {
      return reply.code(401).send({ message: 'Invalid refresh token' });
    }

    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      db.delete(sessions).where(eq(sessions.id, session.id)).run();
      return reply.code(401).send({ message: 'Refresh token expired' });
    }

    // Get the user
    const user = db.select().from(users).where(eq(users.id, session.userId)).get();

    if (!user || user.status !== 'active') {
      return reply.code(401).send({ message: 'User not found or disabled' });
    }

    // Generate new JWT token (publisherIds will be looked up on each request, not stored in JWT)
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      publisherId: user.publisherId ?? undefined,
    };

    const token = fastify.jwt.sign(tokenPayload, { expiresIn: TIMEOUTS.JWT_EXPIRY });

    // Generate new refresh token and rotate
    const newRefreshToken = uuidv4();
    db.update(sessions)
      .set({ refreshToken: newRefreshToken })
      .where(eq(sessions.id, session.id))
      .run();

    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        publisherId: user.publisherId,
      },
    };
  });

  // Get current user (requires auth)
  fastify.get('/me', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ message: 'Unauthorized' });
      }
    },
  }, async (request, reply) => {
    const decoded = request.user as TokenPayload;

    // Get fresh user data
    const user = db.select().from(users).where(eq(users.id, decoded.userId)).get();

    if (!user || user.status !== 'active') {
      return reply.code(401).send({ message: 'User not found or disabled' });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        publisherId: user.publisherId,
      },
    };
  });

  // Forgot password endpoint
  fastify.post<{ Body: { email: string } }>('/forgot-password', async (request, reply) => {
    const { email } = request.body;

    if (!email) {
      return reply.code(400).send({ message: 'Email is required' });
    }

    // Find user by email
    const user = db.select().from(users).where(eq(users.email, email.toLowerCase())).get();

    if (user) {
      // Generate password reset token
      const resetToken = uuidv4();

      // Token expires in 1 hour
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + TIMEOUTS.PASSWORD_RESET_EXPIRY_HOURS);

      // Store the reset token
      db.insert(passwordResetTokens).values({
        id: uuidv4(),
        userId: user.id,
        token: resetToken,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      }).run();

      // In development, log the reset link to console
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n=== PASSWORD RESET LINK ===');
        console.log(`User: ${user.email}`);
        console.log(`Reset link: http://localhost:5173/reset-password?token=${resetToken}`);
        console.log(`Expires at: ${expiresAt.toISOString()}`);
        console.log('===========================\n');
      }
    }

    // Always return success to prevent email enumeration
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  });

  // Reset password endpoint
  fastify.post<{ Body: { token: string; password: string } }>('/reset-password', async (request, reply) => {
    const { token, password } = request.body;

    if (!token || !password) {
      return reply.code(400).send({ message: 'Token and password are required' });
    }

    if (password.length < 8) {
      return reply.code(400).send({ message: 'Password must be at least 8 characters' });
    }

    // Find the reset token
    const resetToken = db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt)
      ))
      .get();

    if (!resetToken) {
      return reply.code(400).send({ message: 'Invalid or expired reset token' });
    }

    // Check if token has expired
    if (new Date(resetToken.expiresAt) < new Date()) {
      return reply.code(400).send({ message: 'Invalid or expired reset token' });
    }

    // Find the user
    const user = db.select().from(users).where(eq(users.id, resetToken.userId)).get();

    if (!user) {
      return reply.code(400).send({ message: 'Invalid or expired reset token' });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update the user's password
    db.update(users)
      .set({
        passwordHash,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, user.id))
      .run();

    // Mark the token as used
    db.update(passwordResetTokens)
      .set({ usedAt: new Date().toISOString() })
      .where(eq(passwordResetTokens.id, resetToken.id))
      .run();

    // Invalidate all user sessions for security
    db.delete(sessions).where(eq(sessions.userId, user.id)).run();

    return { message: 'Password has been reset successfully' };
  });
}
