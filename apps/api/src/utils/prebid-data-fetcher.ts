/**
 * Prebid Component Data Fetcher
 *
 * Fetches and caches Prebid.js component data from official sources:
 * - Bidders: https://docs.prebid.org/dev-docs/bidder-data.csv (700+)
 * - Modules/Analytics: https://cdn.jsdelivr.net/npm/prebid.js@latest/dist/chunks/dependencies.json (250+)
 *
 * Data is fetched on startup and cached in memory for fast access.
 */

import { parse } from 'csv-parse/sync';

// TypeScript interfaces for Prebid components
export interface PrebidBidder {
  type: 'bidder';
  code: string;
  name: string;
  clientAdapter: boolean;
  serverAdapter: boolean;
  banner: boolean;
  video: boolean;
  native: boolean;
  deals: boolean;
  userIds: boolean;
  floors: boolean;
  fpd: boolean;
  tcfeu: boolean;
  coppa: boolean;
  gpp: boolean;
  usp: boolean;
  documentationUrl: string;
}

export interface PrebidModule {
  type: 'module';
  code: string;
  name: string;
  category: 'recommended' | 'userId' | 'rtd' | 'general' | 'vendor';
  dependencies: string[];
  documentationUrl: string;
}

export interface PrebidAnalytics {
  type: 'analytics';
  code: string;
  name: string;
  dependencies: string[];
  documentationUrl: string;
}

export type PrebidComponent = PrebidBidder | PrebidModule | PrebidAnalytics;

// In-memory cache
let biddersCache: PrebidBidder[] = [];
let modulesCache: PrebidModule[] = [];
let analyticsCache: PrebidAnalytics[] = [];
let lastFetchTime: Date | null = null;
let isFetching = false;

// Recommended modules (core Prebid functionality)
const RECOMMENDED_MODULE_CODES = [
  'dfpAdServerVideo', // GPT integration
  'consentManagement', // GDPR
  'consentManagementUsp', // CCPA
  'gppControl', // GPP
  'tcfControl', // TCF EU
  'priceFloors' // Price floors
];

/**
 * Fetch bidder data from Prebid.org CSV
 */
async function fetchBidderData(): Promise<PrebidBidder[]> {
  try {
    const response = await fetch('https://docs.prebid.org/dev-docs/bidder-data.csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch bidder CSV: ${response.statusText}`);
    }

    const csvText = await response.text();

    // Parse CSV with headers
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    // Transform CSV records to PrebidBidder objects
    const bidders: PrebidBidder[] = records.map((row: any) => {
      const code = row['bidder-code'] || row['bidderCode'] || '';

      return {
        type: 'bidder',
        code,
        name: row['bidder-name'] || row['bidderName'] || code,
        clientAdapter: row['client-adapter'] === 'yes' || row['clientAdapter'] === 'yes',
        serverAdapter: row['server-adapter'] === 'yes' || row['serverAdapter'] === 'yes',
        banner: row['banner'] === 'yes',
        video: row['video'] === 'yes',
        native: row['native'] === 'yes',
        deals: row['deals'] === 'yes',
        userIds: row['user-ids'] === 'yes' || row['userIds'] === 'yes',
        floors: row['floors'] === 'yes',
        fpd: row['fpd'] === 'yes',
        tcfeu: row['tcfeu'] === 'yes',
        coppa: row['coppa'] === 'yes',
        gpp: row['gpp'] === 'yes',
        usp: row['usp'] === 'yes',
        documentationUrl: `https://docs.prebid.org/dev-docs/bidders/${code}.html`
      };
    });

    return bidders;
  } catch (error) {
    console.error('❌ Error fetching bidder data:', error);
    // Return empty array on error, fallback to cached data
    return [];
  }
}

/**
 * Fetch module and analytics data from Prebid.js dependencies.json
 */
