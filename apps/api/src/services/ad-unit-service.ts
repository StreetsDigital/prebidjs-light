/**
 * Ad Unit Service
 *
 * Business logic for ad unit CRUD operations.
 * Handles authorization, validation, and database operations.
 */

import { db, adUnits, websites, auditLogs } from '../db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

export interface AdUnitData {
  id: string;
  websiteId: string;
  code: string;
  name: string;
  mediaTypes: any;
  floorPrice: string | null;
  targeting: any;
  sizeMapping: any;
  status: 'active' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdUnitInput {
  websiteId: string;
  code: string;
  name: string;
  mediaTypes?: string;
  floorPrice?: string;
  targeting?: string;
  sizeMapping?: string;
}

export interface UpdateAdUnitInput {
  code?: string;
  name?: string;
  mediaTypes?: string;
  floorPrice?: string;
  targeting?: string;
  sizeMapping?: string;
  status?: 'active' | 'paused';
}

export interface DuplicateAdUnitInput {
  newCode: string;
  newName: string;
}

export interface AuditContext {
  userId: string;
  ipAddress: string;
  userAgent: string | null;
}

export interface AuthorizationContext {
  role: 'super_admin' | 'admin' | 'publisher';
  publisherId?: string;
}

/**
 * Format ad unit for API response
 */
function formatAdUnit(unit: any): AdUnitData {
  return {
    id: unit.id,
    websiteId: unit.websiteId,
    code: unit.code,
    name: unit.name,
    mediaTypes: safeJsonParseObject(unit.mediaTypes, null),
    floorPrice: unit.floorPrice,
    targeting: safeJsonParseObject(unit.targeting, null),
    sizeMapping: safeJsonParseArray(unit.sizeMapping, null),
    status: unit.status,
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt,
  };
}

/**
 * Get website by ID
 */
export function getWebsiteById(websiteId: string) {
  return db.select()
    .from(websites)
    .where(eq(websites.id, websiteId))
    .get();
}

/**
 * Check if user is authorized to access website
 */
export function isAuthorizedForWebsite(
  auth: AuthorizationContext,
  publisherId: string
): boolean {
  if (auth.role === 'publisher' && auth.publisherId !== publisherId) {
    return false;
  }
  return true;
}

/**
 * Get ad unit by ID
 */
export function getAdUnitById(id: string) {
  return db.select()
    .from(adUnits)
    .where(eq(adUnits.id, id))
    .get();
}

/**
 * List all ad units for a website
 */
export function listAdUnitsByWebsite(websiteId: string): AdUnitData[] {
  const units = db.select()
    .from(adUnits)
    .where(eq(adUnits.websiteId, websiteId))
    .all();

  return units.map(formatAdUnit);
}

/**
 * Check if ad unit code exists for a website
 */
export function adUnitCodeExists(websiteId: string, code: string): boolean {
  const existing = db.select()
    .from(adUnits)
    .where(and(
      eq(adUnits.websiteId, websiteId),
      eq(adUnits.code, code)
    ))
    .get();

  return !!existing;
}

/**
 * Create a new ad unit
 */
export function createAdUnit(
  input: CreateAdUnitInput,
  publisherId: string,
  auditContext: AuditContext
): AdUnitData {
  const adUnitId = uuidv4();
  const now = new Date().toISOString();

  db.insert(adUnits).values({
    id: adUnitId,
    publisherId, // Required for schema
    websiteId: input.websiteId,
    code: input.code,
    name: input.name,
    mediaTypes: input.mediaTypes || null,
    floorPrice: input.floorPrice || null,
    targeting: input.targeting || null,
    sizeMapping: input.sizeMapping || null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }).run();

  // Audit log
  db.insert(auditLogs).values({
    id: uuidv4(),
    userId: auditContext.userId,
    action: 'CREATE_AD_UNIT',
    entityType: 'ad_unit',
    entityId: adUnitId,
    newValues: JSON.stringify({
      websiteId: input.websiteId,
      code: input.code,
      name: input.name
    }),
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
    createdAt: now,
  }).run();

  const created = db.select()
    .from(adUnits)
    .where(eq(adUnits.id, adUnitId))
    .get();

  return formatAdUnit(created);
}

/**
 * Update an existing ad unit
 */
export function updateAdUnit(
  id: string,
  updates: UpdateAdUnitInput,
  existing: any,
  auditContext: AuditContext
): AdUnitData {
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
    .run();

  // Audit log
  db.insert(auditLogs).values({
    id: uuidv4(),
    userId: auditContext.userId,
    action: 'UPDATE_AD_UNIT',
    entityType: 'ad_unit',
    entityId: id,
    oldValues: JSON.stringify(existing),
    newValues: JSON.stringify(updates),
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
    createdAt: now,
  }).run();

  const updated = db.select()
    .from(adUnits)
    .where(eq(adUnits.id, id))
    .get();

  return formatAdUnit(updated);
}

/**
 * Delete an ad unit
 */
export function deleteAdUnit(
  id: string,
  adUnit: any,
  auditContext: AuditContext
): void {
  db.delete(adUnits)
    .where(eq(adUnits.id, id))
    .run();

  // Audit log
  const now = new Date().toISOString();
  db.insert(auditLogs).values({
    id: uuidv4(),
    userId: auditContext.userId,
    action: 'DELETE_AD_UNIT',
    entityType: 'ad_unit',
    entityId: id,
    oldValues: JSON.stringify(adUnit),
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
    createdAt: now,
  }).run();
}

/**
 * Duplicate an ad unit
 */
export function duplicateAdUnit(
  sourceId: string,
  source: any,
  publisherId: string,
  input: DuplicateAdUnitInput,
  auditContext: AuditContext
): AdUnitData {
  const newId = uuidv4();
  const now = new Date().toISOString();

  db.insert(adUnits).values({
    id: newId,
    publisherId, // Required for schema
    websiteId: source.websiteId,
    code: input.newCode,
    name: input.newName,
    mediaTypes: source.mediaTypes,
    floorPrice: source.floorPrice,
    targeting: source.targeting,
    sizeMapping: source.sizeMapping,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }).run();

  // Audit log
  db.insert(auditLogs).values({
    id: uuidv4(),
    userId: auditContext.userId,
    action: 'DUPLICATE_AD_UNIT',
    entityType: 'ad_unit',
    entityId: newId,
    newValues: JSON.stringify({
      sourceId,
      newCode: input.newCode,
      newName: input.newName
    }),
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
    createdAt: now,
  }).run();

  const created = db.select()
    .from(adUnits)
    .where(eq(adUnits.id, newId))
    .get();

  return formatAdUnit(created);
}
