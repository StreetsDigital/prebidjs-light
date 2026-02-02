import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, websites, adUnits, publishers, auditLogs } from '../db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, TokenPayload } from '../middleware/auth';
import { validateUUID } from '../utils/validation';
import { safeJsonParseObject } from '../utils/safe-json';
import { getErrorMessage } from '../utils/type-helpers';
import { PAGINATION } from '../constants/pagination';

interface CreateWebsiteBody {
  name: string;
  domain: string;
  notes?: string;
}

interface UpdateWebsiteBody {
  name?: string;
  domain?: string;
  status?: 'active' | 'paused' | 'disabled';
  notes?: string;
}

interface ListWebsitesQuery {
  page?: string;
  limit?: string;
  status?: 'active' | 'paused' | 'disabled';
  search?: string;
}

export default async function websiteRoutes(fastify: FastifyInstance) {
  /**
   * Get all websites for a publisher with pagination and filtering
   * @route GET /api/publishers/:publisherId/websites
   * @access Authenticated (admin can see all, publisher can only see their own)
   * @param {string} publisherId - Publisher UUID
   * @param {ListWebsitesQuery} query - Filter and pagination parameters
   * @returns {Promise<{websites: Website[], pagination: PaginationInfo}>} Paginated list of websites with ad unit counts
   * @throws {404} Publisher not found
   * @throws {403} Forbidden - publisher trying to access another publisher's websites
   */
  fastify.get<{ Params: { publisherId: string }; Querystring: ListWebsitesQuery }>('/publishers/:publisherId/websites', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest<{ Params: { publisherId: string }; Querystring: ListWebsitesQuery }>, reply: FastifyReply) => {
    const { publisherId } = request.params;
    const user = request.user as TokenPayload;
    const { page = '1', limit = String(PAGINATION.WEBSITES_PAGE_SIZE), status, search } = request.query;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== publisherId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(PAGINATION.MAX_PAGE_SIZE, Math.max(1, parseInt(limit, 10) || PAGINATION.WEBSITES_PAGE_SIZE));
    const offset = (pageNum - 1) * limitNum;

    let allWebsites = db.select().from(websites).where(eq(websites.publisherId, publisherId)).all();

    // Apply status filter
    if (status) {
      allWebsites = allWebsites.filter(w => w.status === status);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      allWebsites = allWebsites.filter(w =>
        w.name.toLowerCase().includes(searchLower) ||
        w.domain.toLowerCase().includes(searchLower)
      );
    }

    // Sort by name
    allWebsites.sort((a, b) => a.name.localeCompare(b.name));

    const total = allWebsites.length;
    const totalPages = Math.ceil(total / limitNum);

    // Apply pagination
    const paginatedWebsites = allWebsites.slice(offset, offset + limitNum);

    // Get ad unit counts for each website
    const websitesWithCounts = paginatedWebsites.map(w => {
      const adUnitCount = db.select().from(adUnits).where(eq(adUnits.websiteId, w.id)).all().length;
      return {
        ...w,
        adUnitCount,
      };
    });

    return {
      websites: websitesWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    };
  });

  /**
   * Get a single website by ID with associated ad units
   * @route GET /api/publishers/:publisherId/websites/:websiteId
   * @access Authenticated
   * @param {string} publisherId - Publisher UUID
   * @param {string} websiteId - Website UUID
   * @returns {Promise<Website & {adUnits: AdUnit[]}>} Website details with all ad units
   * @throws {400} Invalid UUID format
   * @throws {404} Website not found
   * @throws {403} Forbidden
   */
  fastify.get<{ Params: { publisherId: string; websiteId: string } }>('/publishers/:publisherId/websites/:websiteId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { publisherId, websiteId } = request.params;

    // Validate UUID parameter
    try {
      validateUUID(websiteId, 'Website ID');
    } catch (err) {
      return reply.code(400).send({ error: getErrorMessage(err) });
    }

    const user = request.user as TokenPayload;

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== publisherId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const website = db.select().from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.publisherId, publisherId)))
      .get();

    if (!website) {
      return reply.code(404).send({ error: 'Website not found' });
    }

    // Get ad units for this website
    const websiteAdUnits = db.select().from(adUnits).where(eq(adUnits.websiteId, websiteId)).all();

    return {
      ...website,
      adUnits: websiteAdUnits.map(u => ({
        ...u,
        mediaTypes: safeJsonParseObject(u.mediaTypes, null),
      })),
    };
  });

  /**
   * Create a new website for a publisher
   * @route POST /api/publishers/:publisherId/websites
   * @access Authenticated
   * @param {string} publisherId - Publisher UUID
   * @param {CreateWebsiteBody} body - Website details (name, domain, notes)
   * @returns {Promise<Website>} Newly created website
   * @throws {404} Publisher not found
   * @throws {400} Missing required fields (name, domain)
   * @throws {409} Website with this domain already exists for this publisher
   * @throws {403} Forbidden
   * @description Domain is normalized (removes protocol and trailing slash) before storage
   */
  fastify.post<{ Params: { publisherId: string }; Body: CreateWebsiteBody }>('/publishers/:publisherId/websites', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { publisherId } = request.params;
    const { name, domain, notes } = request.body;
    const user = request.user as TokenPayload;

    // Check if publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== publisherId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    if (!name || !domain) {
      return reply.code(400).send({ error: 'Name and domain are required' });
    }

    // Normalize domain (remove protocol and trailing slash)
    let normalizedDomain = domain.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    // Check for duplicate domain within publisher
    const existing = db.select().from(websites)
      .where(and(eq(websites.publisherId, publisherId), eq(websites.domain, normalizedDomain)))
      .get();
    if (existing) {
      return reply.code(409).send({ error: 'Website with this domain already exists for this publisher' });
    }

    const now = new Date().toISOString();
    const websiteId = uuidv4();

    db.insert(websites).values({
      id: websiteId,
      publisherId,
      name,
      domain: normalizedDomain,
      status: 'active',
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Log audit entry
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'CREATE',
      entityType: 'website',
      entityId: websiteId,
      oldValues: null,
      newValues: JSON.stringify({ name, domain: normalizedDomain, status: 'active', notes: notes || null }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    }).run();

    const newWebsite = db.select().from(websites).where(eq(websites.id, websiteId)).get();

    return reply.code(201).send({
      ...newWebsite,
      adUnitCount: 0,
    });
  });

  /**
   * Update an existing website
   * @route PUT /api/publishers/:publisherId/websites/:websiteId
   * @access Authenticated
   * @param {string} publisherId - Publisher UUID
   * @param {string} websiteId - Website UUID
   * @param {UpdateWebsiteBody} body - Fields to update (name, domain, status, notes)
   * @returns {Promise<Website>} Updated website with ad unit count
   * @throws {400} Invalid UUID format
   * @throws {404} Website not found
   * @throws {409} Domain already exists for this publisher
   * @throws {403} Forbidden
   * @description Logs changes to audit log
   */
  fastify.put<{ Params: { publisherId: string; websiteId: string }; Body: UpdateWebsiteBody }>('/publishers/:publisherId/websites/:websiteId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { publisherId, websiteId } = request.params;

    // Validate UUID parameter
    try {
      validateUUID(websiteId, 'Website ID');
    } catch (err) {
      return reply.code(400).send({ error: getErrorMessage(err) });
    }

    const { name, domain, status, notes } = request.body;
    const user = request.user as TokenPayload;

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== publisherId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const website = db.select().from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.publisherId, publisherId)))
      .get();

    if (!website) {
      return reply.code(404).send({ error: 'Website not found' });
    }

    // Store old values for audit log
    const oldValues = {
      name: website.name,
      domain: website.domain,
      status: website.status,
      notes: website.notes,
    };

    // Normalize domain if provided
    let normalizedDomain = domain;
    if (domain) {
      normalizedDomain = domain.toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '');

      // If domain is changing, check for duplicates
      if (normalizedDomain !== website.domain) {
        const existing = db.select().from(websites)
          .where(and(eq(websites.publisherId, publisherId), eq(websites.domain, normalizedDomain)))
          .get();
        if (existing) {
          return reply.code(409).send({ error: 'Website with this domain already exists for this publisher' });
        }
      }
    }

    const now = new Date().toISOString();

    db.update(websites)
      .set({
        ...(name && { name }),
        ...(normalizedDomain && { domain: normalizedDomain }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        updatedAt: now,
      })
      .where(eq(websites.id, websiteId))
      .run();

    const updated = db.select().from(websites).where(eq(websites.id, websiteId)).get();

    // Log audit entry
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'website',
      entityId: websiteId,
      oldValues: JSON.stringify(oldValues),
      newValues: JSON.stringify({
        name: updated?.name,
        domain: updated?.domain,
        status: updated?.status,
        notes: updated?.notes,
      }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    }).run();

    // Get ad unit count
    const adUnitCount = db.select().from(adUnits).where(eq(adUnits.websiteId, websiteId)).all().length;

    return {
      ...updated,
      adUnitCount,
    };
  });

  /**
   * Delete a website (permanent deletion)
   * @route DELETE /api/publishers/:publisherId/websites/:websiteId
   * @access Authenticated
   * @param {string} publisherId - Publisher UUID
   * @param {string} websiteId - Website UUID
   * @returns {Promise<void>} 204 No Content
   * @throws {400} Invalid UUID format
   * @throws {404} Website not found
   * @throws {403} Forbidden
   * @description Permanently deletes website. Associated ad units are preserved but their websiteId is set to null.
   */
  fastify.delete<{ Params: { publisherId: string; websiteId: string } }>('/publishers/:publisherId/websites/:websiteId', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { publisherId, websiteId } = request.params;

    // Validate UUID parameter
    try {
      validateUUID(websiteId, 'Website ID');
    } catch (err) {
      return reply.code(400).send({ error: getErrorMessage(err) });
    }

    const user = request.user as TokenPayload;

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== publisherId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const website = db.select().from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.publisherId, publisherId)))
      .get();

    if (!website) {
      return reply.code(404).send({ error: 'Website not found' });
    }

    const now = new Date().toISOString();

    // Log audit entry before deleting
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'DELETE',
      entityType: 'website',
      entityId: websiteId,
      oldValues: JSON.stringify({
        name: website.name,
        domain: website.domain,
        status: website.status,
        notes: website.notes,
      }),
      newValues: null,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    }).run();

    // Update ad units to remove website reference (don't delete them)
    db.update(adUnits)
      .set({ websiteId: null })
      .where(eq(adUnits.websiteId, websiteId))
      .run();

    // Delete the website
    db.delete(websites).where(eq(websites.id, websiteId)).run();

    return reply.code(204).send();
  });
}
