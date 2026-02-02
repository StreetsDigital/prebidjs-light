import { describe, it, expect, beforeEach } from 'vitest';
import { buildTestServer } from '../../__tests__/test-helper';
import { createTestUser, getTestDb } from '../../__tests__/setup';
import { v4 as uuidv4 } from 'uuid';

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Test user is created in setup.ts beforeEach
  });

  it('should reject missing credentials', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Email and password are required',
    });

    await app.close();
  });

  it('should reject missing email', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { password: 'test123' },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('should reject missing password', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@example.com' },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('should reject invalid email', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nonexistent@example.com', password: 'wrong' },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Invalid email or password',
    });

    await app.close();
  });

  it('should reject invalid password', async () => {
    const app = await buildTestServer();
    const user = await createTestUser({ email: 'valid@example.com', password: 'correctpassword' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: user.email, password: 'wrongpassword' },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Invalid email or password',
    });

    await app.close();
  });

  it('should successfully login with valid credentials', async () => {
    const app = await buildTestServer();
    const user = await createTestUser({ email: 'login@example.com', password: 'mypassword123' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: user.email, password: user.password },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('user');
    expect(body.user.email).toBe(user.email);
    expect(body.user.role).toBe(user.role);

    // Check that refresh token cookie is set
    expect(response.headers['set-cookie']).toBeDefined();

    await app.close();
  });

  it('should reject disabled account', async () => {
    const app = await buildTestServer();
    const user = await createTestUser({
      email: 'disabled@example.com',
      password: 'password123',
      status: 'disabled',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: user.email, password: user.password },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Account is disabled',
    });

    await app.close();
  });

  it('should be case insensitive for email', async () => {
    const app = await buildTestServer();
    const user = await createTestUser({ email: 'test@example.com', password: 'password123' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'TEST@EXAMPLE.COM', password: user.password },
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('should update last login timestamp', async () => {
    const app = await buildTestServer();
    const user = await createTestUser({ email: 'timestamp@example.com', password: 'password123' });
    const db = await getTestDb();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: user.email, password: user.password },
    });

    expect(response.statusCode).toBe(200);

    // Check that last_login_at was updated
    const updatedUser = db.prepare('SELECT last_login_at FROM users WHERE id = ?').get(user.id) as { last_login_at: string | null };
    expect(updatedUser.last_login_at).not.toBeNull();

    await app.close();
  });

  it('should create a session with refresh token', async () => {
    const app = await buildTestServer();
    const user = await createTestUser({ email: 'session@example.com', password: 'password123' });
    const db = await getTestDb();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: user.email, password: user.password },
    });

    expect(response.statusCode).toBe(200);

    // Check that session was created
    const session = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(user.id) as any;
    expect(session).toBeDefined();
    expect(session.refresh_token).toBeDefined();
    expect(session.expires_at).toBeDefined();

    await app.close();
  });
});

describe('POST /api/auth/logout', () => {
  it('should logout successfully', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Logged out successfully',
    });

    await app.close();
  });
});

describe('POST /api/auth/refresh', () => {
  it('should reject missing refresh token', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({
      message: 'No refresh token provided',
    });

    await app.close();
  });

  it('should reject invalid refresh token', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { refreshToken: 'invalid-token' },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Invalid refresh token',
    });

    await app.close();
  });
});

describe('GET /api/auth/me', () => {
  it('should reject unauthorized request', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('should return current user with valid token', async () => {
    const app = await buildTestServer();
    const user = await createTestUser({ email: 'me@example.com', password: 'password123' });

    const token = app.jwt.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    }, { expiresIn: '24h' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.user.email).toBe(user.email);
    expect(body.user.id).toBe(user.id);

    await app.close();
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('should reject missing email', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Email is required',
    });

    await app.close();
  });

  it('should return success even for non-existent email', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'nonexistent@example.com' },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

    await app.close();
  });
});

describe('POST /api/auth/reset-password', () => {
  it('should reject missing token', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { password: 'newpassword123' },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('should reject short password', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'some-token', password: 'short' },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Password must be at least 8 characters',
    });

    await app.close();
  });

  it('should reject invalid token', async () => {
    const app = await buildTestServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'invalid-token', password: 'newpassword123' },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Invalid or expired reset token',
    });

    await app.close();
  });
});
