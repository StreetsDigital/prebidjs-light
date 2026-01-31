import fs from 'fs';
import path from 'path';
import { WrapperConfig, RequestAttributes } from './targeting';

// In-memory cache for generated wrappers
interface CacheEntry {
  code: string;
  expires: number;
}

const wrapperCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Embedded config structure that gets injected into wrapper
export interface EmbeddedConfig {
  publisherId: string;
  configId: string;
  configName: string;
  config: {
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
  };
  bidders: any[];
  adUnitDefinitions: Record<string, any>;
  targeting: {
    ruleId?: string;
    matchedAttributes: RequestAttributes;
  };
  version: number;
}

/**
 * Generate cache key from request attributes
 */
export function generateCacheKey(
  publisherId: string,
  attributes: RequestAttributes
): string {
  return `${publisherId}_${attributes.geo || 'none'}_${attributes.device}_${attributes.browser || 'none'}`;
}

/**
 * Get cached wrapper if available and not expired
 */
export function getCachedWrapper(cacheKey: string): string | null {
  const cached = wrapperCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.code;
  }
  // Remove expired entry
  if (cached) {
    wrapperCache.delete(cacheKey);
  }
  return null;
}

/**
 * Store wrapper in cache
 */
export function cacheWrapper(cacheKey: string, code: string): void {
  wrapperCache.set(cacheKey, {
    code,
    expires: Date.now() + CACHE_TTL,
  });
}

/**
 * Invalidate all cache entries for a publisher
 */
export function invalidatePublisherCache(publisherId: string): void {
  const keysToDelete: string[] = [];
  for (const key of wrapperCache.keys()) {
    if (key.startsWith(`${publisherId}_`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => wrapperCache.delete(key));
}

/**
 * Build embedded config object from wrapper config
 */
function buildEmbeddedConfig(
  publisherId: string,
  config: WrapperConfig,
  attributes: RequestAttributes,
  ruleId?: string
): EmbeddedConfig {
  // Parse JSON fields
  const customPriceBucket = config.customPriceBucket ? JSON.parse(config.customPriceBucket) : undefined;
  const userSync = config.userSync ? JSON.parse(config.userSync) : undefined;
  const targetingControls = config.targetingControls ? JSON.parse(config.targetingControls) : undefined;
  const currencyConfig = config.currencyConfig ? JSON.parse(config.currencyConfig) : undefined;
  const consentManagement = config.consentManagement ? JSON.parse(config.consentManagement) : undefined;
  const floorsConfig = config.floorsConfig ? JSON.parse(config.floorsConfig) : undefined;
  const userIdModules = config.userIdModules ? JSON.parse(config.userIdModules) : undefined;
  const videoConfig = config.videoConfig ? JSON.parse(config.videoConfig) : undefined;
  const s2sConfig = config.s2sConfig ? JSON.parse(config.s2sConfig) : undefined;
  const customConfig = config.customConfig ? JSON.parse(config.customConfig) : undefined;
  const bidders = config.bidders ? JSON.parse(config.bidders) : [];
  const adUnits = config.adUnits ? JSON.parse(config.adUnits) : {};

  return {
    publisherId,
    configId: config.id,
    configName: config.name,
    config: {
      bidderTimeout: config.bidderTimeout,
      priceGranularity: config.priceGranularity,
      customPriceBucket,
      enableSendAllBids: config.enableSendAllBids,
      bidderSequence: config.bidderSequence,
      userSync,
      targetingControls,
      currencyConfig,
      consentManagement,
      floorsConfig,
      userIdModules,
      videoConfig,
      s2sConfig,
      debugMode: config.debugMode,
      customConfig,
    },
    bidders,
    adUnitDefinitions: adUnits,
    targeting: {
      ruleId,
      matchedAttributes: attributes,
    },
    version: config.version || 1,
  };
}

/**
 * Generate wrapper script with embedded config
 */
export function generateWrapper(
  publisherId: string,
  config: WrapperConfig,
  attributes: RequestAttributes,
  ruleId?: string
): string {
  // Read base wrapper template
  const wrapperPath = path.join(process.cwd(), '../wrapper/dist/pb.min.js');

  let baseWrapper: string;
  try {
    baseWrapper = fs.readFileSync(wrapperPath, 'utf8');
  } catch (err) {
    // Fallback: try alternative paths
    const altPath1 = path.join(process.cwd(), '../../apps/wrapper/dist/pb.min.js');
    const altPath2 = path.join(process.cwd(), 'apps/wrapper/dist/pb.min.js');

    try {
      baseWrapper = fs.readFileSync(altPath1, 'utf8');
    } catch {
      try {
        baseWrapper = fs.readFileSync(altPath2, 'utf8');
      } catch {
        // If wrapper doesn't exist, return a minimal stub
        console.warn('Wrapper file not found, using stub');
        baseWrapper = '(function(){console.log("Wrapper stub - build wrapper first");})();';
      }
    }
  }

  // Build embedded config
  const embeddedConfig = buildEmbeddedConfig(publisherId, config, attributes, ruleId);

  // Inject config into wrapper
  const wrapper = `
(function(){
window.__PB_CONFIG__=${JSON.stringify(embeddedConfig)};
${baseWrapper}
})();
`.trim();

  return wrapper;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: wrapperCache.size,
    entries: Array.from(wrapperCache.keys()),
  };
}
