import { v4 as uuidv4 } from 'uuid';
import { db, wrapperConfigs, configTargetingRules, configServeLog } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { invalidatePublisherCache } from '../utils/wrapper-generator';

export interface CreateConfigData {
  name: string;
  description?: string;
  status?: 'draft' | 'active' | 'paused' | 'archived';
  isDefault?: boolean;
  websiteId?: string;
  blockWrapper?: boolean;
  bidderTimeout?: number;
  priceGranularity?: string;
  customPriceBucket?: any;
  enableSendAllBids?: boolean;
  bidderSequence?: string;
  userSync?: any;
  targetingControls?: any;
  currencyConfig?: any;
  consentManagement?: any;
  floorsConfig?: any;
  userIdModules?: any;
  videoConfig?: any;
  s2sConfig?: any;
  debugMode?: boolean;
  customConfig?: any;
  bidders?: any[];
  adUnits?: Record<string, any>;
  targetingRules?: {
    conditions: any[];
    matchType: 'all' | 'any';
    priority: number;
  };
}

export interface UpdateConfigData extends Partial<CreateConfigData> {}

export interface WrapperConfig {
  id: string;
  publisherId: string;
  websiteId: string | null;
  name: string;
  description: string | null;
  status: string;
  blockWrapper: boolean;
  bidderTimeout: number | null;
  priceGranularity: string | null;
  customPriceBucket: string | null;
  enableSendAllBids: boolean | null;
  bidderSequence: string | null;
  userSync: string | null;
  targetingControls: string | null;
  currencyConfig: string | null;
  consentManagement: string | null;
  floorsConfig: string | null;
  userIdModules: string | null;
  videoConfig: string | null;
  s2sConfig: string | null;
  debugMode: boolean | null;
  customConfig: string | null;
  bidders: string | null;
  adUnits: string | null;
  version: number;
  isDefault: boolean;
  impressionsServed: number;
  lastServedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigRule {
  id: string;
  configId: string;
  publisherId: string;
  conditions: string;
  matchType: 'all' | 'any';
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigWithRules extends WrapperConfig {
  rules: ConfigRule[];
}

/**
 * List all wrapper configs for a publisher
 */
export async function listConfigs(
  publisherId: string,
  status?: string
): Promise<ConfigWithRules[]> {
  let query = db
    .select({
      config: wrapperConfigs,
      rule: configTargetingRules,
    })
    .from(wrapperConfigs)
    .leftJoin(
      configTargetingRules,
      eq(wrapperConfigs.id, configTargetingRules.configId)
    )
    .where(eq(wrapperConfigs.publisherId, publisherId))
    .$dynamic();

  if (status) {
    query = query.where(eq(wrapperConfigs.status, status as any));
  }

  const results = await query.orderBy(desc(wrapperConfigs.createdAt)).all();

  // Group by config
  const configsMap = new Map<string, ConfigWithRules>();
  for (const row of results) {
    if (!configsMap.has(row.config.id)) {
      configsMap.set(row.config.id, {
        ...row.config,
        rules: [],
      } as ConfigWithRules);
    }
    if (row.rule) {
      configsMap.get(row.config.id)!.rules.push(row.rule as ConfigRule);
    }
  }

  return Array.from(configsMap.values());
}

/**
 * Get a single config by ID
 */
export async function getConfigById(
  publisherId: string,
  configId: string
): Promise<ConfigWithRules | null> {
  const config = await db
    .select()
    .from(wrapperConfigs)
    .where(
      and(
        eq(wrapperConfigs.id, configId),
        eq(wrapperConfigs.publisherId, publisherId)
      )
    )
    .get();

  if (!config) {
    return null;
  }

  // Get targeting rules
  const rules = await db
    .select()
    .from(configTargetingRules)
    .where(eq(configTargetingRules.configId, configId))
    .all();

  return { ...config, rules } as ConfigWithRules;
}

/**
 * Create a new wrapper config
 */
export async function createConfig(
  publisherId: string,
  data: CreateConfigData
): Promise<string> {
  const configId = uuidv4();
  const now = new Date().toISOString();

  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await unsetDefaultConfigs(publisherId);
  }

  // Create config
  await db.insert(wrapperConfigs).values({
    id: configId,
    publisherId,
    websiteId: data.websiteId || null,
    name: data.name,
    description: data.description,
    status: data.status || 'draft',
    blockWrapper: data.blockWrapper || false,
    bidderTimeout: data.bidderTimeout,
    priceGranularity: data.priceGranularity,
    customPriceBucket: data.customPriceBucket ? JSON.stringify(data.customPriceBucket) : null,
    enableSendAllBids: data.enableSendAllBids,
    bidderSequence: data.bidderSequence,
    userSync: data.userSync ? JSON.stringify(data.userSync) : null,
    targetingControls: data.targetingControls ? JSON.stringify(data.targetingControls) : null,
    currencyConfig: data.currencyConfig ? JSON.stringify(data.currencyConfig) : null,
    consentManagement: data.consentManagement ? JSON.stringify(data.consentManagement) : null,
    floorsConfig: data.floorsConfig ? JSON.stringify(data.floorsConfig) : null,
    userIdModules: data.userIdModules ? JSON.stringify(data.userIdModules) : null,
    videoConfig: data.videoConfig ? JSON.stringify(data.videoConfig) : null,
    s2sConfig: data.s2sConfig ? JSON.stringify(data.s2sConfig) : null,
    debugMode: data.debugMode,
    customConfig: data.customConfig ? JSON.stringify(data.customConfig) : null,
    bidders: data.bidders ? JSON.stringify(data.bidders) : null,
    adUnits: data.adUnits ? JSON.stringify(data.adUnits) : null,
    version: 1,
    isDefault: data.isDefault || false,
    createdAt: now,
    updatedAt: now,
  }).run();

  // Create targeting rules if provided
  if (data.targetingRules) {
    await createTargetingRule(configId, publisherId, data.targetingRules);
  }

  // Invalidate cache
  invalidatePublisherCache(publisherId);

  return configId;
}

/**
 * Update an existing wrapper config
 */
export async function updateConfig(
  publisherId: string,
  configId: string,
  data: UpdateConfigData
): Promise<boolean> {
  // Check if config exists
  const existing = await db
    .select()
    .from(wrapperConfigs)
    .where(
      and(
        eq(wrapperConfigs.id, configId),
        eq(wrapperConfigs.publisherId, publisherId)
      )
    )
    .get();

  if (!existing) {
    return false;
  }

  // If setting as default, unset others
  if (data.isDefault) {
    await unsetDefaultConfigs(publisherId);
  }

  // Build updates object
  const updates: any = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.status !== undefined) updates.status = data.status;
  if (data.isDefault !== undefined) updates.isDefault = data.isDefault;
  if (data.websiteId !== undefined) updates.websiteId = data.websiteId;
  if (data.blockWrapper !== undefined) updates.blockWrapper = data.blockWrapper;
  if (data.bidderTimeout !== undefined) updates.bidderTimeout = data.bidderTimeout;
  if (data.priceGranularity !== undefined) updates.priceGranularity = data.priceGranularity;
  if (data.customPriceBucket !== undefined) updates.customPriceBucket = JSON.stringify(data.customPriceBucket);
  if (data.enableSendAllBids !== undefined) updates.enableSendAllBids = data.enableSendAllBids;
  if (data.bidderSequence !== undefined) updates.bidderSequence = data.bidderSequence;
  if (data.userSync !== undefined) updates.userSync = JSON.stringify(data.userSync);
  if (data.targetingControls !== undefined) updates.targetingControls = JSON.stringify(data.targetingControls);
  if (data.currencyConfig !== undefined) updates.currencyConfig = JSON.stringify(data.currencyConfig);
  if (data.consentManagement !== undefined) updates.consentManagement = JSON.stringify(data.consentManagement);
  if (data.floorsConfig !== undefined) updates.floorsConfig = JSON.stringify(data.floorsConfig);
  if (data.userIdModules !== undefined) updates.userIdModules = JSON.stringify(data.userIdModules);
  if (data.videoConfig !== undefined) updates.videoConfig = JSON.stringify(data.videoConfig);
  if (data.s2sConfig !== undefined) updates.s2sConfig = JSON.stringify(data.s2sConfig);
  if (data.debugMode !== undefined) updates.debugMode = data.debugMode;
  if (data.customConfig !== undefined) updates.customConfig = JSON.stringify(data.customConfig);
  if (data.bidders !== undefined) updates.bidders = JSON.stringify(data.bidders);
  if (data.adUnits !== undefined) updates.adUnits = JSON.stringify(data.adUnits);

