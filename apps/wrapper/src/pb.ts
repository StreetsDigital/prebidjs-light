/**
 * pbjs_engine Publisher Wrapper
 *
 * This is the lightweight wrapper that publishers include on their sites.
 * It provides the `pb` namespace for interacting with Prebid.js.
 */

interface PbConfig {
  publisherId: string;
  apiEndpoint: string;
  debug?: boolean;
}

interface PbEventCallback {
  (data: unknown): void;
}

interface PbNamespace {
  init: () => Promise<void>;
  refresh: (adUnitCodes?: string[]) => void;
  getConfig: () => unknown;
  setConfig: (config: Partial<unknown>) => void;
  on: (event: string, callback: PbEventCallback) => void;
  off: (event: string, callback?: PbEventCallback) => void;
  version: string;
  publisherId: string;
  pbjs: typeof window.pbjs | null;
}

declare global {
  interface Window {
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

// Extract publisher ID from script URL
function getPublisherIdFromScript(): string {
  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i].src;
    if (src.includes('/pb/') || src.includes('/wrapper/')) {
      const match = src.match(/\/([a-zA-Z0-9-]+)\.js/);
      if (match) {
        return match[1];
      }
    }
  }
  throw new Error('pb: Could not determine publisher ID from script URL');
}

// Configuration cache with TTL
const CONFIG_CACHE_KEY = 'pb_config_cache';
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedConfig {
  data: unknown;
  timestamp: number;
}

function getCachedConfig(publisherId: string): unknown | null {
  try {
    const cached = localStorage.getItem(`${CONFIG_CACHE_KEY}_${publisherId}`);
    if (cached) {
      const parsed: CachedConfig = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CONFIG_CACHE_TTL) {
        return parsed.data;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return null;
}

function setCachedConfig(publisherId: string, config: unknown): void {
  try {
    const cached: CachedConfig = {
      data: config,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CONFIG_CACHE_KEY}_${publisherId}`, JSON.stringify(cached));
  } catch (e) {
    // Ignore localStorage errors
  }
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

// Analytics beacon
function sendBeacon(events: unknown[]): void {
  const endpoint = (window.pb as PbNamespace & { _config?: PbConfig })._config?.apiEndpoint || '';
  if (!endpoint) return;

  try {
    const payload = JSON.stringify(events);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${endpoint}/b`, payload);
    } else {
      fetch(`${endpoint}/b`, {
        method: 'POST',
        body: payload,
        keepalive: true,
      });
    }
  } catch (e) {
    console.error('pb: Beacon error', e);
  }
}

// Create pb namespace
function createPbNamespace(): PbNamespace {
  let publisherId = '';
  let config: unknown = null;
  let initialized = false;

  const pb: PbNamespace = {
    version: '1.0.0',

    get publisherId() {
      return publisherId;
    },

    get pbjs() {
      return window.pbjs || null;
    },

    async init() {
      if (initialized) {
        console.warn('pb: Already initialized');
        return;
      }

      try {
        // Get publisher ID
        publisherId = getPublisherIdFromScript();

        // Check cache first
        config = getCachedConfig(publisherId);

        if (!config) {
          // Fetch config from server
          const apiEndpoint = (this as PbNamespace & { _config?: PbConfig })._config?.apiEndpoint || '';
          const response = await fetch(`${apiEndpoint}/c/${publisherId}`);
          if (!response.ok) {
            throw new Error(`Config fetch failed: ${response.status}`);
          }
          config = await response.json();
          setCachedConfig(publisherId, config);
        }

        // Initialize Prebid.js
        window.pbjs = window.pbjs || { que: [] };
        window.pbjs.que.push(() => {
          // Apply configuration
          if (config && typeof config === 'object' && 'prebidConfig' in config) {
            window.pbjs.setConfig((config as { prebidConfig: unknown }).prebidConfig);
          }

          // Add ad units
          if (config && typeof config === 'object' && 'adUnits' in config) {
            window.pbjs.addAdUnits((config as { adUnits: unknown[] }).adUnits);
          }

          // Set up event tracking
          const events = [
            'auctionInit', 'auctionEnd', 'bidRequested', 'bidResponse',
            'bidWon', 'bidTimeout', 'noBid', 'adRenderSucceeded', 'adRenderFailed',
          ];

          events.forEach((event) => {
            window.pbjs.onEvent(event, (data) => {
              emitEvent(event, data);
              // Send to analytics beacon
              sendBeacon([{
                eventType: event,
                publisherId,
                timestamp: new Date().toISOString(),
                data,
              }]);
            });
          });

          initialized = true;
          emitEvent('pbReady', { publisherId });
        });

      } catch (error) {
        console.error('pb: Initialization failed', error);
        emitEvent('pbError', { error });
        throw error;
      }
    },

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

    getConfig() {
      return config;
    },

    setConfig(newConfig: Partial<unknown>) {
      if (!initialized || !window.pbjs) {
        console.warn('pb: Not initialized');
        return;
      }

      window.pbjs.que.push(() => {
        window.pbjs.setConfig(newConfig);
        config = { ...config as object, ...newConfig };
        emitEvent('configUpdated', { config });
      });
    },

    on(event: string, callback: PbEventCallback) {
      addEventListener(event, callback);
    },

    off(event: string, callback?: PbEventCallback) {
      removeEventListener(event, callback);
    },
  };

  return pb;
}

// Initialize global pb namespace
window.pb = createPbNamespace();

export default window.pb;
