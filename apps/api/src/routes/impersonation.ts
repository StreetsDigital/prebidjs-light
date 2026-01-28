import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, users, impersonationSessions, auditLogs, publisherAdmins } from '../db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { requireSuperAdmin } from '../middleware/auth';
import { TokenPayload } from '../middleware/auth';

interface ImpersonateBody {
  userId: string;
}

export default async function impersonationRoutes(fastify: FastifyInstance) {
  // Start impersonation - super admin only
  fastify.post<{ Body: ImpersonateBody }>(
    '/impersonate',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const superAdmin = request.user as TokenPayload;
      const { userId } = request.body;

      if (!userId) {
        return reply.code(400).send({ error: 'userId is required' });
      }

      // Prevent impersonating yourself
      if (userId === superAdmin.userId) {
        return reply.code(400).send({ error: 'Cannot impersonate yourself' });
      }

      // Get the user to impersonate
      const targetUser = db.select().from(users).where(eq(users.id, userId)).get();

      if (!targetUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Check if user is active
      if (targetUser.status !== 'active') {
        return reply.code(400).send({ error: 'Cannot impersonate disabled user' });
      }

      // Security: Cannot impersonate another super_admin
      if (targetUser.role === 'super_admin') {
        return reply.code(403).send({ error: 'Cannot impersonate another super admin' });
      }

      // Create impersonation session
      const sessionId = uuidv4();
      db.insert(impersonationSessions).values({
        id: sessionId,
        superAdminId: superAdmin.userId,
        impersonatedUserId: userId,
        startedAt: new Date().toISOString(),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
      });

      // Log audit event
      db.insert(auditLogs).values({
        id: uuidv4(),
        userId: superAdmin.userId,
        action: 'impersonation_started',
        entityType: 'user',
        entityId: userId,
        newValues: JSON.stringify({
          impersonatedUserId: userId,
          impersonatedUserEmail: targetUser.email,
          impersonatedUserRole: targetUser.role,
          sessionId,
        }),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
        createdAt: new Date().toISOString(),
      });

      // For admin users, fetch all accessible publishers from publisherAdmins table
      let publisherIds: string[] | undefined;
      if (targetUser.role === 'admin') {
        const adminPublishers = db
          .select()
          .from(publisherAdmins)
          .where(eq(publisherAdmins.userId, targetUser.id))
          .all();
        publisherIds = adminPublishers.map(pa => pa.publisherId);
      }

      // Generate new JWT with impersonation metadata
      const impersonationToken: TokenPayload = {
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        publisherId: targetUser.publisherId ?? undefined,
        publisherIds: publisherIds,
        // Impersonation metadata
        impersonatedBy: superAdmin.userId,
        originalUserId: superAdmin.userId,
        impersonationSessionId: sessionId,
      };

      // Token expires in 1 hour for impersonation
      const token = fastify.jwt.sign(impersonationToken, { expiresIn: '1h' });

      return {
        token,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.role,
          publisherId: targetUser.publisherId,
        },
        impersonation: {
          sessionId,
          impersonatedBy: superAdmin.userId,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        },
      };
    }
  );

  // Stop impersonation - requires active impersonation session
  fastify.post('/stop-impersonation', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const currentUser = request.user as TokenPayload;

    // Check if currently impersonating
    if (!currentUser.impersonationSessionId || !currentUser.originalUserId) {
      return reply.code(400).send({ error: 'Not currently impersonating' });
    }

    // Mark impersonation session as ended
    db.update(impersonationSessions)
      .set({ endedAt: new Date().toISOString() })
      .where(eq(impersonationSessions.id, currentUser.impersonationSessionId))
      .run();

    // Log audit event
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: currentUser.originalUserId,
      action: 'impersonation_ended',
      entityType: 'user',
      entityId: currentUser.userId,
      oldValues: JSON.stringify({
        impersonatedUserId: currentUser.userId,
        sessionId: currentUser.impersonationSessionId,
      }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
      createdAt: new Date().toISOString(),
    });

    // Get the original super admin user
    const originalUser = db.select().from(users).where(eq(users.id, currentUser.originalUserId)).get();

    if (!originalUser) {
      return reply.code(404).send({ error: 'Original user not found' });
    }

    // For admin users, fetch all accessible publishers from publisherAdmins table
    let publisherIds: string[] | undefined;
    if (originalUser.role === 'admin') {
      const adminPublishers = db
        .select()
        .from(publisherAdmins)
        .where(eq(publisherAdmins.userId, originalUser.id))
        .all();
      publisherIds = adminPublishers.map(pa => pa.publisherId);
    }

    // Generate new token as the original super admin
    const originalToken: TokenPayload = {
      userId: originalUser.id,
      email: originalUser.email,
      role: originalUser.role,
      publisherId: originalUser.publisherId ?? undefined,
      publisherIds: publisherIds,
    };

    const token = fastify.jwt.sign(originalToken, { expiresIn: '24h' });

    return {
      token,
      user: {
        id: originalUser.id,
        email: originalUser.email,
        name: originalUser.name,
        role: originalUser.role,
        publisherId: originalUser.publisherId,
      },
    };
  });
}