async function fetchModuleData(): Promise<{ modules: PrebidModule[], analytics: PrebidAnalytics[] }> {
  try {
    const response = await fetch('https://cdn.jsdelivr.net/npm/prebid.js@latest/dist/chunks/dependencies.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch dependencies JSON: ${response.statusText}`);
    }

    const data = await response.json();

    const modules: PrebidModule[] = [];
    const analytics: PrebidAnalytics[] = [];

    // Parse dependency graph to extract modules and analytics
    for (const [key, value] of Object.entries(data)) {
      const deps = Array.isArray(value) ? value : [];

      // Determine module type from filename pattern
      if (key.includes('AnalyticsAdapter')) {
        // Analytics adapter
        const code = key.replace(/AnalyticsAdapter.*$/, '').replace(/^.*\//, '');
        analytics.push({
          type: 'analytics',
          code,
          name: formatName(code),
          dependencies: deps,
          documentationUrl: `https://docs.prebid.org/overview/analytics.html#${code}`
        });
      } else if (key.includes('BidAdapter')) {
        // Skip - these are bidders, already handled by CSV
        continue;
      } else if (key.includes('RtdProvider') || key.includes('IdSystem') || key.includes('modules/')) {
        // Module
        const code = key.replace(/.*modules\//, '').replace(/\.js$/, '');
        const category = categorizeModule(code, key);

        modules.push({
          type: 'module',
          code,
          name: formatName(code),
          category,
          dependencies: deps,
          documentationUrl: `https://docs.prebid.org/dev-docs/modules/${code}.html`
        });
      }
    }

    return { modules, analytics };
  } catch (error) {
    console.error('❌ Error fetching module data:', error);
    return { modules: [], analytics: [] };
  }
}

/**
 * Categorize a module based on its code and filename
 */
function categorizeModule(code: string, filename: string): PrebidModule['category'] {
  if (RECOMMENDED_MODULE_CODES.includes(code)) {
    return 'recommended';
  }
  if (filename.includes('IdSystem') || code.includes('Id') || code.includes('id')) {
    return 'userId';
  }
  if (filename.includes('RtdProvider') || code.includes('Rtd')) {
    return 'rtd';
  }
  if (code.includes('dfp') || code.includes('gam') || code.includes('google')) {
    return 'vendor';
  }
  return 'general';
}

/**
 * Format module code into human-readable name
 */
function formatName(code: string): string {
  // Convert camelCase or snake_case to Title Case
  return code
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Fetch all Prebid component data and update cache
 */
export async function fetchPrebidData(): Promise<void> {
  if (isFetching) {
    // Fetch already in progress, skipping
    return;
  }

  isFetching = true;

  try {
    // Fetch bidders and modules in parallel
    const [bidders, moduleData] = await Promise.all([
      fetchBidderData(),
      fetchModuleData()
    ]);

    // Update cache only if fetch succeeded
    if (bidders.length > 0) {
      biddersCache = bidders;
    }
    if (moduleData.modules.length > 0) {
      modulesCache = moduleData.modules;
    }
    if (moduleData.analytics.length > 0) {
      analyticsCache = moduleData.analytics;
    }

    lastFetchTime = new Date();
  } catch (error) {
    console.error('❌ Error fetching Prebid data:', error);
  } finally {
    isFetching = false;
  }
}

/**
 * Get all bidders (700+)
 */
export function getAllBidders(): PrebidBidder[] {
  return biddersCache;
}

/**
 * Get all modules (200+)
 */
export function getAllModules(): PrebidModule[] {
  return modulesCache;
}

/**
 * Get all analytics adapters (50+)
 */
export function getAllAnalytics(): PrebidAnalytics[] {
  return analyticsCache;
}

/**
 * Get recommended modules (core Prebid functionality)
 */
export function getRecommendedModules(): PrebidModule[] {
  return modulesCache.filter(m => m.category === 'recommended');
}

/**
 * Search components by query and optional type filter
 */
export function searchComponents(
  query: string,
  type?: 'bidder' | 'module' | 'analytics'
): PrebidComponent[] {
  const lowerQuery = query.toLowerCase();
  const results: PrebidComponent[] = [];

  if (!type || type === 'bidder') {
    const matchingBidders = biddersCache.filter(
      b => b.code.toLowerCase().includes(lowerQuery) ||
           b.name.toLowerCase().includes(lowerQuery)
    );
    results.push(...matchingBidders);
  }

  if (!type || type === 'module') {
    const matchingModules = modulesCache.filter(
      m => m.code.toLowerCase().includes(lowerQuery) ||
           m.name.toLowerCase().includes(lowerQuery)
    );
    results.push(...matchingModules);
  }

  if (!type || type === 'analytics') {
    const matchingAnalytics = analyticsCache.filter(
      a => a.code.toLowerCase().includes(lowerQuery) ||
           a.name.toLowerCase().includes(lowerQuery)
    );
    results.push(...matchingAnalytics);
  }

  return results;
}

/**
 * Get component info by code and type
 */
export function getComponentInfo(
  code: string,
  type: 'bidder' | 'module' | 'analytics'
): PrebidComponent | null {
  switch (type) {
    case 'bidder':
      return biddersCache.find(b => b.code === code) || null;
    case 'module':
      return modulesCache.find(m => m.code === code) || null;
    case 'analytics':
      return analyticsCache.find(a => a.code === code) || null;
    default:
      return null;
  }
}

/**
 * Get cache status
 */
export function getCacheStatus(): {
  biddersCount: number;
  modulesCount: number;
  analyticsCount: number;
  lastFetchTime: Date | null;
  isFetching: boolean;
} {
  return {
    biddersCount: biddersCache.length,
    modulesCount: modulesCache.length,
    analyticsCount: analyticsCache.length,
    lastFetchTime,
    isFetching
  };
}

/**
 * Schedule periodic refresh (every 24 hours)
 */
export function startPeriodicRefresh(): void {
  const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  setInterval(async () => {
    await fetchPrebidData();
  }, REFRESH_INTERVAL);
}
