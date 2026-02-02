/**
 * Ad Units API Routes (Updated for Taxonomy)
 *
 * NEW HIERARCHY: Publisher → Website → Ad Unit
 *
 * Ad units now MUST belong to a website, which belongs to a publisher.
 * Routes have been updated to reflect this hierarchy.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, TokenPayload } from '../middleware/auth';
import * as adUnitService from '../services/ad-unit-service';

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
    const website = adUnitService.getWebsiteById(websiteId);

    if (!website) {
      return reply.code(404).send({ error: 'Website not found' });
    }

    // Check authorization
    if (!adUnitService.isAuthorizedForWebsite({
      role: user.role,
      publisherId: user.publisherId
    }, website.publisherId)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Get all ad units for this website
    const units = adUnitService.listAdUnitsByWebsite(websiteId);

    return {
      adUnits: units,
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
    const website = adUnitService.getWebsiteById(websiteId);

    if (!website) {
      return reply.code(404).send({ error: 'Website not found' });
    }

    // Check authorization
    if (!adUnitService.isAuthorizedForWebsite({
      role: user.role,
      publisherId: user.publisherId
    }, website.publisherId)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Check if ad unit code already exists for this website
    if (adUnitService.adUnitCodeExists(websiteId, code)) {
      return reply.code(409).send({
        error: 'Conflict',
        message: `Ad unit with code "${code}" already exists for this website`,
      });
    }

    // Create ad unit
    const created = adUnitService.createAdUnit({
      websiteId,
      code,
      name,
      mediaTypes,
      floorPrice,
      targeting,
      sizeMapping,
    }, website.publisherId, {
      userId: user.userId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    return reply.code(201).send(created);
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

    const adUnit = adUnitService.getAdUnitById(id);

    if (!adUnit) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    // Get website to check authorization
    const website = adUnitService.getWebsiteById(adUnit.websiteId);

    if (!website) {
      return reply.code(500).send({ error: 'Data integrity error: website not found' });
    }

    // Check authorization
    if (!adUnitService.isAuthorizedForWebsite({
      role: user.role,
      publisherId: user.publisherId
    }, website.publisherId)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const formattedUnit = adUnitService.listAdUnitsByWebsite(adUnit.websiteId)
      .find(u => u.id === id);

    return {
      ...formattedUnit,
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
    const existing = adUnitService.getAdUnitById(id);

    if (!existing) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    // Get website to check authorization
    const website = adUnitService.getWebsiteById(existing.websiteId);

    if (!website) {
      return reply.code(500).send({ error: 'Data integrity error' });
    }

    // Check authorization
    if (!adUnitService.isAuthorizedForWebsite({
      role: user.role,
      publisherId: user.publisherId
    }, website.publisherId)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // If code is being changed, check for conflicts
    if (updates.code && updates.code !== existing.code) {
      if (adUnitService.adUnitCodeExists(existing.websiteId, updates.code)) {
        return reply.code(409).send({
          error: 'Conflict',
          message: `Ad unit with code "${updates.code}" already exists for this website`,
        });
      }
    }

    // Update ad unit
    const updated = adUnitService.updateAdUnit(id, updates, existing, {
      userId: user.userId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    return updated;
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

    const adUnit = adUnitService.getAdUnitById(id);

    if (!adUnit) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    // Get website to check authorization
    const website = adUnitService.getWebsiteById(adUnit.websiteId);

    if (!website) {
      return reply.code(500).send({ error: 'Data integrity error' });
    }

    // Check authorization
    if (!adUnitService.isAuthorizedForWebsite({
      role: user.role,
      publisherId: user.publisherId
    }, website.publisherId)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Delete ad unit
    adUnitService.deleteAdUnit(id, adUnit, {
      userId: user.userId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
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
    const source = adUnitService.getAdUnitById(id);

    if (!source) {
      return reply.code(404).send({ error: 'Ad unit not found' });
    }

    // Get website to check authorization
    const website = adUnitService.getWebsiteById(source.websiteId);

    if (!website) {
      return reply.code(500).send({ error: 'Data integrity error' });
    }

    // Check authorization
    if (!adUnitService.isAuthorizedForWebsite({
      role: user.role,
      publisherId: user.publisherId
    }, website.publisherId)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Check for code conflict
    if (adUnitService.adUnitCodeExists(source.websiteId, newCode)) {
      return reply.code(409).send({
        error: 'Conflict',
        message: `Ad unit with code "${newCode}" already exists`,
      });
    }

    // Create duplicate
    const created = adUnitService.duplicateAdUnit(id, source, website.publisherId, {
      newCode,
      newName,
    }, {
      userId: user.userId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    return reply.code(201).send(created);
  });
}
