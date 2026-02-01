/**
 * pbjs_engine Publisher Wrapper v2.0
 *
 * NEW ARCHITECTURE: Config is embedded directly in the wrapper script by the server.
 * This eliminates the 50-200ms config API fetch for 3-4x faster auction starts.
 */

// Embedded config interface (injected by server)
// Dynamic IDs: per-bidder params specific to an ad unit
// Keys are bidder codes, values are bidder-specific params (placement_id, site_id, etc.)
type DynamicBidderIds = Record<string, Record<string, any>>;

interface AdUnitDefinition {
  mediaTypes: any;
  bids?: any[];
  // Dynamic IDs - per-ad-unit bidder parameters
  // When present, these params override/supplement publisher-level bidder params
  bidders?: DynamicBidderIds;
}

interface EmbeddedConfig {
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
  bidders: Array<{
    bidderCode: string;
    params: any;
    timeoutOverride?: number;
    priority?: number;
  }>;
  adUnitDefinitions: Record<string, AdUnitDefinition>;
  targeting: {
    ruleId?: string;
    matchedAttributes: {
      geo: string | null;
      device: string;
      browser: string | null;
      os: string | null;
    };
  };
  version: number;
}

interface PbEventCallback {
  (data: unknown): void;
}

interface PbNamespace {
  init: () => Promise<void>;
  requestBids: (adUnitCodes: string[]) => void;
  autoRequestBids: () => void;
  refresh: (adUnitCodes?: string[]) => void;
  getConfig: () => EmbeddedConfig | null;
  setConfig: (config: Partial<unknown>) => void;
  on: (event: string, callback: PbEventCallback) => void;
  off: (event: string, callback?: PbEventCallback) => void;
  version: string;
  publisherId: string;
  pbjs: typeof window.pbjs | null;
}

declare global {
  interface Window {
    __PB_CONFIG__: EmbeddedConfig;
    pb: PbNamespace;
    pbjs: {
      que: Array<() => void>;
      setConfig: (config: unknown) => void;
      addAdUnits: (adUnits: unknown[]) => void;
      requestBids: (options: unknown) => void;
      setTargetingForGPTAsync: (adUnitCodes?: string[]) => void;
      getConfig: () => unknown;
      onEvent: (event: string, callback: PbEventCallback) => void;
      offEvent: (event: string, callback?: PbEventCallback) => void;
      renderAd: (doc: Document, id: string) => void;
    };
    googletag: {
      cmd: Array<() => void>;
      pubads: () => {
        refresh: (slots?: unknown[]) => void;
        enableSingleRequest: () => void;
      };
      enableServices: () => void;
      display: (adUnitCode: string) => void;
    };
  }
}

/**
 * Get embedded config (injected by server - 0ms fetch!)
 */
function getEmbeddedConfig(): EmbeddedConfig {
  if (!window.__PB_CONFIG__) {
    throw new Error('pb: Config not found. Ensure wrapper was loaded correctly from server.');
  }
  return window.__PB_CONFIG__;
}

// Event system
const eventListeners: Map<string, Set<PbEventCallback>> = new Map();

function addEventListener(event: string, callback: PbEventCallback): void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)!.add(callback);
}

function removeEventListener(event: string, callback?: PbEventCallback): void {
  if (callback) {
    eventListeners.get(event)?.delete(callback);
  } else {
    eventListeners.delete(event);
  }
}

function emitEvent(event: string, data: unknown): void {
  eventListeners.get(event)?.forEach((callback) => {
    try {
      callback(data);
    } catch (e) {
      console.error('pb: Event callback error', e);
    }
  });
}

// Analytics batching
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 30000;
let batchQueue: unknown[] = [];
let batchTimer: number | null = null;

function sendBatch(): void {
  if (batchQueue.length === 0) return;

  try {
    const config = getEmbeddedConfig();
    const payload = JSON.stringify(batchQueue);
    const url = `/api/analytics/batch`;

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, payload);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(e => console.error('pb: Beacon error', e));
    }

    batchQueue = [];

    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
  } catch (e) {
    console.error('pb: Batch send error', e);
  }
}

