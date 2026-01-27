/**
 * Ad Units API Routes (Updated for Taxonomy)
 *
 * NEW HIERARCHY: Publisher → Website → Ad Unit
 *
 * Ad units now MUST belong to a website, which belongs to a publisher.
 * Routes have been updated to reflect this hierarchy.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, adUnits, websites, publishers, auditLogs } from '../db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, TokenPayload } from '../middleware/auth';

interface CreateAdUnitBody {
  code: string;
  name: string;
  mediaTypes?: string; // JSON string
  floorPrice?: string;
  targeting?: string; // JSON string
  sizeMapping?: string; // JSON string
}

interface UpdateAdUnitBody {
  code?: string;
  name?: string;
  mediaTypes?: string;
  floorPrice?: string;
  targeting?: string;
  sizeMapping?: string;
  status?: 'active' | 'paused';
}

export default async function adUnitsRoutes(fastify: FastifyInstance) {
  /**
   * List ad units for a specific website
   * GET /api/websites/:websiteId/ad-units
   */
  fastify.get<{
    Params: { websiteId: string };
  }>('/websites/:websiteId/ad-units', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest<{ Params: { websiteId: string } }>, reply: FastifyReply) => {
    const { websiteId } = request.params;
    const user = request.user as TokenPayload;

    // Verify website exists and get publisher info
    const website = db.select()
      .from(websites)
      .where(eq(websites.id, websiteId))
      .get();

    if (!website) {
      return reply.code(404).send({ error: 'Website not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== website.publisherId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Get all ad units for this website
    const units = db.select()
      .from(adUnits)
      .where(eq(adUnits.websiteId, websiteId))
      .all();

    return {
      adUnits: units.map(unit => ({
        id: unit.id,
        websiteId: unit.websiteId,
        code: unit.code,
        name: unit.name,
        mediaTypes: unit.mediaTypes ? JSON.parse(unit.mediaTypes) : null,
        floorPrice: unit.floorPrice,
        targeting: unit.targeting ? JSON.parse(unit.targeting) : null,
        sizeMapping: unit.sizeMapping ? JSON.parse(unit.sizeMapping) : null,
        status: unit.status,
        createdAt: unit.createdAt,
        updatedAt: unit.updatedAt,
      })),
      websiteId,
      websiteName: website.name,
      websiteDomain: website.domain,
    };
  });

  /**
   * Create ad unit for a specific website
   * POST /api/websites/:websiteId/ad-units
   */
  fastify.post<{
    Params: { websiteId: string };
    Body: CreateAdUnitBody;
  }>('/websites/:websiteId/ad-units', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest<{
    Params: { websiteId: string };
    Body: CreateAdUnitBody;
  }>, reply: FastifyReply) => {
    const { websiteId } = request.params;
    const user = request.user as TokenPayload;
    const { code, name, mediaTypes, floorPrice, targeting, sizeMapping } = request.body;

    // Validate required fields
    if (!code || !name) {
      return reply.code(400).send({
        error: 'Validation failed',
        message: 'code and name are required',
      });
    }

    // Verify website exists and get publisher info
    const website = db.select()
      .from(websites)
      .where(eq(websites.id, websiteId))
      .get();

    if (!website) {
      return reply.code(404).send({ error: 'Website not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== website.publisherId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Check if ad unit code already exists for this website
    const existingUnit = db.select()
      .from(adUnits)
      .where(and(
        eq(adUnits.websiteId, websiteId),
        eq(adUnits.code, code)
      ))
      .get();

    if (existingUnit) {
      return reply.code(409).send({
        error: 'Conflict',
        message: `Ad unit with code "${code}" already exists for this website`,
      });
    }

    // Create ad unit
    const adUnitId = uuidv4();
    const now = new Date().toISOString();

    db.insert(adUnits).values({
      id: adUnitId,
      websiteId, // Required - enforces hierarchy
      code,
      name,
      mediaTypes: mediaTypes || null,
      floorPrice: floorPrice || null,
      targeting: targeting || null,
      sizeMapping: sizeMapping || null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.id,
      action: 'CREATE_AD_UNIT',
      entityType: 'ad_unit',
      entityId: adUnitId,
      newValues: JSON.stringify({ websiteId, code, name }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    });

    const created = db.select()
      .from(adUnits)
      .where(eq(adUnits.id, adUnitId))
      .get();

    return reply.code(201).send({
      id: created.id,
      websiteId: created.websiteId,
      code: created.code,
      name: created.name,
      mediaTypes: created.mediaTypes ? JSON.parse(created.mediaTypes) : null,
      floorPrice: created.floorPrice,
      targeting: created.targeting ? JSON.parse(created.targeting) : null,
      sizeMapping: created.sizeMapping ? JSON.parse(created.sizeMapping) : null,
      status: created.status,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  });

  /**
   * Get single ad unit by ID
   * GET /api/ad-units/:id
   */
  fastify.get<{
    Params: { id: string };
  }>('/ad-units/:id', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    const adUnit = db.select()
      .from(adUnits)
      .where(eq(adUnits.id, id))
      .get();

    if (!adUnit) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    // Get website to check authorization
    const website = db.select()
      .from(websites)
      .where(eq(websites.id, adUnit.websiteId))
      .get();

    if (!website) {
      return reply.code(500).send({ error: 'Data integrity error: website not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== website.publisherId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    return {
      id: adUnit.id,
      websiteId: adUnit.websiteId,
      code: adUnit.code,
      name: adUnit.name,
      mediaTypes: adUnit.mediaTypes ? JSON.parse(adUnit.mediaTypes) : null,
      floorPrice: adUnit.floorPrice,
      targeting: adUnit.targeting ? JSON.parse(adUnit.targeting) : null,
      sizeMapping: adUnit.sizeMapping ? JSON.parse(adUnit.sizeMapping) : null,
      status: adUnit.status,
      createdAt: adUnit.createdAt,
      updatedAt: adUnit.updatedAt,
      website: {
        id: website.id,
        name: website.name,
        domain: website.domain,
        publisherId: website.publisherId,
      },
    };
  });

  /**
   * Update ad unit
   * PUT /api/ad-units/:id
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateAdUnitBody;
  }>('/ad-units/:id', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateAdUnitBody;
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;
    const updates = request.body;

    // Get existing ad unit
    const existing = db.select()
      .from(adUnits)
      .where(eq(adUnits.id, id))
      .get();

    if (!existing) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    // Get website to check authorization
    const website = db.select()
      .from(websites)
      .where(eq(websites.id, existing.websiteId))
      .get();

    if (!website) {
      return reply.code(500).send({ error: 'Data integrity error' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== website.publisherId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // If code is being changed, check for conflicts
    if (updates.code && updates.code !== existing.code) {
      const conflict = db.select()
        .from(adUnits)
        .where(and(
          eq(adUnits.websiteId, existing.websiteId),
          eq(adUnits.code, updates.code)
        ))
        .get();

      if (conflict) {
        return reply.code(409).send({
          error: 'Conflict',
          message: `Ad unit with code "${updates.code}" already exists for this website`,
        });
      }
    }

    // Update ad unit
    const now = new Date().toISOString();
    const updateData: any = { updatedAt: now };

    if (updates.code) updateData.code = updates.code;
    if (updates.name) updateData.name = updates.name;
    if (updates.mediaTypes !== undefined) updateData.mediaTypes = updates.mediaTypes;
    if (updates.floorPrice !== undefined) updateData.floorPrice = updates.floorPrice;
    if (updates.targeting !== undefined) updateData.targeting = updates.targeting;
    if (updates.sizeMapping !== undefined) updateData.sizeMapping = updates.sizeMapping;
    if (updates.status) updateData.status = updates.status;

    db.update(adUnits)
      .set(updateData)
      .where(eq(adUnits.id, id))
      ;

    // Audit log
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.id,
      action: 'UPDATE_AD_UNIT',
      entityType: 'ad_unit',
      entityId: id,
      oldValues: JSON.stringify(existing),
      newValues: JSON.stringify(updates),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    });

    const updated = db.select()
      .from(adUnits)
      .where(eq(adUnits.id, id))
      .get();

    return {
      id: updated.id,
      websiteId: updated.websiteId,
      code: updated.code,
      name: updated.name,
      mediaTypes: updated.mediaTypes ? JSON.parse(updated.mediaTypes) : null,
      floorPrice: updated.floorPrice,
      targeting: updated.targeting ? JSON.parse(updated.targeting) : null,
      sizeMapping: updated.sizeMapping ? JSON.parse(updated.sizeMapping) : null,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  });

  /**
   * Delete ad unit
   * DELETE /api/ad-units/:id
   */
  fastify.delete<{
    Params: { id: string };
  }>('/ad-units/:id', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    const adUnit = db.select()
      .from(adUnits)
      .where(eq(adUnits.id, id))
      .get();

    if (!adUnit) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    // Get website to check authorization
    const website = db.select()
      .from(websites)
      .where(eq(websites.id, adUnit.websiteId))
      .get();

    if (!website) {
      return reply.code(500).send({ error: 'Data integrity error' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== website.publisherId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Delete ad unit
    db.delete(adUnits)
      .where(eq(adUnits.id, id))
      ;

    // Audit log
    const now = new Date().toISOString();
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.id,
      action: 'DELETE_AD_UNIT',
      entityType: 'ad_unit',
      entityId: id,
      oldValues: JSON.stringify(adUnit),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    });

    return { message: 'Ad unit deleted successfully' };
  });

  /**
   * Duplicate ad unit (within same website)
   * POST /api/ad-units/:id/duplicate
   */
  fastify.post<{
    Params: { id: string };
    Body: { newCode: string; newName: string };
  }>('/ad-units/:id/duplicate', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { newCode: string; newName: string };
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { newCode, newName } = request.body;
    const user = request.user as TokenPayload;

    // Get source ad unit
    const source = db.select()
      .from(adUnits)
      .where(eq(adUnits.id, id))
      .get();

    if (!source) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    // Get website to check authorization
    const website = db.select()
      .from(websites)
      .where(eq(websites.id, source.websiteId))
      .get();

    if (!website) {
      return reply.code(500).send({ error: 'Data integrity error' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== website.publisherId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Check for code conflict
    const existing = db.select()
      .from(adUnits)
      .where(and(
        eq(adUnits.websiteId, source.websiteId),
        eq(adUnits.code, newCode)
      ))
      .get();

    if (existing) {
      return reply.code(409).send({
        error: 'Conflict',
        message: `Ad unit with code "${newCode}" already exists`,
      });
    }

    // Create duplicate
    const newId = uuidv4();
    const now = new Date().toISOString();

    db.insert(adUnits).values({
      id: newId,
      websiteId: source.websiteId,
      code: newCode,
      name: newName,
      mediaTypes: source.mediaTypes,
      floorPrice: source.floorPrice,
      targeting: source.targeting,
      sizeMapping: source.sizeMapping,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.id,
      action: 'DUPLICATE_AD_UNIT',
      entityType: 'ad_unit',
      entityId: newId,
      newValues: JSON.stringify({ sourceId: id, newCode, newName }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    });

    const created = db.select()
      .from(adUnits)
      .where(eq(adUnits.id, newId))
      .get();

    return reply.code(201).send({
      id: created.id,
      websiteId: created.websiteId,
      code: created.code,
      name: created.name,
      mediaTypes: created.mediaTypes ? JSON.parse(created.mediaTypes) : null,
      floorPrice: created.floorPrice,
      targeting: created.targeting ? JSON.parse(created.targeting) : null,
      sizeMapping: created.sizeMapping ? JSON.parse(created.sizeMapping) : null,
      status: created.status,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  });
}