  await db
    .update(wrapperConfigs)
    .set(updates)
    .where(eq(wrapperConfigs.id, configId))
    .run();

  // Update targeting rules if provided
  if (data.targetingRules) {
    // Delete existing rules
    await db
      .delete(configTargetingRules)
      .where(eq(configTargetingRules.configId, configId))
      .run();

    // Create new rule
    await createTargetingRule(configId, publisherId, data.targetingRules);
  }

  // Invalidate cache
  invalidatePublisherCache(publisherId);

  return true;
}

/**
 * Delete a wrapper config
 */
export async function deleteConfig(
  publisherId: string,
  configId: string
): Promise<boolean> {
  const result = await db
    .delete(wrapperConfigs)
    .where(
      and(
        eq(wrapperConfigs.id, configId),
        eq(wrapperConfigs.publisherId, publisherId)
      )
    )
    .run();

  if (result.changes === 0) {
    return false;
  }

  // Invalidate cache
  invalidatePublisherCache(publisherId);

  return true;
}

/**
 * Duplicate a wrapper config
 */
export async function duplicateConfig(
  publisherId: string,
  configId: string,
  newName?: string
): Promise<string | null> {
  const original = await db
    .select()
    .from(wrapperConfigs)
    .where(
      and(
        eq(wrapperConfigs.id, configId),
        eq(wrapperConfigs.publisherId, publisherId)
      )
    )
    .get();

  if (!original) {
    return null;
  }

  // Get original rules
  const originalRules = await db
    .select()
    .from(configTargetingRules)
    .where(eq(configTargetingRules.configId, configId))
    .all();

  // Create duplicate
  const newConfigId = uuidv4();
  const now = new Date().toISOString();

  await db.insert(wrapperConfigs).values({
    ...original,
    id: newConfigId,
    name: newName || `${original.name} (Copy)`,
    status: 'draft', // Always start as draft
    isDefault: false, // Never default
    impressionsServed: 0,
    lastServedAt: null,
    createdAt: now,
    updatedAt: now,
  }).run();

  // Duplicate rules
  for (const rule of originalRules) {
    const newRuleId = uuidv4();
    await db.insert(configTargetingRules).values({
      ...rule,
      id: newRuleId,
      configId: newConfigId,
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  return newConfigId;
}

/**
 * Update config status
 */
export async function updateConfigStatus(
  publisherId: string,
  configId: string,
  status: 'draft' | 'active' | 'paused' | 'archived'
): Promise<boolean> {
  const result = await db
    .update(wrapperConfigs)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(wrapperConfigs.id, configId),
        eq(wrapperConfigs.publisherId, publisherId)
      )
    )
    .run();

  if (result.changes === 0) {
    return false;
  }

  // Invalidate cache
  invalidatePublisherCache(publisherId);

  return true;
}

/**
 * Get analytics for a config
 */
export async function getConfigAnalytics(
  publisherId: string,
  configId: string,
  days: number = 7
) {
  const config = await db
    .select()
    .from(wrapperConfigs)
    .where(
      and(
        eq(wrapperConfigs.id, configId),
        eq(wrapperConfigs.publisherId, publisherId)
      )
    )
    .get();

  if (!config) {
    return null;
  }

  // Get serve logs for the period
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const logs = await db
    .select()
    .from(configServeLog)
    .where(
      and(
        eq(configServeLog.configId, configId),
        eq(configServeLog.publisherId, publisherId)
      )
    )
    .all();

  // Aggregate by day, geo, device
  const byDay: Record<string, number> = {};
  const byGeo: Record<string, number> = {};
  const byDevice: Record<string, number> = {};

  for (const log of logs) {
    const date = log.timestamp.split('T')[0];
    byDay[date] = (byDay[date] || 0) + 1;

    if (log.geo) {
      byGeo[log.geo] = (byGeo[log.geo] || 0) + 1;
    }

    if (log.device) {
      byDevice[log.device] = (byDevice[log.device] || 0) + 1;
    }
  }

  return {
    config,
    totalServed: config.impressionsServed,
    lastServedAt: config.lastServedAt,
    byDay,
    byGeo,
    byDevice,
  };
}

/**
 * Helper: Unset all default configs for a publisher
 */
async function unsetDefaultConfigs(publisherId: string): Promise<void> {
  await db
    .update(wrapperConfigs)
    .set({ isDefault: false })
    .where(
      and(
        eq(wrapperConfigs.publisherId, publisherId),
        eq(wrapperConfigs.isDefault, true)
      )
    )
    .run();
}

/**
 * Helper: Create a targeting rule
 */
async function createTargetingRule(
  configId: string,
  publisherId: string,
  ruleData: {
    conditions: any[];
    matchType: 'all' | 'any';
    priority: number;
  }
): Promise<void> {
  const ruleId = uuidv4();
  const now = new Date().toISOString();

  await db.insert(configTargetingRules).values({
    id: ruleId,
    configId,
    publisherId,
    conditions: JSON.stringify(ruleData.conditions),
    matchType: ruleData.matchType,
    priority: ruleData.priority || 0,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }).run();
}
