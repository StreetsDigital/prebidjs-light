import { db, publishers, publisherConfig, publisherBidders, publisherAdmins, auditLogs } from '../db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';
import { filterActive, filterDeleted, PartialUpdate } from '../utils/type-helpers';
import { PAGINATION } from '../constants/pagination';

export interface CreatePublisherData {
  name: string;
  slug: string;
  domains?: string[];
  notes?: string;
}

export interface UpdatePublisherData {
  name?: string;
  slug?: string;
  domains?: string[];
  status?: 'active' | 'paused' | 'disabled';
  notes?: string;
}

export interface ListPublishersOptions {
  page?: number;
  limit?: number;
  status?: 'active' | 'paused' | 'disabled' | 'deleted';
  search?: string;
  sortBy?: 'name' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
  userId?: string;
  userRole?: string;
}

export class PublisherService {
  /**
   * Get all publishers with filtering and pagination
   */
  static listPublishers(options: ListPublishersOptions) {
    const {
      page = 1,
      limit = PAGINATION.DEFAULT_PAGE_SIZE,
      status,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      includeDeleted = false,
      userId,
      userRole,
    } = options;

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(PAGINATION.MAX_PAGE_SIZE, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    // Get all publishers
    let allPublishers = db.select().from(publishers).all();

    // Filter for regular admin users - they only see assigned publishers
    if (userRole === 'admin' && userId) {
      const assignments = db.select().from(publisherAdmins)
        .where(eq(publisherAdmins.userId, userId))
        .all();
      const assignedPublisherIds = new Set(assignments.map(a => a.publisherId));
      allPublishers = allPublishers.filter(p => assignedPublisherIds.has(p.id));
    }

    // Filter by deleted status
    if (status === 'deleted') {
      allPublishers = filterDeleted(allPublishers);
    } else {
      if (!includeDeleted) {
        allPublishers = filterActive(allPublishers);
      }
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
        domains: safeJsonParseArray(p.domains, []),
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
  }

  /**
   * Get a single publisher by ID
   */
  static getPublisher(id: string) {
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();

    if (!publisher) {
      return null;
    }

    return {
      ...publisher,
      domains: safeJsonParseArray(publisher.domains, []),
    };
  }

  /**
   * Create a new publisher
   */
  static createPublisher(data: CreatePublisherData, userId: string) {
    const { name, slug, domains, notes } = data;

    // Check for duplicate slug
    const existing = db.select().from(publishers).where(eq(publishers.slug, slug)).get();
    if (existing) {
      throw new Error('Publisher with this slug already exists');
    }

    const now = new Date().toISOString();
    const id = uuidv4();
    const apiKey = `tne_${uuidv4().replace(/-/g, '').substring(0, 24)}`;

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
      createdBy: userId,
    }).run();

    // Create default config
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
    }).run();

    const newPublisher = db.select().from(publishers).where(eq(publishers.id, id)).get();

    return {
      ...newPublisher,
      domains: domains || [],
    };
  }

  /**
   * Update a publisher
   */
  static updatePublisher(id: string, data: UpdatePublisherData) {
    const { name, slug, domains, status, notes } = data;

    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return null;
    }

    // Store old values for audit
    const oldValues = {
      name: publisher.name,
      slug: publisher.slug,
      domains: safeJsonParseArray(publisher.domains, []),
      status: publisher.status,
      notes: publisher.notes,
    };

    // Check for slug duplicates
    if (slug && slug !== publisher.slug) {
      const existing = db.select().from(publishers).where(eq(publishers.slug, slug)).get();
      if (existing) {
        throw new Error('Publisher with this slug already exists');
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
      .run();

    const updated = db.select().from(publishers).where(eq(publishers.id, id)).get();

    return {
      updated: {
        ...updated,
        domains: safeJsonParseArray(updated?.domains, []),
      },
      oldValues,
    };
  }

  /**
   * Delete a publisher (soft or hard delete)
   */
  static deletePublisher(id: string, hardDelete: boolean = false) {
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return null;
    }

    const oldValues = {
      name: publisher.name,
      slug: publisher.slug,
      domains: safeJsonParseArray(publisher.domains, []),
      status: publisher.status,
      notes: publisher.notes,
    };

    const now = new Date().toISOString();

    if (hardDelete) {
      // Hard delete - remove all related data
      db.delete(publisherConfig).where(eq(publisherConfig.publisherId, id)).run();
      db.delete(publisherBidders).where(eq(publisherBidders.publisherId, id)).run();
      db.delete(publisherAdmins).where(eq(publisherAdmins.publisherId, id)).run();
      db.delete(publishers).where(eq(publishers.id, id)).run();
    } else {
      // Soft delete
      const update: PartialUpdate<typeof publishers.$inferInsert> = {
        deletedAt: now,
        updatedAt: now,
      };
      db.update(publishers)
        .set(update)
        .where(eq(publishers.id, id))
        .run();
    }

    return { oldValues };
  }

  /**
   * Restore a soft-deleted publisher
   */
  static restorePublisher(id: string) {
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return null;
    }

    if (!publisher.deletedAt) {
      throw new Error('Publisher is not deleted');
    }

    const now = new Date().toISOString();
    const update: PartialUpdate<typeof publishers.$inferInsert> = {
      deletedAt: null,
      updatedAt: now,
    };

    db.update(publishers)
      .set(update)
      .where(eq(publishers.id, id))
      .run();

    const restored = db.select().from(publishers).where(eq(publishers.id, id)).get();
    return {
      ...restored,
      domains: safeJsonParseArray(restored?.domains, []),
    };
  }

  /**
   * Regenerate API key
   */
  static regenerateApiKey(id: string) {
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return null;
    }

    const newApiKey = `tne_${uuidv4().replace(/-/g, '').substring(0, 24)}`;
    const now = new Date().toISOString();

    db.update(publishers)
      .set({ apiKey: newApiKey, updatedAt: now })
      .where(eq(publishers.id, id))
      .run();

    return { apiKey: newApiKey };
  }

  /**
   * Get embed code for publisher
   */
  static getEmbedCode(id: string) {
    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return null;
    }

    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
    const embedCode = `<!-- pbjs_engine Prebid Wrapper -->
<script src="${baseUrl}/pb.js?id=${publisher.slug}" async></script>`;

    return {
      embedCode,
      apiKey: publisher.apiKey,
      slug: publisher.slug,
    };
  }

  /**
   * Bulk update publisher status
   */
  static bulkUpdateStatus(ids: string[], status: 'active' | 'paused' | 'disabled', userId: string, ipAddress: string, userAgent: string | null) {
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

        db.update(publishers)
          .set({ status, updatedAt: now })
          .where(eq(publishers.id, id))
          .run();

        // Log audit entry
        db.insert(auditLogs).values({
          id: uuidv4(),
          userId,
          action: 'BULK_UPDATE_STATUS',
          entityType: 'publisher',
          entityId: id,
          oldValues: JSON.stringify({ status: oldStatus }),
          newValues: JSON.stringify({ status }),
          ipAddress,
          userAgent,
          createdAt: now,
        }).run();

        results.push({ id, success: true });
      } catch (err) {
        results.push({ id, success: false, error: 'Failed to update' });
      }
    }

    return results;
  }

  /**
   * Log audit entry
   */
  static logAudit(params: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues: any;
    newValues: any;
    ipAddress: string;
    userAgent: string | null;
  }) {
    const now = new Date().toISOString();

    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
      newValues: params.newValues ? JSON.stringify(params.newValues) : null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      createdAt: now,
    }).run();
  }
}
