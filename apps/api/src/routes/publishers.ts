import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireAdmin, TokenPayload } from '../middleware/auth';
import { validateUUID } from '../utils/validation';
import { PublisherService } from '../services/publisher-service';
import { PublisherRelationshipService } from '../services/publisher-relationship-service';
import { PublisherStatsService } from '../services/publisher-stats-service';
import { db, publishers, auditLogs } from '../db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Type definitions
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
  includeDeleted?: string;
}

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

interface UpdateConfigBody {
  bidderTimeout?: number;
  priceGranularity?: string;
  enableSendAllBids?: boolean;
  bidderSequence?: string;
  debugMode?: boolean;
  userIdModules?: any[];
  consentManagement?: any;
  floorsConfig?: any;
}

export default async function publisherRoutes(fastify: FastifyInstance) {
  // ==================== PUBLISHER CRUD ====================

  /**
   * Get all publishers with pagination and filtering
   */
  fastify.get<{ Querystring: ListPublishersQuery }>('/', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest<{ Querystring: ListPublishersQuery }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const { page = '1', limit = '20', status, search, sortBy = 'name', sortOrder = 'asc', includeDeleted } = request.query;

    const result = PublisherService.listPublishers({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      status,
      search,
      sortBy,
      sortOrder,
      includeDeleted: includeDeleted === 'true',
      userId: user.userId,
      userRole: user.role,
    });

    return result;
  });

  /**
   * Get a single publisher by ID
   */
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      validateUUID(id, 'Publisher ID');
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }

    const user = request.user as TokenPayload;
    const publisher = PublisherService.getPublisher(id);

    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden', message: 'You can only access your own publisher data' });
    }

    return publisher;
  });

  /**
   * Create a new publisher
   */
  fastify.post<{ Body: CreatePublisherBody }>('/', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { name, slug, domains, notes } = request.body;
    const user = request.user as TokenPayload;

    if (!name || !slug) {
      return reply.code(400).send({ error: 'Name and slug are required' });
    }

    try {
      const newPublisher = PublisherService.createPublisher({ name, slug, domains, notes }, user.userId);

      // Log audit entry
      PublisherService.logAudit({
        userId: user.userId,
        action: 'CREATE',
        entityType: 'publisher',
        entityId: newPublisher.id,
        oldValues: null,
        newValues: { name, slug, domains: domains || [], status: 'active', notes: notes || null },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
      });

      return reply.code(201).send(newPublisher);
    } catch (err) {
      return reply.code(409).send({ error: err.message });
    }
  });

  /**
   * Update an existing publisher
   */
  fastify.put<{ Params: { id: string }; Body: UpdatePublisherBody }>('/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      validateUUID(id, 'Publisher ID');
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }

    const user = request.user as TokenPayload;

    try {
      const result = PublisherService.updatePublisher(id, request.body);

      if (!result) {
        return reply.code(404).send({ error: 'Publisher not found' });
      }

      // Log audit entry
      PublisherService.logAudit({
        userId: user.userId,
        action: 'UPDATE',
        entityType: 'publisher',
        entityId: id,
        oldValues: result.oldValues,
        newValues: {
          name: result.updated.name,
          slug: result.updated.slug,
          domains: result.updated.domains,
          status: result.updated.status,
          notes: result.updated.notes,
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
      });

      return result.updated;
    } catch (err) {
      return reply.code(409).send({ error: err.message });
    }
  });

  /**
   * Delete a publisher
   */
  fastify.delete<{ Params: { id: string }; Querystring: { hard?: string } }>('/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      validateUUID(id, 'Publisher ID');
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }

    const { hard } = request.query;
    const user = request.user as TokenPayload;

    const result = PublisherService.deletePublisher(id, hard === 'true');

    if (!result) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Log audit entry
    PublisherService.logAudit({
      userId: user.userId,
      action: hard === 'true' ? 'HARD_DELETE' : 'SOFT_DELETE',
      entityType: 'publisher',
      entityId: id,
      oldValues: result.oldValues,
      newValues: null,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    return reply.code(204).send();
  });

  /**
   * Restore soft-deleted publisher
   */
  fastify.post<{ Params: { id: string } }>('/:id/restore', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      validateUUID(id, 'Publisher ID');
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }

    const user = request.user as TokenPayload;

    try {
      const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
      if (!publisher) {
        return reply.code(404).send({ error: 'Publisher not found' });
      }

      const restored = PublisherService.restorePublisher(id);

      // Log audit entry
      PublisherService.logAudit({
        userId: user.userId,
        action: 'RESTORE',
        entityType: 'publisher',
        entityId: id,
        oldValues: { deletedAt: publisher.deletedAt },
        newValues: { deletedAt: null },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
      });

      return restored;
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  /**
   * Regenerate API key
   */
  fastify.post<{ Params: { id: string } }>('/:id/regenerate-key', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      validateUUID(id, 'Publisher ID');
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }

    const result = PublisherService.regenerateApiKey(id);

    if (!result) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    return result;
  });

  /**
   * Get embed code for publisher
   */
  fastify.get<{ Params: { id: string } }>('/:id/embed-code', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      validateUUID(id, 'Publisher ID');
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }

    const user = request.user as TokenPayload;

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const result = PublisherService.getEmbedCode(id);

    if (!result) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    return result;
  });

  /**
   * Bulk update publisher status
   */
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

    const results = PublisherService.bulkUpdateStatus(ids, status, user.userId, request.ip, request.headers['user-agent'] || null);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      success: failureCount === 0,
      message: `Updated ${successCount} publisher(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results,
    };
  });

  // ==================== ADMIN ASSIGNMENTS ====================

  /**
   * Get assigned admins for a publisher
   */
  fastify.get<{ Params: { id: string } }>('/:id/admins', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      validateUUID(id, 'Publisher ID');
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }

    const publisher = PublisherService.getPublisher(id);
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const admins = PublisherRelationshipService.getAssignedAdmins(id);
    return { admins };
  });

  /**
   * Get available admins
   */
  fastify.get<{ Params: { id: string } }>('/:id/available-admins', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      validateUUID(id, 'Publisher ID');
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }

    const publisher = PublisherService.getPublisher(id);
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const admins = PublisherRelationshipService.getAvailableAdmins(id);
    return { admins };
  });

  /**
   * Assign an admin to a publisher
   */
  fastify.post<{ Params: { id: string }; Body: { userId: string } }>('/:id/admins', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      validateUUID(id, 'Publisher ID');
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }

    const { userId } = request.body;
    const currentUser = request.user as TokenPayload;

    const publisher = PublisherService.getPublisher(id);
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    try {
      const admin = PublisherRelationshipService.assignAdmin(
        id,
        userId,
        currentUser.userId,
        request.ip,
        request.headers['user-agent'] || null
      );

      return { success: true, admin };
    } catch (err) {
      if (err.message === 'User not found') {
        return reply.code(404).send({ error: err.message });
      }
      if (err.message === 'User is not an admin' || err.message === 'Admin is already assigned to this publisher') {
        return reply.code(400).send({ error: err.message });
      }
      if (err.message === 'Admin is already assigned to this publisher') {
        return reply.code(409).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * Remove an admin from a publisher
   */
  fastify.delete<{ Params: { id: string; userId: string } }>('/:id/admins/:userId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id, userId } = request.params;
    const currentUser = request.user as TokenPayload;

    const publisher = PublisherService.getPublisher(id);
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    try {
      PublisherRelationshipService.unassignAdmin(
        id,
        userId,
        currentUser.userId,
        request.ip,
        request.headers['user-agent'] || null
      );

      return reply.code(204).send();
    } catch (err) {
      return reply.code(404).send({ error: err.message });
    }
  });

  // ==================== AD UNITS ====================

  /**
   * List ad units for a publisher
   */
  fastify.get<{ Params: { id: string } }>('/:id/ad-units', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      validateUUID(id, 'Publisher ID');
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }

    const user = request.user as TokenPayload;

    const publisher = PublisherService.getPublisher(id);
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const adUnits = PublisherRelationshipService.listAdUnits(id);
    return { adUnits };
  });

  /**
   * Get single ad unit
   */
  fastify.get<{ Params: { id: string; unitId: string } }>('/:id/ad-units/:unitId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, unitId } = request.params;
    const user = request.user as TokenPayload;

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const unit = PublisherRelationshipService.getAdUnit(id, unitId);

    if (!unit) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    return unit;
  });

  /**
   * Create ad unit
   */
  fastify.post<{ Params: { id: string }; Body: CreateAdUnitBody }>('/:id/ad-units', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const { code, name, mediaTypes, floorPrice, sizeMapping } = request.body;
    const user = request.user as TokenPayload;

    const publisher = PublisherService.getPublisher(id);
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    if (!code || !name) {
      return reply.code(400).send({ error: 'Code and name are required' });
    }

    try {
      const newUnit = PublisherRelationshipService.createAdUnit(id, { code, name, mediaTypes, floorPrice, sizeMapping });
      return reply.code(201).send(newUnit);
    } catch (err) {
      return reply.code(409).send({ error: err.message });
    }
  });

  /**
   * Update ad unit
   */
  fastify.put<{ Params: { id: string; unitId: string }; Body: UpdateAdUnitBody }>('/:id/ad-units/:unitId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, unitId } = request.params;
    const user = request.user as TokenPayload;

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    try {
      const updated = PublisherRelationshipService.updateAdUnit(id, unitId, request.body);

      if (!updated) {
        return reply.code(404).send({ error: 'Ad unit not found' });
      }

      return updated;
    } catch (err) {
      return reply.code(409).send({ error: err.message });
    }
  });

  /**
   * Delete ad unit
   */
  fastify.delete<{ Params: { id: string; unitId: string } }>('/:id/ad-units/:unitId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, unitId } = request.params;
    const user = request.user as TokenPayload;

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const result = PublisherRelationshipService.deleteAdUnit(id, unitId);

    if (!result) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    return reply.code(204).send();
  });

  // ==================== BIDDERS ====================

  /**
   * List bidders for a publisher
   */
  fastify.get<{ Params: { id: string } }>('/:id/bidders', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    const publisher = PublisherService.getPublisher(id);
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const bidders = PublisherRelationshipService.listBidders(id);
    return { bidders };
  });

  /**
   * Get single bidder
   */
  fastify.get<{ Params: { id: string; bidderId: string } }>('/:id/bidders/:bidderId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, bidderId } = request.params;
    const user = request.user as TokenPayload;

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const bidder = PublisherRelationshipService.getBidder(id, bidderId);

    if (!bidder) {
      return reply.code(404).send({ error: 'Bidder not found' });
    }

    return bidder;
  });

  /**
   * Create/Add bidder
   */
  fastify.post<{ Params: { id: string }; Body: CreateBidderBody }>('/:id/bidders', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const { bidderCode, enabled = true, params, timeoutOverride, priority = 0 } = request.body;
    const user = request.user as TokenPayload;

    const publisher = PublisherService.getPublisher(id);
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    if (!bidderCode) {
      return reply.code(400).send({ error: 'Bidder code is required' });
    }

    try {
      const newBidder = PublisherRelationshipService.createBidder(id, { bidderCode, enabled, params, timeoutOverride, priority });
      return reply.code(201).send(newBidder);
    } catch (err) {
      return reply.code(409).send({ error: err.message });
    }
  });

  /**
   * Update bidder
   */
  fastify.put<{ Params: { id: string; bidderId: string }; Body: UpdateBidderBody }>('/:id/bidders/:bidderId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, bidderId } = request.params;
    const user = request.user as TokenPayload;

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const updated = PublisherRelationshipService.updateBidder(id, bidderId, request.body);

    if (!updated) {
      return reply.code(404).send({ error: 'Bidder not found' });
    }

    return updated;
  });

  /**
   * Delete bidder
   */
  fastify.delete<{ Params: { id: string; bidderId: string } }>('/:id/bidders/:bidderId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, bidderId } = request.params;
    const user = request.user as TokenPayload;

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const result = PublisherRelationshipService.deleteBidder(id, bidderId);

    if (!result) {
      return reply.code(404).send({ error: 'Bidder not found' });
    }

    return reply.code(204).send();
  });

  /**
   * Copy bidders from one publisher to another
   */
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

    const targetPublisher = PublisherService.getPublisher(targetPublisherId);
    if (!targetPublisher) {
      return reply.code(404).send({ error: 'Target publisher not found' });
    }

    const sourcePublisher = PublisherService.getPublisher(sourcePublisherId);
    if (!sourcePublisher) {
      return reply.code(404).send({ error: 'Source publisher not found' });
    }

    try {
      const result = PublisherRelationshipService.copyBidders(
        targetPublisherId,
        sourcePublisherId,
        user.userId,
        request.ip,
        request.headers['user-agent'] || null
      );

      return {
        success: true,
        message: `Copied ${result.copied.length} bidder(s) from ${result.sourcePublisher}${result.skipped.length > 0 ? `. ${result.skipped.length} bidder(s) skipped (already exist)` : ''}`,
        copied: result.copied,
        skipped: result.skipped,
      };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ==================== CONFIG ROUTES ====================

  /**
   * Get publisher config
   */
  fastify.get<{ Params: { id: string } }>('/:id/config', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    const publisher = PublisherService.getPublisher(id);
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const config = PublisherStatsService.getConfig(id);

    if (!config) {
      return reply.code(404).send({ error: 'Config not found' });
    }

    return config;
  });

  /**
   * Update publisher config
   */
  fastify.put<{ Params: { id: string }; Body: UpdateConfigBody }>('/:id/config', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    const publisher = PublisherService.getPublisher(id);
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const updated = PublisherStatsService.updateConfig(id, request.body, user.userId);

    if (!updated) {
      return reply.code(404).send({ error: 'Config not found' });
    }

    return updated;
  });

  /**
   * Get config version history
   */
  fastify.get<{ Params: { id: string } }>('/:id/config/versions', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    const publisher = PublisherService.getPublisher(id);
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    return PublisherStatsService.getConfigVersions(id);
  });

  /**
   * Rollback to a specific config version
   */
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

    const publisher = PublisherService.getPublisher(id);
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const result = PublisherStatsService.rollbackConfig(id, versionId, user.userId);

    if (!result) {
      return reply.code(404).send({ error: 'Config version not found or Publisher config not found' });
    }

    // Log the rollback action
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'config_change',
      entityType: 'publisher_config',
      entityId: id,
      oldValues: JSON.stringify({ version: result.currentVersion }),
      newValues: JSON.stringify({
        type: 'rollback',
        version: result.newVersion,
        fromVersion: result.currentVersion,
        toVersion: result.targetVersion,
      }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: new Date().toISOString(),
    }).run();

    return {
      success: true,
      message: `Rolled back to version ${result.targetVersion}`,
      newVersion: result.newVersion,
    };
  });
}