function queueAnalyticsEvent(event: unknown): void {
  batchQueue.push(event);

  if (batchQueue.length >= BATCH_SIZE) {
    sendBatch();
    return;
  }

  if (!batchTimer) {
    batchTimer = window.setTimeout(() => {
      sendBatch();
    }, BATCH_INTERVAL);
  }
}

// Flush batch on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      sendBatch();
    }
  });

  window.addEventListener('pagehide', () => {
    sendBatch();
  });

  window.addEventListener('beforeunload', () => {
    sendBatch();
  });
}

/**
 * Build bids array for an ad unit, using Dynamic IDs when available.
 *
 * Strategy:
 * 1. If the ad unit has Dynamic IDs (`bidders` map), use those per-bidder params
 *    for each publisher-level bidder that has a matching entry. Bidders without
 *    a Dynamic ID entry still get included with publisher-level default params.
 * 2. If no Dynamic IDs are present, all publisher-level bidders are included
 *    with their default params (backward-compatible behavior).
 *
 * This allows granular per-ad-unit bidder configuration while maintaining
 * publisher-level defaults as a fallback.
 */
function buildBidsForAdUnit(
  definition: AdUnitDefinition,
  publisherBidders: Array<{ bidderCode: string; params: any }>
): Array<{ bidder: string; params: any }> {
  const dynamicIds = definition.bidders;

  // If ad unit has explicit bids defined, use those directly (legacy support)
  if (definition.bids && definition.bids.length > 0) {
    return definition.bids;
  }

  // If no Dynamic IDs, use publisher-level bidder params for all bidders
  if (!dynamicIds || Object.keys(dynamicIds).length === 0) {
    return publisherBidders.map(bidder => ({
      bidder: bidder.bidderCode,
      params: bidder.params,
    }));
  }

  // Dynamic IDs present: build bids with per-ad-unit params
  const bids: Array<{ bidder: string; params: any }> = [];

  for (const bidder of publisherBidders) {
    const adUnitParams = dynamicIds[bidder.bidderCode];

    if (adUnitParams) {
      // Use Dynamic IDs for this bidder (ad-unit-specific params)
      bids.push({
        bidder: bidder.bidderCode,
        params: adUnitParams,
      });
    } else {
      // No Dynamic ID for this bidder - use publisher-level defaults
      bids.push({
        bidder: bidder.bidderCode,
        params: bidder.params,
      });
    }
  }

  // Also include bidders that are ONLY in Dynamic IDs (not in publisher-level)
  // This allows ad units to add bidders beyond the publisher defaults
  for (const bidderCode of Object.keys(dynamicIds)) {
    const alreadyIncluded = publisherBidders.some(b => b.bidderCode === bidderCode);
    if (!alreadyIncluded) {
      bids.push({
        bidder: bidderCode,
        params: dynamicIds[bidderCode],
      });
    }
  }

  return bids;
}

