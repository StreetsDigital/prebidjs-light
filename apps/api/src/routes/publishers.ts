import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, publishers, publisherConfig, adUnits, publisherBidders, configVersions, auditLogs, publisherAdmins, users } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireAdmin, requireRole, TokenPayload } from '../middleware/auth';

interface CreatePublisherBody {
  name: string;
  slug: string;
  domains?: string[];
  notes?: string;
}

interface UpdatePublisherBody {
  name?: string;
  slug?: string;
  domains?: string[];
  status?: 'active' | 'paused' | 'disabled';
  notes?: string;
}

interface ListPublishersQuery {
  page?: string;
  limit?: string;
  status?: 'active' | 'paused' | 'disabled' | 'deleted';
  search?: string;
  sortBy?: 'name' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: string; // 'true' to include deleted publishers
}

export default async function publisherRoutes(fastify: FastifyInstance) {
  // List all publishers - admin only
  fastify.get<{ Querystring: ListPublishersQuery }>('/', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest<{ Querystring: ListPublishersQuery }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const { page = '1', limit = '10', status, search, sortBy = 'name', sortOrder = 'asc', includeDeleted } = request.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Super admin sees all publishers
    // Regular admin sees only assigned publishers
    let allPublishers = db.select().from(publishers).all();

    // Filter for regular admin users - they only see assigned publishers
    if (user.role === 'admin') {
      const assignments = db.select().from(publisherAdmins)
        .where(eq(publisherAdmins.userId, user.userId))
        .all();
      const assignedPublisherIds = new Set(assignments.map(a => a.publisherId));
      allPublishers = allPublishers.filter(p => assignedPublisherIds.has(p.id));
    }

    // Filter by deleted status
    if (status === 'deleted') {
      // Show only deleted publishers
      allPublishers = allPublishers.filter(p => (p as any).deletedAt != null);
    } else {
      // By default, exclude deleted publishers unless explicitly requested
      if (includeDeleted !== 'true') {
        allPublishers = allPublishers.filter(p => (p as any).deletedAt == null);
      }
      // Apply status filter
      if (status) {
        allPublishers = allPublishers.filter(p => p.status === status);
      }
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      allPublishers = allPublishers.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.slug.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    allPublishers.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortBy === 'createdAt') {
        comparison = a.createdAt.localeCompare(b.createdAt);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = allPublishers.length;
    const totalPages = Math.ceil(total / limitNum);

    // Apply pagination
    const paginatedPublishers = allPublishers.slice(offset, offset + limitNum);

    return {
      publishers: paginatedPublishers.map(p => ({
        ...p,
        domains: p.domains ? JSON.parse(p.domains) : [],
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore: pageNum < totalPages,
      },
      total,
    };
  });

  // Get single publisher - admin or the publisher's own user
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();

    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization: admin/super_admin can see all, publisher can only see their own
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden', message: 'You can only access your own publisher data' });
    }

    return {
      ...publisher,
      domains: publisher.domains ? JSON.parse(publisher.domains) : [],
    };
  });

  // Create publisher - admin only
  fastify.post<{ Body: CreatePublisherBody }>('/', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { name, slug, domains, notes } = request.body;
    const user = request.user as TokenPayload;

    if (!name || !slug) {
      return reply.code(400).send({ error: 'Name and slug are required' });
    }

    // Check for duplicate slug
    const existing = db.select().from(publishers).where(eq(publishers.slug, slug)).get();
    if (existing) {
      return reply.code(409).send({ error: 'Publisher with this slug already exists' });
    }

    const now = new Date().toISOString();
    const id = uuidv4();
    const apiKey = `pb_${uuidv4().replace(/-/g, '')}`;

    db.insert(publishers).values({
      id,
      name,
      slug,
      apiKey,
      domains: domains ? JSON.stringify(domains) : null,
      status: 'active',
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
      createdBy: user.userId,
    });

    // Create default config for the publisher
    db.insert(publisherConfig).values({
      id: uuidv4(),
      publisherId: id,
      bidderTimeout: 1500,
      priceGranularity: 'medium',
      enableSendAllBids: true,
      bidderSequence: 'random',
      debugMode: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Log audit entry
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'CREATE',
      entityType: 'publisher',
      entityId: id,
      oldValues: null,
      newValues: JSON.stringify({ name, slug, domains: domains || [], status: 'active', notes: notes || null }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    });

    const newPublisher = db.select().from(publishers).where(eq(publishers.id, id)).get();

    return reply.code(201).send({
      ...newPublisher,
      domains: domains || [],
    });
  });

  // Update publisher - admin only
  fastify.put<{ Params: { id: string }; Body: UpdatePublisherBody }>('/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;
    const { name, slug, domains, status, notes } = request.body;
    const user = request.user as TokenPayload;

    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Store old values for audit log
    const oldValues = {
      name: publisher.name,
      slug: publisher.slug,
      domains: publisher.domains ? JSON.parse(publisher.domains) : [],
      status: publisher.status,
      notes: publisher.notes,
    };

    // If slug is being changed, check for duplicates
    if (slug && slug !== publisher.slug) {
      const existing = db.select().from(publishers).where(eq(publishers.slug, slug)).get();
      if (existing) {
        return reply.code(409).send({ error: 'Publisher with this slug already exists' });
      }
    }

    const now = new Date().toISOString();

    db.update(publishers)
      .set({
        ...(name && { name }),
        ...(slug && { slug }),
        ...(domains !== undefined && { domains: JSON.stringify(domains) }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        updatedAt: now,
      })
      .where(eq(publishers.id, id))
      ;

    const updated = db.select().from(publishers).where(eq(publishers.id, id)).get();

    // Log audit entry
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'publisher',
      entityId: id,
      oldValues: JSON.stringify(oldValues),
      newValues: JSON.stringify({
        name: updated?.name,
        slug: updated?.slug,
        domains: updated?.domains ? JSON.parse(updated.domains) : [],
        status: updated?.status,
        notes: updated?.notes,
      }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    });

    return {
      ...updated,
      domains: updated?.domains ? JSON.parse(updated.domains) : [],
    };
  });

  // Soft delete publisher - admin only
  fastify.delete<{ Params: { id: string }; Querystring: { hard?: string } }>('/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;
    const { hard } = request.query;
    const user = request.user as TokenPayload;

    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const now = new Date().toISOString();

    // Log audit entry before deleting
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: hard === 'true' ? 'HARD_DELETE' : 'SOFT_DELETE',
      entityType: 'publisher',
      entityId: id,
      oldValues: JSON.stringify({
        name: publisher.name,
        slug: publisher.slug,
        domains: publisher.domains ? JSON.parse(publisher.domains) : [],
        status: publisher.status,
        notes: publisher.notes,
      }),
      newValues: null,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    });

    if (hard === 'true') {
      // Hard delete - permanently remove publisher and related data
      db.delete(publisherConfig).where(eq(publisherConfig.publisherId, id));
      db.delete(adUnits).where(eq((adUnits as any).publisherId, id));
      db.delete(publisherBidders).where(eq(publisherBidders.publisherId, id));
      db.delete(publisherAdmins).where(eq(publisherAdmins.publisherId, id));
      db.delete(publishers).where(eq(publishers.id, id));
    } else {
      // Soft delete - mark as deleted but preserve data
      db.update(publishers)
        .set({ deletedAt: now, updatedAt: now } as any)
        .where(eq(publishers.id, id))
        ;
    }

    return reply.code(204).send();
  });

  // Restore soft-deleted publisher - admin only
  fastify.post<{ Params: { id: string } }>('/:id/restore', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    if (!(publisher as any).deletedAt) {
      return reply.code(400).send({ error: 'Publisher is not deleted' });
    }

    const now = new Date().toISOString();

    // Log audit entry for restore
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'RESTORE',
      entityType: 'publisher',
      entityId: id,
      oldValues: JSON.stringify({ deletedAt: (publisher as any).deletedAt }),
      newValues: JSON.stringify({ deletedAt: null }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    });

    // Restore the publisher
    db.update(publishers)
      .set({ deletedAt: null, updatedAt: now } as any)
      .where(eq(publishers.id, id))
      ;

    const restored = db.select().from(publishers).where(eq(publishers.id, id)).get();
    return {
      ...restored,
      domains: restored?.domains ? JSON.parse(restored.domains) : [],
    };
  });

  // Regenerate API key - admin only
  fastify.post<{ Params: { id: string } }>('/:id/regenerate-key', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const newApiKey = `pb_${uuidv4().replace(/-/g, '')}`;
    const now = new Date().toISOString();

    db.update(publishers)
      .set({ apiKey: newApiKey, updatedAt: now })
      .where(eq(publishers.id, id))
      ;

    return { apiKey: newApiKey };
  });

  // Get embed code for publisher
  fastify.get<{ Params: { id: string } }>('/:id/embed-code', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3001';

    const embedCode = `<!-- pbjs_engine Prebid Wrapper -->
<script src="${baseUrl}/pb.js?id=${publisher.apiKey}" async></script>`;

    return {
      embedCode,
      apiKey: publisher.apiKey,
    };
  });

  // ==================== ASSIGNED ADMINS ROUTES ====================

  // Get assigned admins for a publisher
  fastify.get<{ Params: { id: string } }>('/:id/admins', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Get all admin assignments for this publisher
    const assignments = db.select().from(publisherAdmins)
      .where(eq(publisherAdmins.publisherId, id))
      .all();

    // Get user details for each assignment
    const assignedAdmins = assignments.map(assignment => {
      const user = db.select().from(users).where(eq(users.id, assignment.userId)).get();
      return {
        userId: assignment.userId,
        name: user?.name || 'Unknown',
        email: user?.email || 'Unknown',
        role: user?.role || 'unknown',
        assignedAt: assignment.createdAt,
      };
    }).filter(admin => admin.role === 'admin');

    return { admins: assignedAdmins };
  });

  // Get available admins (not yet assigned to this publisher)
  fastify.get<{ Params: { id: string } }>('/:id/available-admins', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Get all admin users
    const allAdmins = db.select().from(users)
      .where(eq(users.role, 'admin'))
      .all();

    // Get already assigned admin IDs
    const assignments = db.select().from(publisherAdmins)
      .where(eq(publisherAdmins.publisherId, id))
      .all();
    const assignedIds = new Set(assignments.map(a => a.userId));

    // Filter out already assigned admins
    const availableAdmins = allAdmins.filter(admin => !assignedIds.has(admin.id));

    return {
      admins: availableAdmins.map(admin => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
      })),
    };
  });

  // Assign an admin to a publisher
  fastify.post<{ Params: { id: string }; Body: { userId: string } }>('/:id/admins', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;
    const { userId } = request.body;
    const currentUser = request.user as TokenPayload;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check if user exists and is an admin
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    if (user.role !== 'admin') {
      return reply.code(400).send({ error: 'User is not an admin' });
    }

    // Check if already assigned
    const existing = db.select().from(publisherAdmins)
      .where(and(eq(publisherAdmins.publisherId, id), eq(publisherAdmins.userId, userId)))
      .get();
    if (existing) {
      return reply.code(409).send({ error: 'Admin is already assigned to this publisher' });
    }

    const now = new Date().toISOString();

    // Create assignment
    db.insert(publisherAdmins).values({
      publisherId: id,
      userId,
      createdAt: now,
    });

    // Log audit entry
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: currentUser.userId,
      action: 'ASSIGN_ADMIN',
      entityType: 'publisher_admin',
      entityId: id,
      oldValues: null,
      newValues: JSON.stringify({ publisherId: id, userId, userName: user.name }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    });

    return {
      success: true,
      admin: {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedAt: now,
      },
    };
  });

  // Remove an admin from a publisher
  fastify.delete<{ Params: { id: string; userId: string } }>('/:id/admins/:userId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id, userId } = request.params;
    const currentUser = request.user as TokenPayload;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check if assignment exists
    const assignment = db.select().from(publisherAdmins)
      .where(and(eq(publisherAdmins.publisherId, id), eq(publisherAdmins.userId, userId)))
      .get();
    if (!assignment) {
      return reply.code(404).send({ error: 'Admin assignment not found' });
    }

    // Get user info for audit log
    const user = db.select().from(users).where(eq(users.id, userId)).get();

    const now = new Date().toISOString();

    // Delete assignment
    db.delete(publisherAdmins)
      .where(and(eq(publisherAdmins.publisherId, id), eq(publisherAdmins.userId, userId)))
      ;

    // Log audit entry
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: currentUser.userId,
      action: 'UNASSIGN_ADMIN',
      entityType: 'publisher_admin',
      entityId: id,
      oldValues: JSON.stringify({ publisherId: id, userId, userName: user?.name }),
      newValues: null,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    });

    return reply.code(204).send();
  });

  // ==================== AD UNITS ROUTES ====================

  interface SizeMappingRule {
    minViewport: [number, number];
    sizes: number[][];
  }

  interface CreateAdUnitBody {
    code: string;
    name: string;
    mediaTypes?: {
      banner?: { sizes: number[][] };
      video?: { playerSize?: number[] };
      native?: object;
    };
    floorPrice?: string;
    sizeMapping?: SizeMappingRule[];
  }

  interface UpdateAdUnitBody {
    code?: string;
    name?: string;
    mediaTypes?: {
      banner?: { sizes: number[][] };
      video?: { playerSize?: number[] };
      native?: object;
    };
    floorPrice?: string;
    status?: 'active' | 'paused';
    sizeMapping?: SizeMappingRule[];
  }

  // List ad units for a publisher
  fastify.get<{ Params: { id: string } }>('/:id/ad-units', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const units = db.select().from(adUnits).where(eq((adUnits as any).publisherId, id)).all();

    return {
      adUnits: units.map(u => ({
        ...u,
        mediaTypes: u.mediaTypes ? JSON.parse(u.mediaTypes) : null,
        sizeMapping: u.sizeMapping ? JSON.parse(u.sizeMapping) : null,
      })),
    };
  });

  // Get single ad unit
  fastify.get<{ Params: { id: string; unitId: string } }>('/:id/ad-units/:unitId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, unitId } = request.params;
    const user = request.user as TokenPayload;

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const unit = db.select().from(adUnits)
      .where(and(eq(adUnits.id, unitId), eq((adUnits as any).publisherId, id)))
      .get();

    if (!unit) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    return {
      ...unit,
      mediaTypes: unit.mediaTypes ? JSON.parse(unit.mediaTypes) : null,
      sizeMapping: unit.sizeMapping ? JSON.parse(unit.sizeMapping) : null,
    };
  });

  // Create ad unit
  fastify.post<{ Params: { id: string }; Body: CreateAdUnitBody }>('/:id/ad-units', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const { code, name, mediaTypes, floorPrice, sizeMapping } = request.body;
    const user = request.user as TokenPayload;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    if (!code || !name) {
      return reply.code(400).send({ error: 'Code and name are required' });
    }

    // Check for duplicate code within publisher
    const existing = db.select().from(adUnits)
      .where(and(eq((adUnits as any).publisherId, id), eq(adUnits.code, code)))
      .get();
    if (existing) {
      return reply.code(409).send({ error: 'Ad unit with this code already exists for this publisher' });
    }

    const now = new Date().toISOString();
    const unitId = uuidv4();

    db.insert(adUnits).values({
      id: unitId,
      websiteId: id, // TODO: Should be actual websiteId
      code,
      name,
      mediaTypes: mediaTypes ? JSON.stringify(mediaTypes) : null,
      floorPrice: floorPrice || null,
      sizeMapping: sizeMapping ? JSON.stringify(sizeMapping) : null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    } as any);

    const newUnit = db.select().from(adUnits).where(eq(adUnits.id, unitId)).get();

    return reply.code(201).send({
      ...newUnit,
      mediaTypes: newUnit?.mediaTypes ? JSON.parse(newUnit.mediaTypes) : null,
      sizeMapping: newUnit?.sizeMapping ? JSON.parse(newUnit.sizeMapping) : null,
    });
  });

  // Update ad unit
  fastify.put<{ Params: { id: string; unitId: string }; Body: UpdateAdUnitBody }>('/:id/ad-units/:unitId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, unitId } = request.params;
    const { code, name, mediaTypes, floorPrice, status, sizeMapping } = request.body;
    const user = request.user as TokenPayload;

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const unit = db.select().from(adUnits)
      .where(and(eq(adUnits.id, unitId), eq((adUnits as any).publisherId, id)))
      .get();

    if (!unit) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    // If code is changing, check for duplicates
    if (code && code !== unit.code) {
      const existing = db.select().from(adUnits)
        .where(and(eq((adUnits as any).publisherId, id), eq(adUnits.code, code)))
        .get();
      if (existing) {
        return reply.code(409).send({ error: 'Ad unit with this code already exists for this publisher' });
      }
    }

    const now = new Date().toISOString();

    db.update(adUnits)
      .set({
        ...(code && { code }),
        ...(name && { name }),
        ...(mediaTypes !== undefined && { mediaTypes: JSON.stringify(mediaTypes) }),
        ...(floorPrice !== undefined && { floorPrice }),
        ...(status && { status }),
        ...(sizeMapping !== undefined && { sizeMapping: JSON.stringify(sizeMapping) }),
        updatedAt: now,
      })
      .where(eq(adUnits.id, unitId))
      ;

    const updated = db.select().from(adUnits).where(eq(adUnits.id, unitId)).get();

    return {
      ...updated,
      mediaTypes: updated?.mediaTypes ? JSON.parse(updated.mediaTypes) : null,
      sizeMapping: updated?.sizeMapping ? JSON.parse(updated.sizeMapping) : null,
    };
  });

  // Delete ad unit
  fastify.delete<{ Params: { id: string; unitId: string } }>('/:id/ad-units/:unitId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, unitId } = request.params;
    const user = request.user as TokenPayload;

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const unit = db.select().from(adUnits)
      .where(and(eq(adUnits.id, unitId), eq((adUnits as any).publisherId, id)))
      .get();

    if (!unit) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    db.delete(adUnits).where(eq(adUnits.id, unitId));

    return reply.code(204).send();
  });

  // ==================== BIDDER ROUTES ====================

  interface CreateBidderBody {
    bidderCode: string;
    enabled?: boolean;
    params?: Record<string, unknown>;
    timeoutOverride?: number;
    priority?: number;
  }

  interface UpdateBidderBody {
    enabled?: boolean;
    params?: Record<string, unknown>;
    timeoutOverride?: number;
    priority?: number;
  }

  // List bidders for a publisher
  fastify.get<{ Params: { id: string } }>('/:id/bidders', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const bidders = db.select().from(publisherBidders).where(eq(publisherBidders.publisherId, id)).all();

    return {
      bidders: bidders.map(b => ({
        ...b,
        params: b.params ? JSON.parse(b.params) : null,
      })),
    };
  });

  // Get single bidder
  fastify.get<{ Params: { id: string; bidderId: string } }>('/:id/bidders/:bidderId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, bidderId } = request.params;
    const user = request.user as TokenPayload;

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const bidder = db.select().from(publisherBidders)
      .where(and(eq(publisherBidders.id, bidderId), eq(publisherBidders.publisherId, id)))
      .get();

    if (!bidder) {
      return reply.code(404).send({ error: 'Bidder not found' });
    }

    return {
      ...bidder,
      params: bidder.params ? JSON.parse(bidder.params) : null,
    };
  });

  // Create/Add bidder
  fastify.post<{ Params: { id: string }; Body: CreateBidderBody }>('/:id/bidders', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const { bidderCode, enabled = true, params, timeoutOverride, priority = 0 } = request.body;
    const user = request.user as TokenPayload;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    if (!bidderCode) {
      return reply.code(400).send({ error: 'Bidder code is required' });
    }

    // Check for duplicate bidder code within publisher
    const existing = db.select().from(publisherBidders)
      .where(and(eq(publisherBidders.publisherId, id), eq(publisherBidders.bidderCode, bidderCode)))
      .get();
    if (existing) {
      return reply.code(409).send({ error: 'Bidder already configured for this publisher' });
    }

    const now = new Date().toISOString();
    const bidderId = uuidv4();

    db.insert(publisherBidders).values({
      id: bidderId,
      publisherId: id,
      bidderCode,
      enabled,
      params: params ? JSON.stringify(params) : null,
      timeoutOverride: timeoutOverride || null,
      priority,
      createdAt: now,
      updatedAt: now,
    });

    const newBidder = db.select().from(publisherBidders).where(eq(publisherBidders.id, bidderId)).get();

    return reply.code(201).send({
      ...newBidder,
      params: newBidder?.params ? JSON.parse(newBidder.params) : null,
    });
  });

  // Update bidder
  fastify.put<{ Params: { id: string; bidderId: string }; Body: UpdateBidderBody }>('/:id/bidders/:bidderId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, bidderId } = request.params;
    const { enabled, params, timeoutOverride, priority } = request.body;
    const user = request.user as TokenPayload;

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const bidder = db.select().from(publisherBidders)
      .where(and(eq(publisherBidders.id, bidderId), eq(publisherBidders.publisherId, id)))
      .get();

    if (!bidder) {
      return reply.code(404).send({ error: 'Bidder not found' });
    }

    const now = new Date().toISOString();

    db.update(publisherBidders)
      .set({
        ...(enabled !== undefined && { enabled }),
        ...(params !== undefined && { params: JSON.stringify(params) }),
        ...(timeoutOverride !== undefined && { timeoutOverride }),
        ...(priority !== undefined && { priority }),
        updatedAt: now,
      })
      .where(eq(publisherBidders.id, bidderId))
      ;

    const updated = db.select().from(publisherBidders).where(eq(publisherBidders.id, bidderId)).get();

    return {
      ...updated,
      params: updated?.params ? JSON.parse(updated.params) : null,
    };
  });

  // Delete bidder
  fastify.delete<{ Params: { id: string; bidderId: string } }>('/:id/bidders/:bidderId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, bidderId } = request.params;
    const user = request.user as TokenPayload;

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const bidder = db.select().from(publisherBidders)
      .where(and(eq(publisherBidders.id, bidderId), eq(publisherBidders.publisherId, id)))
      .get();

    if (!bidder) {
      return reply.code(404).send({ error: 'Bidder not found' });
    }

    db.delete(publisherBidders).where(eq(publisherBidders.id, bidderId));

    return reply.code(204).send();
  });

  // ==================== CONFIG ROUTES ====================

  interface UserIdModuleConfig {
    code: string;
    enabled: boolean;
    config: Record<string, string>;
  }

  interface ConsentManagementConfig {
    gdpr?: {
      enabled: boolean;
      cmpApi?: string;
      timeout?: number;
      defaultGdprScope?: boolean;
    };
    usp?: {
      enabled: boolean;
      cmpApi?: string;
      timeout?: number;
    };
  }

  interface FloorRule {
    id: string;
    type: 'mediaType' | 'bidder' | 'adUnit';
    value: string;
    floor: number;
  }

  interface PriceFloorsConfig {
    enabled: boolean;
    defaultFloor: number;
    currency: string;
    enforcement: {
      floorDeals: boolean;
      bidAdjustment: boolean;
    };
    rules: FloorRule[];
  }

  interface UpdateConfigBody {
    bidderTimeout?: number;
    priceGranularity?: string;
    enableSendAllBids?: boolean;
    bidderSequence?: string;
    debugMode?: boolean;
    userIdModules?: UserIdModuleConfig[];
    consentManagement?: ConsentManagementConfig;
    floorsConfig?: PriceFloorsConfig;
  }

  // Get publisher config
  fastify.get<{ Params: { id: string } }>('/:id/config', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const config = db.select().from(publisherConfig).where(eq(publisherConfig.publisherId, id)).get();

    if (!config) {
      return reply.code(404).send({ error: 'Config not found' });
    }

    return {
      ...config,
      userIdModules: config.userIdModules ? JSON.parse(config.userIdModules) : [],
      consentManagement: config.consentManagement ? JSON.parse(config.consentManagement) : null,
      floorsConfig: config.floorsConfig ? JSON.parse(config.floorsConfig) : null,
    };
  });

  // Update publisher config
  fastify.put<{ Params: { id: string }; Body: UpdateConfigBody }>('/:id/config', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const { bidderTimeout, priceGranularity, enableSendAllBids, bidderSequence, debugMode, userIdModules, consentManagement, floorsConfig } = request.body;
    const user = request.user as TokenPayload;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const config = db.select().from(publisherConfig).where(eq(publisherConfig.publisherId, id)).get();
    if (!config) {
      return reply.code(404).send({ error: 'Config not found' });
    }

    const now = new Date().toISOString();
    const newVersion = (config.version || 1) + 1;

    // Build change summary
    const changes: string[] = [];
    if (bidderTimeout !== undefined && bidderTimeout !== config.bidderTimeout) {
      changes.push(`bidderTimeout: ${config.bidderTimeout}ms → ${bidderTimeout}ms`);
    }
    if (priceGranularity !== undefined && priceGranularity !== config.priceGranularity) {
      changes.push(`priceGranularity: ${config.priceGranularity} → ${priceGranularity}`);
    }
    if (enableSendAllBids !== undefined && enableSendAllBids !== config.enableSendAllBids) {
      changes.push(`sendAllBids: ${config.enableSendAllBids ? 'enabled' : 'disabled'} → ${enableSendAllBids ? 'enabled' : 'disabled'}`);
    }
    if (bidderSequence !== undefined && bidderSequence !== config.bidderSequence) {
      changes.push(`bidderSequence: ${config.bidderSequence} → ${bidderSequence}`);
    }
    if (debugMode !== undefined && debugMode !== config.debugMode) {
      changes.push(`debugMode: ${config.debugMode ? 'on' : 'off'} → ${debugMode ? 'on' : 'off'}`);
    }
    if (userIdModules !== undefined) {
      const currentModules = config.userIdModules ? JSON.parse(config.userIdModules) : [];
      const enabledModules = userIdModules.filter(m => m.enabled).map(m => m.code);
      const previousEnabled = currentModules.filter((m: UserIdModuleConfig) => m.enabled).map((m: UserIdModuleConfig) => m.code);
      if (JSON.stringify(enabledModules.sort()) !== JSON.stringify(previousEnabled.sort())) {
        changes.push(`userIdModules: ${previousEnabled.length > 0 ? previousEnabled.join(', ') : 'none'} → ${enabledModules.length > 0 ? enabledModules.join(', ') : 'none'}`);
      }
    }
    if (consentManagement !== undefined) {
      const currentConsent = config.consentManagement ? JSON.parse(config.consentManagement) : null;
      const gdprEnabled = consentManagement?.gdpr?.enabled || false;
      const previousGdprEnabled = currentConsent?.gdpr?.enabled || false;
      if (gdprEnabled !== previousGdprEnabled) {
        changes.push(`GDPR: ${previousGdprEnabled ? 'enabled' : 'disabled'} → ${gdprEnabled ? 'enabled' : 'disabled'}`);
      }
    }
    if (floorsConfig !== undefined) {
      const currentFloors = config.floorsConfig ? JSON.parse(config.floorsConfig) : null;
      const floorsEnabled = floorsConfig?.enabled || false;
      const previousFloorsEnabled = currentFloors?.enabled || false;
      if (floorsEnabled !== previousFloorsEnabled) {
        changes.push(`Price Floors: ${previousFloorsEnabled ? 'enabled' : 'disabled'} → ${floorsEnabled ? 'enabled' : 'disabled'}`);
      } else if (floorsEnabled && floorsConfig.defaultFloor !== currentFloors?.defaultFloor) {
        changes.push(`Default Floor: $${currentFloors?.defaultFloor || 0} → $${floorsConfig.defaultFloor}`);
      }
    }

    // Save current config as a version entry before updating
    db.insert(configVersions).values({
      id: uuidv4(),
      publisherId: id,
      version: config.version || 1,
      configSnapshot: JSON.stringify({
        bidderTimeout: config.bidderTimeout,
        priceGranularity: config.priceGranularity,
        enableSendAllBids: config.enableSendAllBids,
        bidderSequence: config.bidderSequence,
        debugMode: config.debugMode,
      }),
      changedBy: user.userId,
      changeSummary: changes.length > 0 ? changes.join(', ') : 'Configuration updated',
      createdAt: now,
    });

    // Update the config
    db.update(publisherConfig)
      .set({
        ...(bidderTimeout !== undefined && { bidderTimeout }),
        ...(priceGranularity !== undefined && { priceGranularity }),
        ...(enableSendAllBids !== undefined && { enableSendAllBids }),
        ...(bidderSequence !== undefined && { bidderSequence }),
        ...(debugMode !== undefined && { debugMode }),
        ...(userIdModules !== undefined && { userIdModules: JSON.stringify(userIdModules) }),
        ...(consentManagement !== undefined && { consentManagement: JSON.stringify(consentManagement) }),
        ...(floorsConfig !== undefined && { floorsConfig: JSON.stringify(floorsConfig) }),
        updatedAt: now,
        version: newVersion,
      })
      .where(eq(publisherConfig.publisherId, id))
      ;

    const updated = db.select().from(publisherConfig).where(eq(publisherConfig.publisherId, id)).get();

    return {
      ...updated,
      userIdModules: updated?.userIdModules ? JSON.parse(updated.userIdModules) : [],
      consentManagement: updated?.consentManagement ? JSON.parse(updated.consentManagement) : null,
      floorsConfig: updated?.floorsConfig ? JSON.parse(updated.floorsConfig) : null,
    };
  });

  // Get config version history
  fastify.get<{ Params: { id: string } }>('/:id/config/versions', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Get config versions ordered by version descending
    const versions = db.select().from(configVersions)
      .where(eq(configVersions.publisherId, id))
      .orderBy(desc(configVersions.version))
      .all();

    // Get current config for display
    const currentConfig = db.select().from(publisherConfig).where(eq(publisherConfig.publisherId, id)).get();

    // Get user names for display
    const { users } = await import('../db');
    const userMap = new Map<string, string>();
    const userIds = [...new Set(versions.map(v => v.changedBy).filter(Boolean))];
    if (userIds.length > 0) {
      const userRecords = db.select().from(users).all();
      userRecords.forEach(u => userMap.set(u.id, u.name));
    }

    return {
      currentVersion: currentConfig?.version || 1,
      currentConfig: currentConfig ? {
        bidderTimeout: currentConfig.bidderTimeout,
        priceGranularity: currentConfig.priceGranularity,
        enableSendAllBids: currentConfig.enableSendAllBids,
        bidderSequence: currentConfig.bidderSequence,
        debugMode: currentConfig.debugMode,
      } : null,
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        config: JSON.parse(v.configSnapshot),
        changedBy: v.changedBy ? userMap.get(v.changedBy) || 'Unknown' : 'System',
        changeSummary: v.changeSummary,
        createdAt: v.createdAt,
      })),
    };
  });

  // Rollback to a specific config version
  fastify.post<{ Params: { id: string; versionId: string } }>('/:id/config/rollback/:versionId', {
    preHandler: requireAdmin,
    schema: {
      params: {
        type: 'object',
        required: ['id', 'versionId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          versionId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { id, versionId } = request.params;
    const user = request.user as TokenPayload;

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Get the version to rollback to
    const targetVersion = db.select().from(configVersions)
      .where(eq(configVersions.id, versionId))
      .get();

    if (!targetVersion) {
      return reply.code(404).send({ error: 'Config version not found' });
    }

    // Parse the stored config snapshot
    const targetConfig = JSON.parse(targetVersion.configSnapshot);

    // Get current config
    const currentConfig = db.select().from(publisherConfig).where(eq(publisherConfig.publisherId, id)).get();
    if (!currentConfig) {
      return reply.code(404).send({ error: 'Publisher config not found' });
    }

    const newVersion = (currentConfig.version || 1) + 1;

    // Save current config as a version entry before rollback
    db.insert(configVersions).values({
      id: crypto.randomUUID(),
      publisherId: id,
      version: currentConfig.version || 1,
      configSnapshot: JSON.stringify({
        bidderTimeout: currentConfig.bidderTimeout,
        priceGranularity: currentConfig.priceGranularity,
        enableSendAllBids: currentConfig.enableSendAllBids,
        bidderSequence: currentConfig.bidderSequence,
        debugMode: currentConfig.debugMode,
      }),
      changeSummary: `Rollback to version ${targetVersion.version}`,
      changedBy: user.userId,
      createdAt: new Date().toISOString(),
    });

    // Update the config with the target version's values
    db.update(publisherConfig)
      .set({
        bidderTimeout: targetConfig.bidderTimeout,
        priceGranularity: targetConfig.priceGranularity,
        enableSendAllBids: targetConfig.enableSendAllBids,
        bidderSequence: targetConfig.bidderSequence,
        debugMode: targetConfig.debugMode,
        version: newVersion,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(publisherConfig.publisherId, id))
      ;

    // Log the rollback action
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'config_change',
      entityType: 'publisher_config',
      entityId: id,
      oldValues: JSON.stringify({
        version: currentConfig.version,
        bidderTimeout: currentConfig.bidderTimeout,
        priceGranularity: currentConfig.priceGranularity,
      }),
      newValues: JSON.stringify({
        type: 'rollback',
        version: newVersion,
        fromVersion: currentConfig.version,
        toVersion: targetVersion.version,
        bidderTimeout: targetConfig.bidderTimeout,
        priceGranularity: targetConfig.priceGranularity,
      }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Rolled back to version ${targetVersion.version}`,
      newVersion,
    };
  });

  // Copy bidders from one publisher to another
  fastify.post<{ Params: { id: string }; Body: { fromPublisherId: string } }>('/:id/bidders/copy-from', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id: targetPublisherId } = request.params;
    const { fromPublisherId: sourcePublisherId } = request.body;
    const user = request.user as TokenPayload;

    if (!sourcePublisherId) {
      return reply.code(400).send({ error: 'Source publisher ID is required' });
    }

    if (sourcePublisherId === targetPublisherId) {
      return reply.code(400).send({ error: 'Cannot copy bidders to the same publisher' });
    }

    // Check if target publisher exists
    const targetPublisher = db.select().from(publishers).where(eq(publishers.id, targetPublisherId)).get();
    if (!targetPublisher) {
      return reply.code(404).send({ error: 'Target publisher not found' });
    }

    // Check if source publisher exists
    const sourcePublisher = db.select().from(publishers).where(eq(publishers.id, sourcePublisherId)).get();
    if (!sourcePublisher) {
      return reply.code(404).send({ error: 'Source publisher not found' });
    }

    // Get bidders from source publisher
    const sourceBidders = db.select().from(publisherBidders)
      .where(eq(publisherBidders.publisherId, sourcePublisherId))
      .all();

    if (sourceBidders.length === 0) {
      return reply.code(400).send({ error: 'Source publisher has no bidders configured' });
    }

    // Get existing bidders for target publisher to avoid duplicates
    const existingBidders = db.select().from(publisherBidders)
      .where(eq(publisherBidders.publisherId, targetPublisherId))
      .all();
    const existingBidderCodes = new Set(existingBidders.map(b => b.bidderCode));

    const now = new Date().toISOString();
    const copiedBidders: typeof sourceBidders = [];
    const skippedBidders: string[] = [];

    for (const bidder of sourceBidders) {
      if (existingBidderCodes.has(bidder.bidderCode)) {
        // Skip if bidder already exists in target publisher
        skippedBidders.push(bidder.bidderCode);
        continue;
      }

      const newBidderId = uuidv4();

      db.insert(publisherBidders).values({
        id: newBidderId,
        publisherId: targetPublisherId,
        bidderCode: bidder.bidderCode,
        enabled: bidder.enabled,
        params: bidder.params, // Copy the exact same params JSON
        timeoutOverride: bidder.timeoutOverride,
        priority: bidder.priority,
        createdAt: now,
        updatedAt: now,
      });

      copiedBidders.push({
        ...bidder,
        id: newBidderId,
        publisherId: targetPublisherId,
      });
    }

    // Log audit entry
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'COPY_BIDDERS',
      entityType: 'publisher_bidders',
      entityId: targetPublisherId,
      oldValues: null,
      newValues: JSON.stringify({
        fromPublisher: sourcePublisher.name,
        fromPublisherId: sourcePublisherId,
        toPublisher: targetPublisher.name,
        copiedCount: copiedBidders.length,
        skippedCount: skippedBidders.length,
        copiedBidders: copiedBidders.map(b => b.bidderCode),
        skippedBidders,
      }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    });

    return {
      success: true,
      message: `Copied ${copiedBidders.length} bidder(s) from ${sourcePublisher.name}${skippedBidders.length > 0 ? `. ${skippedBidders.length} bidder(s) skipped (already exist)` : ''}`,
      copied: copiedBidders.map(b => ({
        ...b,
        params: b.params ? JSON.parse(b.params) : null,
      })),
      skipped: skippedBidders,
    };
  });

  // Bulk update publisher status - admin only
  fastify.post<{ Body: { ids: string[]; status: 'active' | 'paused' | 'disabled' } }>('/bulk/status', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { ids, status } = request.body;
    const user = request.user as TokenPayload;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return reply.code(400).send({ error: 'No publisher IDs provided' });
    }

    if (!status || !['active', 'paused', 'disabled'].includes(status)) {
      return reply.code(400).send({ error: 'Invalid status. Must be active, paused, or disabled' });
    }

    const now = new Date().toISOString();
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const id of ids) {
      try {
        const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();

        if (!publisher) {
          results.push({ id, success: false, error: 'Publisher not found' });
          continue;
        }

        const oldStatus = publisher.status;

        // Update the publisher status
        db.update(publishers)
          .set({ status, updatedAt: now })
          .where(eq(publishers.id, id))
          ;

        // Log audit entry
        db.insert(auditLogs).values({
          id: uuidv4(),
          userId: user.userId,
          action: 'BULK_UPDATE_STATUS',
          entityType: 'publisher',
          entityId: id,
          oldValues: JSON.stringify({ status: oldStatus }),
          newValues: JSON.stringify({ status }),
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || null,
          createdAt: now,
        });

        results.push({ id, success: true });
      } catch (err) {
        results.push({ id, success: false, error: 'Failed to update' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      success: failureCount === 0,
      message: `Updated ${successCount} publisher(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results,
    };
  });
}
