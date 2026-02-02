import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, scheduledReports, auditLogs } from '../db';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireAdmin, TokenPayload } from '../middleware/auth';
import { safeJsonParse, safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

interface CreateScheduledReportBody {
  name: string;
  reportType: 'revenue' | 'latency' | 'fill_rate' | 'all';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  publisherId?: string;
  format: 'csv' | 'pdf' | 'excel';
}

interface UpdateScheduledReportBody {
  name?: string;
  reportType?: 'revenue' | 'latency' | 'fill_rate' | 'all';
  frequency?: 'daily' | 'weekly' | 'monthly';
  recipients?: string[];
  publisherId?: string;
  format?: 'csv' | 'pdf' | 'excel';
  isActive?: boolean;
}

// Helper to calculate next send time based on schedule
function calculateNextSendAt(schedule: string): string {
  const now = new Date();
  const next = new Date(now);

  switch (schedule) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      next.setHours(8, 0, 0, 0); // 8 AM next day
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 - next.getDay() + 1) % 7 + 1); // Next Monday
      next.setHours(8, 0, 0, 0);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      next.setDate(1); // First of next month
      next.setHours(8, 0, 0, 0);
      break;
  }

  return next.toISOString();
}

export default async function scheduledReportsRoutes(fastify: FastifyInstance) {
  // List all scheduled reports - admin only
  fastify.get('/', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const reports = db.select().from(scheduledReports).orderBy(desc(scheduledReports.createdAt)).all();

    return {
      scheduledReports: reports.map(r => ({
        ...r,
        recipients: safeJsonParseArray(r.recipients, []),
      })),
    };
  });

  // Get single scheduled report
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    const report = db.select().from(scheduledReports).where(eq(scheduledReports.id, id)).get();

    if (!report) {
      return reply.code(404).send({ error: 'Scheduled report not found' });
    }

    return {
      ...report,
      recipients: safeJsonParseArray(report.recipients, []),
    };
  });

  // Create scheduled report
  fastify.post<{ Body: CreateScheduledReportBody }>('/', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { name, reportType, frequency, recipients, publisherId, format } = request.body;
    const user = request.user as TokenPayload;

    if (!name || !recipients || recipients.length === 0) {
      return reply.code(400).send({ error: 'Name and at least one recipient are required' });
    }

    // Validate email format for recipients
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        return reply.code(400).send({ error: `Invalid email format: ${email}` });
      }
    }

    const now = new Date().toISOString();
    const id = uuidv4();
    const nextRunAt = new Date(Date.now() + 86400000).toISOString(); // Next day

    db.insert(scheduledReports).values({
      id,
      userId: user.userId,
      name,
      reportType: reportType || 'all',
      frequency: frequency || 'daily',
      recipients: JSON.stringify(recipients),
      publisherId: publisherId || null,
      format: format || 'pdf',
      isActive: true,
      lastRunAt: null,
      nextRunAt,
      createdAt: now,
      updatedAt: now,
    } as any).run();

    // Log audit entry
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'CREATE',
      entityType: 'scheduled_report',
      entityId: id,
      oldValues: null,
      newValues: JSON.stringify({ name, reportType, frequency, recipients, format }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    }).run();

    const newReport = db.select().from(scheduledReports).where(eq(scheduledReports.id, id)).get();

    return reply.code(201).send({
      ...newReport,
      recipients: safeJsonParseArray(newReport?.recipients, []),
    });
  });

  // Update scheduled report
  fastify.put<{ Params: { id: string }; Body: UpdateScheduledReportBody }>('/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;
    const { name, reportType, frequency, recipients, publisherId, format, isActive } = request.body;
    const user = request.user as TokenPayload;

    const report = db.select().from(scheduledReports).where(eq(scheduledReports.id, id)).get();
    if (!report) {
      return reply.code(404).send({ error: 'Scheduled report not found' });
    }

    // Validate email format for recipients if provided
    if (recipients) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of recipients) {
        if (!emailRegex.test(email)) {
          return reply.code(400).send({ error: `Invalid email format: ${email}` });
        }
      }
    }

    // Store old values for audit log
    const oldValues = {
      name: report.name,
      reportType: report.reportType,
      frequency: report.frequency,
      recipients: safeJsonParseArray(report.recipients, []),
      format: report.format,
      isActive: report.isActive,
    };

    const now = new Date().toISOString();

    // Recalculate next send time if frequency changed
    let nextRunAt = report.nextRunAt;
    if (frequency && frequency !== report.frequency) {
      nextRunAt = new Date(Date.now() + 86400000).toISOString(); // Simple: next day
    }

    db.update(scheduledReports)
      .set({
        ...(name !== undefined && { name }),
        ...(reportType !== undefined && { reportType }),
        ...(frequency !== undefined && { frequency }),
        ...(recipients !== undefined && { recipients: JSON.stringify(recipients) }),
        ...(publisherId !== undefined && { publisherId }),
        ...(format !== undefined && { format }),
        ...(isActive !== undefined && { isActive }),
        ...(frequency && { nextRunAt }),
        updatedAt: now,
      } as any)
      .where(eq(scheduledReports.id, id))
      .run();

    const updated = db.select().from(scheduledReports).where(eq(scheduledReports.id, id)).get();

    // Log audit entry
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'scheduled_report',
      entityId: id,
      oldValues: JSON.stringify(oldValues),
      newValues: JSON.stringify({
        name: updated?.name,
        reportType: updated?.reportType,
        frequency: updated?.frequency,
        recipients: safeJsonParseArray(updated?.recipients, []),
        format: updated?.format,
        isActive: updated?.isActive,
      }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    }).run();

    return {
      ...updated,
      recipients: safeJsonParseArray(updated?.recipients, []),
    };
  });

  // Delete scheduled report
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    const report = db.select().from(scheduledReports).where(eq(scheduledReports.id, id)).get();
    if (!report) {
      return reply.code(404).send({ error: 'Scheduled report not found' });
    }

    const now = new Date().toISOString();

    // Log audit entry before deleting
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'DELETE',
      entityType: 'scheduled_report',
      entityId: id,
      oldValues: JSON.stringify({
        name: report.name,
        reportType: report.reportType,
        frequency: report.frequency,
        recipients: safeJsonParseArray(report.recipients, []),
        isActive: report.isActive,
      }),
      newValues: null,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    }).run();

    db.delete(scheduledReports).where(eq(scheduledReports.id, id)).run();

    return reply.code(204).send();
  });
}
