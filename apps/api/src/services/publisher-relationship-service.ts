import { db, publisherAdmins, users, adUnits, publisherBidders, publishers, auditLogs } from '../db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

// ==================== ADMIN RELATIONSHIPS ====================

export class PublisherRelationshipService {
  /**
   * Get assigned admins for a publisher
   */
  static getAssignedAdmins(publisherId: string) {
    const assignments = db.select().from(publisherAdmins)
      .where(eq(publisherAdmins.publisherId, publisherId))
      .all();

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

    return assignedAdmins;
  }

  /**
   * Get available admins (not yet assigned to this publisher)
   */
  static getAvailableAdmins(publisherId: string) {
    const allAdmins = db.select().from(users)
      .where(eq(users.role, 'admin'))
      .all();

    const assignments = db.select().from(publisherAdmins)
      .where(eq(publisherAdmins.publisherId, publisherId))
      .all();
    const assignedIds = new Set(assignments.map(a => a.userId));

    const availableAdmins = allAdmins.filter(admin => !assignedIds.has(admin.id));

    return availableAdmins.map(admin => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
    }));
  }

  /**
   * Assign an admin to a publisher
   */
  static assignAdmin(publisherId: string, userId: string, currentUserId: string, ipAddress: string, userAgent: string | null) {
    // Check if user exists and is an admin
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      throw new Error('User not found');
    }
    if (user.role !== 'admin') {
      throw new Error('User is not an admin');
    }

    // Check if already assigned
    const existing = db.select().from(publisherAdmins)
      .where(and(eq(publisherAdmins.publisherId, publisherId), eq(publisherAdmins.userId, userId)))
      .get();
    if (existing) {
      throw new Error('Admin is already assigned to this publisher');
    }

    const now = new Date().toISOString();

    db.insert(publisherAdmins).values({
      publisherId,
      userId,
      createdAt: now,
    }).run();

    // Log audit entry
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: currentUserId,
      action: 'ASSIGN_ADMIN',
      entityType: 'publisher_admin',
      entityId: publisherId,
      oldValues: null,
      newValues: JSON.stringify({ publisherId, userId, userName: user.name }),
      ipAddress,
      userAgent,
      createdAt: now,
    }).run();

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedAt: now,
    };
  }

  /**
   * Remove an admin from a publisher
   */
  static unassignAdmin(publisherId: string, userId: string, currentUserId: string, ipAddress: string, userAgent: string | null) {
    const assignment = db.select().from(publisherAdmins)
      .where(and(eq(publisherAdmins.publisherId, publisherId), eq(publisherAdmins.userId, userId)))
      .get();
    if (!assignment) {
      throw new Error('Admin assignment not found');
    }

    const user = db.select().from(users).where(eq(users.id, userId)).get();

    const now = new Date().toISOString();

    db.delete(publisherAdmins)
      .where(and(eq(publisherAdmins.publisherId, publisherId), eq(publisherAdmins.userId, userId)))
      .run();

    // Log audit entry
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: currentUserId,
      action: 'UNASSIGN_ADMIN',
      entityType: 'publisher_admin',
      entityId: publisherId,
      oldValues: JSON.stringify({ publisherId, userId, userName: user?.name }),
      newValues: null,
      ipAddress,
      userAgent,
      createdAt: now,
    }).run();
  }

  // ==================== AD UNITS ====================

  /**
   * List ad units for a publisher
   */
  static listAdUnits(publisherId: string) {
    const units = db.select().from(adUnits).where(eq(adUnits.publisherId, publisherId)).all();

    return units.map(u => ({
      ...u,
      mediaTypes: safeJsonParseObject(u.mediaTypes, null),
      sizeMapping: safeJsonParseArray(u.sizeMapping, null),
    }));
  }

  /**
   * Get single ad unit
   */
  static getAdUnit(publisherId: string, unitId: string) {
    const unit = db.select().from(adUnits)
      .where(and(eq(adUnits.id, unitId), eq(adUnits.publisherId, publisherId)))
      .get();

    if (!unit) {
      return null;
    }

    return {
      ...unit,
      mediaTypes: safeJsonParseObject(unit.mediaTypes, null),
      sizeMapping: safeJsonParseArray(unit.sizeMapping, null),
    };
  }

  /**
   * Create ad unit
   */
  static createAdUnit(publisherId: string, data: {
    code: string;
    name: string;
    mediaTypes?: any;
    floorPrice?: string;
    sizeMapping?: any[];
  }) {
    const { code, name, mediaTypes, floorPrice, sizeMapping } = data;

    // Check for duplicate code
    const existing = db.select().from(adUnits)
      .where(and(eq(adUnits.publisherId, publisherId), eq(adUnits.code, code)))
      .get();
    if (existing) {
      throw new Error('Ad unit with this code already exists for this publisher');
    }

    const now = new Date().toISOString();
    const unitId = uuidv4();

    db.insert(adUnits).values({
      id: unitId,
      publisherId,
      websiteId: null,
      code,
      name,
      mediaTypes: mediaTypes ? JSON.stringify(mediaTypes) : null,
      floorPrice: floorPrice || null,
      sizeMapping: sizeMapping ? JSON.stringify(sizeMapping) : null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).run();

    const newUnit = db.select().from(adUnits).where(eq(adUnits.id, unitId)).get();

    return {
      ...newUnit,
      mediaTypes: safeJsonParseObject(newUnit?.mediaTypes, null),
      sizeMapping: safeJsonParseArray(newUnit?.sizeMapping, null),
    };
  }

  /**
   * Update ad unit
   */
  static updateAdUnit(publisherId: string, unitId: string, data: {
    code?: string;
    name?: string;
    mediaTypes?: any;
    floorPrice?: string;
    status?: 'active' | 'paused';
    sizeMapping?: any[];
  }) {
    const { code, name, mediaTypes, floorPrice, status, sizeMapping } = data;

    const unit = db.select().from(adUnits)
      .where(and(eq(adUnits.id, unitId), eq(adUnits.publisherId, publisherId)))
      .get();

    if (!unit) {
      return null;
    }

    // Check for code duplicates
    if (code && code !== unit.code) {
      const existing = db.select().from(adUnits)
        .where(and(eq(adUnits.publisherId, publisherId), eq(adUnits.code, code)))
        .get();
      if (existing) {
        throw new Error('Ad unit with this code already exists for this publisher');
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
      .run();

    const updated = db.select().from(adUnits).where(eq(adUnits.id, unitId)).get();

    return {
      ...updated,
      mediaTypes: safeJsonParseObject(updated?.mediaTypes, null),
      sizeMapping: safeJsonParseArray(updated?.sizeMapping, null),
    };
  }

  /**
   * Delete ad unit
   */
  static deleteAdUnit(publisherId: string, unitId: string) {
    const unit = db.select().from(adUnits)
      .where(and(eq(adUnits.id, unitId), eq(adUnits.publisherId, publisherId)))
      .get();

    if (!unit) {
      return null;
    }

    db.delete(adUnits).where(eq(adUnits.id, unitId)).run();
    return unit;
  }

  // ==================== BIDDERS ====================

  /**
   * List bidders for a publisher
   */
  static listBidders(publisherId: string) {
    const bidders = db.select().from(publisherBidders).where(eq(publisherBidders.publisherId, publisherId)).all();

    return bidders.map(b => ({
      ...b,
      params: safeJsonParseObject(b.params, null),
    }));
  }

  /**
   * Get single bidder
   */
  static getBidder(publisherId: string, bidderId: string) {
    const bidder = db.select().from(publisherBidders)
      .where(and(eq(publisherBidders.id, bidderId), eq(publisherBidders.publisherId, publisherId)))
      .get();

    if (!bidder) {
      return null;
    }

    return {
      ...bidder,
      params: safeJsonParseObject(bidder.params, null),
    };
  }

  /**
   * Create/Add bidder
   */
  static createBidder(publisherId: string, data: {
    bidderCode: string;
    enabled?: boolean;
    params?: Record<string, unknown>;
    timeoutOverride?: number;
    priority?: number;
  }) {
    const { bidderCode, enabled = true, params, timeoutOverride, priority = 0 } = data;

    // Check for duplicate
    const existing = db.select().from(publisherBidders)
      .where(and(eq(publisherBidders.publisherId, publisherId), eq(publisherBidders.bidderCode, bidderCode)))
      .get();
    if (existing) {
      throw new Error('Bidder already configured for this publisher');
    }

    const now = new Date().toISOString();
    const bidderId = uuidv4();

    db.insert(publisherBidders).values({
      id: bidderId,
      publisherId,
      bidderCode,
      enabled,
      params: params ? JSON.stringify(params) : null,
      timeoutOverride: timeoutOverride || null,
      priority,
      createdAt: now,
      updatedAt: now,
    }).run();

    const newBidder = db.select().from(publisherBidders).where(eq(publisherBidders.id, bidderId)).get();

    return {
      ...newBidder,
      params: safeJsonParseObject(newBidder?.params, null),
    };
  }

  /**
   * Update bidder
   */
  static updateBidder(publisherId: string, bidderId: string, data: {
    enabled?: boolean;
    params?: Record<string, unknown>;
    timeoutOverride?: number;
    priority?: number;
  }) {
    const { enabled, params, timeoutOverride, priority } = data;

    const bidder = db.select().from(publisherBidders)
      .where(and(eq(publisherBidders.id, bidderId), eq(publisherBidders.publisherId, publisherId)))
      .get();

    if (!bidder) {
      return null;
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
      .run();

    const updated = db.select().from(publisherBidders).where(eq(publisherBidders.id, bidderId)).get();

    return {
      ...updated,
      params: safeJsonParseObject(updated?.params, null),
    };
  }

  /**
   * Delete bidder
   */
  static deleteBidder(publisherId: string, bidderId: string) {
    const bidder = db.select().from(publisherBidders)
      .where(and(eq(publisherBidders.id, bidderId), eq(publisherBidders.publisherId, publisherId)))
      .get();

    if (!bidder) {
      return null;
    }

    db.delete(publisherBidders).where(eq(publisherBidders.id, bidderId)).run();
    return bidder;
  }

  /**
   * Copy bidders from one publisher to another
   */
  static copyBidders(targetPublisherId: string, sourcePublisherId: string, userId: string, ipAddress: string, userAgent: string | null) {
    // Get source bidders
    const sourceBidders = db.select().from(publisherBidders)
      .where(eq(publisherBidders.publisherId, sourcePublisherId))
      .all();

    if (sourceBidders.length === 0) {
      throw new Error('Source publisher has no bidders configured');
    }

    // Get existing bidders to avoid duplicates
    const existingBidders = db.select().from(publisherBidders)
      .where(eq(publisherBidders.publisherId, targetPublisherId))
      .all();
    const existingBidderCodes = new Set(existingBidders.map(b => b.bidderCode));

    const now = new Date().toISOString();
    const copiedBidders: typeof sourceBidders = [];
    const skippedBidders: string[] = [];

    for (const bidder of sourceBidders) {
      if (existingBidderCodes.has(bidder.bidderCode)) {
        skippedBidders.push(bidder.bidderCode);
        continue;
      }

      const newBidderId = uuidv4();

      db.insert(publisherBidders).values({
        id: newBidderId,
        publisherId: targetPublisherId,
        bidderCode: bidder.bidderCode,
        enabled: bidder.enabled,
        params: bidder.params,
        timeoutOverride: bidder.timeoutOverride,
        priority: bidder.priority,
        createdAt: now,
        updatedAt: now,
      }).run();

      copiedBidders.push({
        ...bidder,
        id: newBidderId,
        publisherId: targetPublisherId,
      });
    }

    // Get publisher names for audit log
    const sourcePublisher = db.select().from(publishers).where(eq(publishers.id, sourcePublisherId)).get();
    const targetPublisher = db.select().from(publishers).where(eq(publishers.id, targetPublisherId)).get();

    // Log audit entry
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId,
      action: 'COPY_BIDDERS',
      entityType: 'publisher_bidders',
      entityId: targetPublisherId,
      oldValues: null,
      newValues: JSON.stringify({
        fromPublisher: sourcePublisher?.name,
        fromPublisherId: sourcePublisherId,
        toPublisher: targetPublisher?.name,
        copiedCount: copiedBidders.length,
        skippedCount: skippedBidders.length,
        copiedBidders: copiedBidders.map(b => b.bidderCode),
        skippedBidders,
      }),
      ipAddress,
      userAgent,
      createdAt: now,
    }).run();

    return {
      copied: copiedBidders.map(b => ({
        ...b,
        params: safeJsonParseObject(b.params, null),
      })),
      skipped: skippedBidders,
      sourcePublisher: sourcePublisher?.name,
    };
  }
}
