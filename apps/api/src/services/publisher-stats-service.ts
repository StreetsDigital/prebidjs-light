import { db, publisherConfig, configVersions, users } from '../db';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

export interface UserIdModuleConfig {
  code: string;
  enabled: boolean;
  config: Record<string, string>;
}

export interface ConsentManagementConfig {
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

export interface FloorRule {
  id: string;
  type: 'mediaType' | 'bidder' | 'adUnit';
  value: string;
  floor: number;
}

export interface PriceFloorsConfig {
  enabled: boolean;
  defaultFloor: number;
  currency: string;
  enforcement: {
    floorDeals: boolean;
    bidAdjustment: boolean;
  };
  rules: FloorRule[];
}

export interface UpdateConfigData {
  bidderTimeout?: number;
  priceGranularity?: string;
  enableSendAllBids?: boolean;
  bidderSequence?: string;
  debugMode?: boolean;
  userIdModules?: UserIdModuleConfig[];
  consentManagement?: ConsentManagementConfig;
  floorsConfig?: PriceFloorsConfig;
}

export class PublisherStatsService {
  /**
   * Get publisher config
   */
  static getConfig(publisherId: string) {
    const config = db.select().from(publisherConfig).where(eq(publisherConfig.publisherId, publisherId)).get();

    if (!config) {
      return null;
    }

    return {
      ...config,
      userIdModules: safeJsonParseArray(config.userIdModules, []),
      consentManagement: safeJsonParseObject(config.consentManagement, null),
      floorsConfig: safeJsonParseObject(config.floorsConfig, null),
    };
  }

  /**
   * Update publisher config
   */
  static updateConfig(publisherId: string, data: UpdateConfigData, userId: string) {
    const {
      bidderTimeout,
      priceGranularity,
      enableSendAllBids,
      bidderSequence,
      debugMode,
      userIdModules,
      consentManagement,
      floorsConfig,
    } = data;

    const config = db.select().from(publisherConfig).where(eq(publisherConfig.publisherId, publisherId)).get();
    if (!config) {
      return null;
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
      const currentModules = safeJsonParseArray(config.userIdModules, []);
      const enabledModules = userIdModules.filter(m => m.enabled).map(m => m.code);
      const previousEnabled = currentModules.filter((m: UserIdModuleConfig) => m.enabled).map((m: UserIdModuleConfig) => m.code);
      if (JSON.stringify(enabledModules.sort()) !== JSON.stringify(previousEnabled.sort())) {
        changes.push(`userIdModules: ${previousEnabled.length > 0 ? previousEnabled.join(', ') : 'none'} → ${enabledModules.length > 0 ? enabledModules.join(', ') : 'none'}`);
      }
    }
    if (consentManagement !== undefined) {
      const currentConsent = safeJsonParseObject(config.consentManagement, null);
      const gdprEnabled = consentManagement?.gdpr?.enabled || false;
      const previousGdprEnabled = currentConsent?.gdpr?.enabled || false;
      if (gdprEnabled !== previousGdprEnabled) {
        changes.push(`GDPR: ${previousGdprEnabled ? 'enabled' : 'disabled'} → ${gdprEnabled ? 'enabled' : 'disabled'}`);
      }
    }
    if (floorsConfig !== undefined) {
      const currentFloors = safeJsonParseObject(config.floorsConfig, null);
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
      publisherId,
      version: config.version || 1,
      configSnapshot: JSON.stringify({
        bidderTimeout: config.bidderTimeout,
        priceGranularity: config.priceGranularity,
        enableSendAllBids: config.enableSendAllBids,
        bidderSequence: config.bidderSequence,
        debugMode: config.debugMode,
      }),
      changedBy: userId,
      changeSummary: changes.length > 0 ? changes.join(', ') : 'Configuration updated',
      createdAt: now,
    }).run();

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
      .where(eq(publisherConfig.publisherId, publisherId))
      .run();

    const updated = db.select().from(publisherConfig).where(eq(publisherConfig.publisherId, publisherId)).get();

    return {
      ...updated,
      userIdModules: safeJsonParseArray(updated?.userIdModules, []),
      consentManagement: safeJsonParseObject(updated?.consentManagement, null),
      floorsConfig: safeJsonParseObject(updated?.floorsConfig, null),
    };
  }

  /**
   * Get config version history
   */
  static getConfigVersions(publisherId: string) {
    const versions = db.select().from(configVersions)
      .where(eq(configVersions.publisherId, publisherId))
      .orderBy(desc(configVersions.version))
      .all();

    const currentConfig = db.select().from(publisherConfig).where(eq(publisherConfig.publisherId, publisherId)).get();

    // Get user names
    const userMap = new Map<string, string>();
    const uniqueUserIds = new Set(versions.map(v => v.changedBy).filter(Boolean));
    const userIds = Array.from(uniqueUserIds);
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
        config: safeJsonParseObject(v.configSnapshot, {}),
        changedBy: v.changedBy ? userMap.get(v.changedBy) || 'Unknown' : 'System',
        changeSummary: v.changeSummary,
        createdAt: v.createdAt,
      })),
    };
  }

  /**
   * Rollback to a specific config version
   */
  static rollbackConfig(publisherId: string, versionId: string, userId: string) {
    const targetVersion = db.select().from(configVersions)
      .where(eq(configVersions.id, versionId))
      .get();

    if (!targetVersion) {
      return null;
    }

    const targetConfig = safeJsonParseObject(targetVersion.configSnapshot, {}) as any;
    const currentConfig = db.select().from(publisherConfig).where(eq(publisherConfig.publisherId, publisherId)).get();

    if (!currentConfig) {
      return null;
    }

    const newVersion = (currentConfig.version || 1) + 1;

    // Save current config before rollback
    db.insert(configVersions).values({
      id: crypto.randomUUID(),
      publisherId,
      version: currentConfig.version || 1,
      configSnapshot: JSON.stringify({
        bidderTimeout: currentConfig.bidderTimeout,
        priceGranularity: currentConfig.priceGranularity,
        enableSendAllBids: currentConfig.enableSendAllBids,
        bidderSequence: currentConfig.bidderSequence,
        debugMode: currentConfig.debugMode,
      }),
      changeSummary: `Rollback to version ${targetVersion.version}`,
      changedBy: userId,
      createdAt: new Date().toISOString(),
    }).run();

    // Update config with target version values
    db.update(publisherConfig)
      .set({
        bidderTimeout: targetConfig.bidderTimeout as number,
        priceGranularity: targetConfig.priceGranularity as string,
        enableSendAllBids: targetConfig.enableSendAllBids as boolean,
        bidderSequence: targetConfig.bidderSequence as string,
        debugMode: targetConfig.debugMode as boolean,
        version: newVersion,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(publisherConfig.publisherId, publisherId))
      .run();

    return {
      newVersion,
      targetVersion: targetVersion.version,
      currentVersion: currentConfig.version,
    };
  }
}
