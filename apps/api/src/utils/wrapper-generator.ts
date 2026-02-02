import fs from 'fs';
import path from 'path';
import { WrapperConfig, RequestAttributes } from './targeting';
import { safeJsonParseObject, safeJsonParseArray } from './safe-json';
import { TIMEOUTS } from '../constants/timeouts';

// In-memory cache for generated wrappers
interface CacheEntry {
  code: string;
  expires: number;
  timestamp: number;
}

const wrapperCache = new Map<string, CacheEntry>();
const CACHE_TTL = TIMEOUTS.CACHE_TTL;
const CACHE_MAX_SIZE = 1000;
const CLEANUP_INTERVAL = TIMEOUTS.CLEANUP_INTERVAL;

// Periodic cache cleanup to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(wrapperCache.entries());

  // Remove expired entries
  for (const [key, entry] of entries) {
    if (now > entry.expires) {
      wrapperCache.delete(key);
    }
  }

  // If still too large, remove oldest entries
  if (wrapperCache.size > CACHE_MAX_SIZE) {
    const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = sorted.slice(0, wrapperCache.size - CACHE_MAX_SIZE);
    toRemove.forEach(([key]) => wrapperCache.delete(key));
  }
}, CLEANUP_INTERVAL);

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
  const now = Date.now();
  wrapperCache.set(cacheKey, {
    code,
    expires: now + CACHE_TTL,
    timestamp: now,
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
  const customPriceBucket = safeJsonParseObject(config.customPriceBucket, undefined);
  const userSync = safeJsonParseObject(config.userSync, undefined);
  const targetingControls = safeJsonParseObject(config.targetingControls, undefined);
  const currencyConfig = safeJsonParseObject(config.currencyConfig, undefined);
  const consentManagement = safeJsonParseObject(config.consentManagement, undefined);
  const floorsConfig = safeJsonParseObject(config.floorsConfig, undefined);
  const userIdModules = safeJsonParseArray(config.userIdModules, undefined);
  const videoConfig = safeJsonParseObject(config.videoConfig, undefined);
  const s2sConfig = safeJsonParseObject(config.s2sConfig, undefined);
  const customConfig = safeJsonParseObject(config.customConfig, undefined);
  const bidders = safeJsonParseArray(config.bidders, []);
  const adUnits = safeJsonParseObject(config.adUnits, {});

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
        baseWrapper = '(function(){/* Wrapper stub - build wrapper first */})();';
      }
    }
  }

  // Build embedded config
  const embeddedConfig = buildEmbeddedConfig(publisherId, config, attributes, ruleId);

  // Generate Prebid.js loader
  const prebidLoader = `
// Load publisher's optimized Prebid.js build
(function loadPrebid(){
  if(typeof window==='undefined')return;
  var s=document.createElement('script');
  s.src='/builds/${publisherId}/prebid.js';
  s.async=true;
  s.onerror=function(){
    console.error('pb: Failed to load Prebid.js build');
    // Fallback to CDN Prebid.js
    var fallback=document.createElement('script');
    fallback.src='https://cdn.jsdelivr.net/npm/prebid.js@latest/dist/prebid.js';
    fallback.async=true;
    document.head.appendChild(fallback);
  };
  document.head.appendChild(s);
})();
`;

  // Inject config + Prebid.js loader + wrapper
  const wrapper = `
(function(){
window.__PB_CONFIG__=${JSON.stringify(embeddedConfig)};
${prebidLoader}
${baseWrapper}
})();
`.trim();

  return wrapper;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: wrapperCache.size,
    entries: Array.from(wrapperCache.keys()),
  };
}
