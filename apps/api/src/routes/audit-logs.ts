import { FastifyInstance } from 'fastify';
import { db, auditLogs, users } from '../db';
import { eq, desc, asc, and, gte, lte, or, like } from 'drizzle-orm';
import { requireAdmin, TokenPayload } from '../middleware/auth';
import { safeJsonParse, safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';
import { PAGINATION } from '../constants/pagination';

interface ListAuditLogsQuery {
  page?: string;
  limit?: string;
  action?: string;
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
}

export default async function auditLogsRoutes(fastify: FastifyInstance) {
  // List audit logs - admin only
  fastify.get<{ Querystring: ListAuditLogsQuery }>('/', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { page = '1', limit = String(PAGINATION.AUDIT_LOGS_PAGE_SIZE), action, entityType, userId, startDate, endDate, sortOrder = 'desc' } = request.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(PAGINATION.MAX_PAGE_SIZE, Math.max(1, parseInt(limit, 10) || PAGINATION.AUDIT_LOGS_PAGE_SIZE));
    const offset = (pageNum - 1) * limitNum;

    // Get all logs and filter in memory (simpler for SQLite)
    const orderFn = sortOrder === 'asc' ? asc : desc;
    let allLogs = db.select().from(auditLogs).orderBy(orderFn(auditLogs.createdAt)).all();

    // Apply filters
    if (action) {
      allLogs = allLogs.filter(log => log.action.toLowerCase() === action.toLowerCase());
    }
    if (entityType) {
      allLogs = allLogs.filter(log => log.entityType.toLowerCase() === entityType.toLowerCase());
    }
    if (userId) {
      allLogs = allLogs.filter(log => log.userId === userId);
    }
    if (startDate) {
      allLogs = allLogs.filter(log => log.createdAt >= startDate);
    }
    if (endDate) {
      allLogs = allLogs.filter(log => log.createdAt <= endDate);
    }

    const total = allLogs.length;
    const totalPages = Math.ceil(total / limitNum);

    // Apply pagination
    const paginatedLogs = allLogs.slice(offset, offset + limitNum);

    // Get user information for the logs
    const userIds = [...new Set(paginatedLogs.map(log => log.userId).filter(Boolean))];
    const userMap = new Map<string, { name: string; email: string }>();

    if (userIds.length > 0) {
      const userRecords = db.select().from(users).all();
      userRecords.forEach(u => {
        userMap.set(u.id, { name: u.name, email: u.email });
      });
    }

    return {
      logs: paginatedLogs.map(log => ({
        id: log.id,
        timestamp: log.createdAt,
        action: log.action.toLowerCase(),
        resource: log.entityType,
        resourceId: log.entityId,
        userId: log.userId,
        userName: log.userId ? userMap.get(log.userId)?.name || 'Unknown' : 'System',
        userEmail: log.userId ? userMap.get(log.userId)?.email || 'unknown@example.com' : 'system@example.com',
        ipAddress: log.ipAddress || 'Unknown',
        userAgent: log.userAgent || 'Unknown',
        details: {
          oldValues: safeJsonParseObject(log.oldValues, null),
          newValues: safeJsonParseObject(log.newValues, null),
        },
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    };
  });

  // Get single audit log detail
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    const log = db.select().from(auditLogs).where(eq(auditLogs.id, id)).get();

    if (!log) {
      return reply.code(404).send({ error: 'Audit log not found' });
    }

    // Get user info
    let userName = 'System';
    let userEmail = 'system@example.com';
    if (log.userId) {
      const user = db.select().from(users).where(eq(users.id, log.userId)).get();
      if (user) {
        userName = user.name;
        userEmail = user.email;
      }
    }

    return {
      id: log.id,
      timestamp: log.createdAt,
      action: log.action.toLowerCase(),
      resource: log.entityType,
      resourceId: log.entityId,
      userId: log.userId,
      userName,
      userEmail,
      ipAddress: log.ipAddress || 'Unknown',
      userAgent: log.userAgent || 'Unknown',
      details: {
        oldValues: safeJsonParseObject(log.oldValues, null),
        newValues: safeJsonParseObject(log.newValues, null),
      },
    };
  });
}