// Create pb namespace
function createPbNamespace(): PbNamespace {
  let embeddedConfig: EmbeddedConfig | null = null;
  let initialized = false;

  const pb: PbNamespace = {
    version: '2.0.0',

    get publisherId() {
      return embeddedConfig?.publisherId || '';
    },

    get pbjs() {
      return window.pbjs || null;
    },

    /**
     * Initialize Prebid with embedded config (0ms - config already in memory!)
     */
    async init() {
      if (initialized) {
        console.warn('pb: Already initialized');
        return;
      }

      try {
        // Get embedded config (instant - no API call needed!)
        embeddedConfig = getEmbeddedConfig();

        if (embeddedConfig.config.debugMode) {
          console.log('pb: Initializing with config:', embeddedConfig.configName);
          console.log('pb: Matched attributes:', embeddedConfig.targeting.matchedAttributes);
        }

        // Initialize Prebid.js
        window.pbjs = window.pbjs || { que: [] };
        window.pbjs.que.push(() => {
          // Apply configuration
          const pbConfig: any = {};

          if (embeddedConfig!.config.bidderTimeout) pbConfig.bidderTimeout = embeddedConfig!.config.bidderTimeout;
          if (embeddedConfig!.config.priceGranularity) pbConfig.priceGranularity = embeddedConfig!.config.priceGranularity;
          if (embeddedConfig!.config.customPriceBucket) pbConfig.priceGranularity = embeddedConfig!.config.customPriceBucket;
          if (embeddedConfig!.config.enableSendAllBids !== undefined) pbConfig.enableSendAllBids = embeddedConfig!.config.enableSendAllBids;
          if (embeddedConfig!.config.bidderSequence) pbConfig.bidderSequence = embeddedConfig!.config.bidderSequence;
          if (embeddedConfig!.config.userSync) pbConfig.userSync = embeddedConfig!.config.userSync;
          if (embeddedConfig!.config.targetingControls) pbConfig.targetingControls = embeddedConfig!.config.targetingControls;
          if (embeddedConfig!.config.currencyConfig) pbConfig.currency = embeddedConfig!.config.currencyConfig;
          if (embeddedConfig!.config.consentManagement) pbConfig.consentManagement = embeddedConfig!.config.consentManagement;
          if (embeddedConfig!.config.floorsConfig) pbConfig.floors = embeddedConfig!.config.floorsConfig;
          if (embeddedConfig!.config.userIdModules) pbConfig.userSync = { ...pbConfig.userSync, userIds: embeddedConfig!.config.userIdModules };
          if (embeddedConfig!.config.videoConfig) pbConfig.video = embeddedConfig!.config.videoConfig;
          if (embeddedConfig!.config.s2sConfig) pbConfig.s2sConfig = embeddedConfig!.config.s2sConfig;
          if (embeddedConfig!.config.debugMode) pbConfig.debug = embeddedConfig!.config.debugMode;
          if (embeddedConfig!.config.customConfig) Object.assign(pbConfig, embeddedConfig!.config.customConfig);

          window.pbjs.setConfig(pbConfig);

          // Note: Ad units are NOT loaded automatically
          // Publisher must call requestBids() or autoRequestBids() to load specific ad units

          // Set up event tracking
          const events = [
            'auctionInit', 'auctionEnd', 'bidRequested', 'bidResponse',
            'bidWon', 'bidTimeout', 'noBid', 'adRenderSucceeded', 'adRenderFailed',
          ];

          events.forEach((event) => {
            window.pbjs.onEvent(event, (data) => {
              emitEvent(event, data);
              queueAnalyticsEvent({
                eventType: event,
                publisherId: embeddedConfig!.publisherId,
                configId: embeddedConfig!.configId,
                timestamp: new Date().toISOString(),
                data,
              });
            });
          });

          initialized = true;
          emitEvent('pbReady', {
            publisherId: embeddedConfig!.publisherId,
            configId: embeddedConfig!.configId,
            configName: embeddedConfig!.configName,
          });

          if (embeddedConfig!.config.debugMode) {
            console.log('pb: Initialized successfully');
          }
        });

      } catch (error) {
        console.error('pb: Initialization failed', error);
        emitEvent('pbError', { error });
        throw error;
      }
    },

    /**
     * Request bids for specific ad units
     * Only loads ad units that are specified (efficient!)
     *
     * Dynamic IDs: If an ad unit definition includes a `bidders` map,
     * those per-bidder params are used instead of publisher-level defaults.
     * This allows each ad unit to have unique placement IDs, site IDs, etc.
     */
    requestBids(adUnitCodes: string[]) {
      if (!initialized || !window.pbjs || !embeddedConfig) {
        console.warn('pb: Not initialized. Call pb.init() first.');
        return;
      }

      window.pbjs.que.push(() => {
        const adUnits: any[] = [];

        // Build ad units from definitions (only for requested codes)
        for (const code of adUnitCodes) {
          const definition = embeddedConfig!.adUnitDefinitions[code];
          if (!definition) {
            console.warn(`pb: Ad unit definition not found: ${code}`);
            continue;
          }

          // Build bids array using Dynamic IDs when available
          const bids = buildBidsForAdUnit(definition, embeddedConfig!.bidders);

          const adUnit: any = {
            code,
            mediaTypes: definition.mediaTypes,
            bids,
          };

          adUnits.push(adUnit);
        }

        if (adUnits.length === 0) {
          console.warn('pb: No valid ad units to request bids for');
          return;
        }

        // Add ad units and request bids
        window.pbjs.addAdUnits(adUnits);
        window.pbjs.requestBids({
          adUnitCodes,
          bidsBackHandler: () => {
            window.pbjs.setTargetingForGPTAsync(adUnitCodes);
            emitEvent('bidsReady', { adUnitCodes });
          },
        });

        if (embeddedConfig!.config.debugMode) {
          console.log(`pb: Requested bids for ${adUnits.length} ad units:`, adUnitCodes);
        }
      });
    },

    /**
     * Auto-detect ad units on page and request bids
     * Looks for elements with data-ad-unit attribute
     */
    autoRequestBids() {
      if (!initialized || !window.pbjs) {
        console.warn('pb: Not initialized. Call pb.init() first.');
        return;
      }

      const adUnitsOnPage = Array.from(
        document.querySelectorAll('[data-ad-unit]')
      ).map(el => el.getAttribute('data-ad-unit') as string);

      if (adUnitsOnPage.length === 0) {
        console.warn('pb: No ad units found on page (looking for [data-ad-unit])');
        return;
      }

      if (embeddedConfig?.config.debugMode) {
        console.log('pb: Auto-detected ad units:', adUnitsOnPage);
      }

      this.requestBids(adUnitsOnPage);
    },

    /**
     * Refresh ad units (request bids again)
     */
    refresh(adUnitCodes?: string[]) {
      if (!initialized || !window.pbjs) {
        console.warn('pb: Not initialized');
        return;
      }

      window.pbjs.que.push(() => {
        window.pbjs.requestBids({
          adUnitCodes,
          bidsBackHandler: () => {
            window.pbjs.setTargetingForGPTAsync(adUnitCodes);
            if (window.googletag?.pubads) {
              window.googletag.pubads().refresh();
            }
            emitEvent('refreshComplete', { adUnitCodes });
          },
        });
      });
    },

    /**
     * Get current embedded config
     */
    getConfig() {
      return embeddedConfig;
    },

    /**
     * Update Prebid config dynamically
     */
    setConfig(newConfig: Partial<unknown>) {
      if (!initialized || !window.pbjs) {
        console.warn('pb: Not initialized');
        return;
      }

      window.pbjs.que.push(() => {
        window.pbjs.setConfig(newConfig);
        emitEvent('configUpdated', { config: newConfig });
      });
    },

    /**
     * Subscribe to events
     */
    on(event: string, callback: PbEventCallback) {
      addEventListener(event, callback);
    },

    /**
     * Unsubscribe from events
     */
    off(event: string, callback?: PbEventCallback) {
      removeEventListener(event, callback);
    },
  };

  return pb;
}

// Initialize global pb namespace
window.pb = createPbNamespace();

// Auto-initialize on load (can be disabled with data-no-auto-init attribute)
if (typeof document !== 'undefined') {
  const currentScript = document.currentScript as HTMLScriptElement;
  const shouldAutoInit = !currentScript?.hasAttribute('data-no-auto-init');

  if (shouldAutoInit) {
    // Auto-init after DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.pb.init().catch(err => console.error('pb: Auto-init failed', err));
      });
    } else {
      // DOM already loaded
      window.pb.init().catch(err => console.error('pb: Auto-init failed', err));
    }
  }
}

export default window.pb;
