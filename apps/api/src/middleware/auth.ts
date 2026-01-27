import { FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/jwt';

export interface TokenPayload {
  userId: string;
  id?: string; // Alias for userId (some routes use .id)
  email: string;
  role: 'super_admin' | 'admin' | 'publisher';
  publisherId?: string;
}

// Extend FastifyRequest to include user
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: TokenPayload;
  }
}

// Authentication middleware - requires valid JWT token
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    request.user = request.user as TokenPayload;
  } catch (err) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }
}

// Authorization middleware - requires specific roles
export function requireRole(...roles: Array<'super_admin' | 'admin' | 'publisher'>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // First verify authentication
    try {
      await request.jwtVerify();
      request.user = request.user as TokenPayload;
    } catch (err) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Then check role
    if (!request.user || !roles.includes(request.user.role)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }
  };
}

// Super admin only middleware
export const requireSuperAdmin = requireRole('super_admin');

// Admin or super_admin middleware
export const requireAdmin = requireRole('super_admin', 'admin');

// Publisher middleware (also allows admin/super_admin)
export const requirePublisherOrAdmin = requireRole('super_admin', 'admin', 'publisher');
