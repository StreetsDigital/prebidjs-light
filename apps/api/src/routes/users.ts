import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, users } from '../db';
import { eq, ne, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { requireAuth, requireAdmin, requireSuperAdmin, TokenPayload } from '../middleware/auth';

interface CreateUserBody {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'publisher';
  publisherId?: string;
}

interface UpdateUserBody {
  email?: string;
  password?: string;
  name?: string;
  role?: 'super_admin' | 'admin' | 'publisher';
  publisherId?: string;
  status?: 'active' | 'disabled';
}

export default async function userRoutes(fastify: FastifyInstance) {
  // List all users - admin only
  fastify.get('/', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    // Super admin sees all users
    // Regular admin might see only certain users (TODO: implement restrictions)
    const allUsers = db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      publisherId: users.publisherId,
      status: users.status,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    }).from(users).all();

    return {
      users: allUsers,
      total: allUsers.length,
    };
  });

  // Get single user
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const currentUser = request.user as TokenPayload;

    // Users can view their own profile, admins can view all
    if (currentUser.userId !== id && !['super_admin', 'admin'].includes(currentUser.role)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const user = db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      publisherId: users.publisherId,
      status: users.status,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    }).from(users).where(eq(users.id, id)).get();

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return user;
  });

  // Create user - super_admin only
  fastify.post<{ Body: CreateUserBody }>('/', {
    preHandler: requireSuperAdmin,
  }, async (request, reply) => {
    const { email, password, name, role, publisherId } = request.body;

    if (!email || !password || !name || !role) {
      return reply.code(400).send({ error: 'Email, password, name, and role are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.code(400).send({ error: 'Invalid email format' });
    }

    // Validate password requirements
    if (password.length < 8) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters' });
    }

    // Check for existing user with same email
    const existing = db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
    if (existing) {
      return reply.code(409).send({ error: 'User with this email already exists' });
    }

    const now = new Date().toISOString();
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    db.insert(users).values({
      id,
      email: email.toLowerCase(),
      passwordHash,
      name,
      role,
      publisherId: publisherId || null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).run();

    const newUser = db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      publisherId: users.publisherId,
      status: users.status,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, id)).get();

    return reply.code(201).send(newUser);
  });

  // Update user - super_admin only (or self for basic info)
  fastify.put<{ Params: { id: string }; Body: UpdateUserBody }>('/:id', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const { email, password, name, role, publisherId, status } = request.body;
    const currentUser = request.user as TokenPayload;

    // Check permissions
    const isSelf = currentUser.userId === id;
    const isSuperAdmin = currentUser.role === 'super_admin';

    // Only super_admin can change role, status, or other users' data
    if (!isSelf && !isSuperAdmin) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    if ((role || status || publisherId !== undefined) && !isSuperAdmin) {
      return reply.code(403).send({ error: 'Only super_admin can change role, status, or publisher assignment' });
    }

    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // If email is being changed, check for duplicates
    if (email && email !== user.email) {
      const existing = db.select().from(users).where(
        and(eq(users.email, email.toLowerCase()), ne(users.id, id))
      ).get();
      if (existing) {
        return reply.code(409).send({ error: 'Email already in use' });
      }
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = { updatedAt: now };

    if (email) updates.email = email.toLowerCase();
    if (name) updates.name = name;
    if (password) updates.passwordHash = await bcrypt.hash(password, 10);
    if (role && isSuperAdmin) updates.role = role;
    if (status && isSuperAdmin) updates.status = status;
    if (publisherId !== undefined && isSuperAdmin) updates.publisherId = publisherId;

    db.update(users).set(updates).where(eq(users.id, id)).run();

    const updatedUser = db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      publisherId: users.publisherId,
      status: users.status,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, id)).get();

    return updatedUser;
  });

  // Delete user - super_admin only
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: requireSuperAdmin,
  }, async (request, reply) => {
    const { id } = request.params;
    const currentUser = request.user as TokenPayload;

    // Cannot delete yourself
    if (currentUser.userId === id) {
      return reply.code(400).send({ error: 'Cannot delete your own account' });
    }

    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    db.delete(users).where(eq(users.id, id)).run();

    return reply.code(204).send();
  });
}
