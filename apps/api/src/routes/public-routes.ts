/**
 * Public routes - no authentication required
 * Includes: wrapper script, config endpoint, analytics beacon
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TIMEOUTS } from '../constants/timeouts';
import { safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

/**
 * Register all public routes
 */
export default async function publicRoutes(fastify: FastifyInstance) {
  // Wrapper script endpoint - rate limited for public access
  fastify.get('/pb.js', {
    config: {
      rateLimit: {
        max: 100, // 100 requests
        timeWindow: '1 minute',
      },
    },
    handler: wrapperScriptHandler,
  });

  // Public config endpoint - rate limited for public access
  fastify.get('/c/:publisherSlug', {
    config: {
      rateLimit: {
        max: 100, // 100 requests
        timeWindow: '1 minute',
      },
    },
    handler: configEndpointHandler,
  });

  // Analytics beacon endpoint - higher limit for tracking
  fastify.post('/b', {
    config: {
      rateLimit: {
        max: 500, // Higher limit for analytics tracking
        timeWindow: '1 minute',
      },
    },
    handler: analyticsBeaconHandler,
  });
}

/**
 * Wrapper script endpoint - serves the pb.js script for publishers
 * Uses publisher slug (public identifier) instead of API key for security
 */
async function wrapperScriptHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.query as { id?: string };

  if (!id) {
    return reply.code(400).type('text/plain').send('// Error: Missing publisher identifier');
  }

  // Import db and schema
  const { db, publishers } = await import('../db');
  const { eq, or } = await import('drizzle-orm');

  // Validate publisher exists and is active - look up by slug or id (not API key)
  const publisher = db.select().from(publishers).where(
    or(eq(publishers.slug, id), eq(publishers.id, id))
  ).get();

  if (!publisher) {
    return reply.code(404).type('text/plain').send('// Error: Publisher not found');
  }

  if (publisher.status !== 'active') {
    return reply.code(403).type('text/plain').send('// Error: Publisher is not active');
  }

  // Get the API base URL
  const protocol = request.headers['x-forwarded-proto'] || 'http';
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'localhost:3001';
  const apiEndpoint = `${protocol}://${host}`;

  // Generate the wrapper script with the publisher's config
  const wrapperScript = generateWrapperScript(publisher, apiEndpoint);

  // Set appropriate headers
  reply.header('Content-Type', 'application/javascript; charset=utf-8');
  reply.header('Cache-Control', `public, max-age=${TIMEOUTS.WRAPPER_CACHE_MAX_AGE}`); // 5 minute cache

  return wrapperScript;
}

/**
 * Generate wrapper script for publisher
 */
function generateWrapperScript(publisher: any, apiEndpoint: string): string {
  return `
/**
 * pbjs_engine Publisher Wrapper v1.0.0
 * Publisher: ${publisher.name.replace(/\*\//g, '')}
 * Generated: ${new Date().toISOString()}
 */
(function() {
  'use strict';

  var publisherId = ${JSON.stringify(publisher.slug)};
  var apiEndpoint = ${JSON.stringify(apiEndpoint)};
  var CONFIG_CACHE_KEY = 'pb_config_cache';
  var CONFIG_CACHE_TTL = ${TIMEOUTS.CACHE_TTL}; // 5 minutes

  // Event listeners
  var eventListeners = {};

  function addEventListener(event, callback) {
    if (!eventListeners[event]) {
      eventListeners[event] = [];
    }
    eventListeners[event].push(callback);
  }

  function removeEventListener(event, callback) {
    if (!eventListeners[event]) return;
    if (callback) {
      eventListeners[event] = eventListeners[event].filter(function(cb) { return cb !== callback; });
    } else {
      delete eventListeners[event];
    }
  }

  function emitEvent(event, data) {
    if (!eventListeners[event]) return;
    eventListeners[event].forEach(function(callback) {
      try {
        callback(data);
      } catch (e) {
        console.error('pb: Event callback error', e);
      }
    });
  }

  // Config caching
  function getCachedConfig() {
    try {
      var cached = localStorage.getItem(CONFIG_CACHE_KEY + '_' + publisherId);
      if (cached) {
        var parsed = safeJsonParseObject(cached, null);
        if (Date.now() - parsed.timestamp < CONFIG_CACHE_TTL) {
          return parsed.data;
        }
      }
    } catch (e) {}
    return null;
  }

  function setCachedConfig(config) {
    try {
      localStorage.setItem(CONFIG_CACHE_KEY + '_' + publisherId, JSON.stringify({
        data: config,
        timestamp: Date.now()
      }));
    } catch (e) {}
  }

  // Analytics beacon
  function sendBeacon(events) {
    try {
      var payload = JSON.stringify({ events: events });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(apiEndpoint + '/b', payload);
      } else {
        fetch(apiEndpoint + '/b', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        });
      }
    } catch (e) {
      console.error('pb: Beacon error', e);
    }
  }

  // Create pb namespace
  var config = null;
  var initialized = false;

  window.pb = {
    version: '1.0.0',
    publisherId: publisherId,

    init: function() {
      var self = this;
      if (initialized) {
        console.warn('pb: Already initialized');
        return Promise.resolve();
      }

      return new Promise(function(resolve, reject) {
        // Check cache first
        config = getCachedConfig();

        if (config) {
          initialized = true;
          emitEvent('pbReady', { publisherId: publisherId, cached: true });
          resolve();
          return;
        }

        // Fetch config from server
        fetch(apiEndpoint + '/c/' + publisherId)
          .then(function(response) {
            if (!response.ok) {
              throw new Error('Config fetch failed: ' + response.status);
            }
            return response.json();
          })
          .then(function(data) {
            config = data;
            setCachedConfig(config);
            initialized = true;
            emitEvent('pbReady', { publisherId: publisherId, cached: false });
            resolve();
          })
          .catch(function(error) {
            console.error('pb: Initialization failed', error);
            emitEvent('pbError', { error: error });
            reject(error);
          });
      });
    },

    getConfig: function() {
      return config;
    },

    refresh: function(adUnitCodes) {
      if (!initialized) {
        console.warn('pb: Not initialized');
        return;
      }
      emitEvent('refreshRequested', { adUnitCodes: adUnitCodes });
      // In production, this would trigger Prebid.js refresh
    },

    on: function(event, callback) {
      addEventListener(event, callback);
    },

    off: function(event, callback) {
      removeEventListener(event, callback);
    },

    sendAnalytics: function(eventType, data) {
      sendBeacon([{
        publisherId: publisherId,
        eventType: eventType,
        timestamp: new Date().toISOString(),
        data: data
      }]);
    }
  };

  // Auto-initialize if not in debug mode
  if (typeof window.pbDebug === 'undefined' || !window.pbDebug) {
    window.pb.init().catch(function(e) {
      console.error('pb: Auto-init failed', e);
    });
  }
})();
`;
}

/**
 * Public config endpoint (high performance)
 * Uses publisher slug or ID (public identifier) instead of API key for security
 * Supports A/B testing via variant query param or random selection
 */
async function configEndpointHandler(request: FastifyRequest, reply: FastifyReply) {
  const { publisherSlug } = request.params as { publisherSlug: string };
  const { variant: variantParam } = request.query as { variant?: string };

  // Import db and schema
  const { db, publishers, publisherConfig, websites, adUnits, publisherBidders, abTests, abTestVariants } = await import('../db');
  const { eq, or, and } = await import('drizzle-orm');

  // Find publisher by slug or ID (not API key - keep that secret)
  const publisher = db.select().from(publishers).where(
    or(eq(publishers.slug, publisherSlug), eq(publishers.id, publisherSlug))
  ).get();

  if (!publisher) {
    return reply.code(404).send({ error: 'Publisher not found' });
  }

  if (publisher.status !== 'active') {
    return reply.code(403).send({ error: 'Publisher is not active' });
  }

  // Get publisher config
  const config = db.select().from(publisherConfig).where(eq(publisherConfig.publisherId, publisher.id)).get();

  // Get ad units through websites
  const publisherWebsites = db.select().from(websites).where(eq(websites.publisherId, publisher.id)).all();
  const websiteIds = publisherWebsites.map((w: any) => w.id);
  const units = websiteIds.length > 0
    ? db.select().from(adUnits).where(eq(adUnits.websiteId, websiteIds[0])).all() // Simplified for now
    : [];

  // Get bidders
  const bidders = db.select().from(publisherBidders).where(eq(publisherBidders.publisherId, publisher.id)).all();

  // Check for active A/B test
  const activeTest = db
    .select()
    .from(abTests)
    .where(and(eq(abTests.publisherId, publisher.id), eq(abTests.status, 'running')))
    .get();

  let selectedVariant: typeof abTestVariants.$inferSelect | null = null;
  let abTestInfo: { testId: string; testName: string; variantId: string; variantName: string } | null = null;

  if (activeTest) {
    const variants = db
      .select()
      .from(abTestVariants)
      .where(eq(abTestVariants.testId, activeTest.id))
      .all();

    if (variants.length > 0) {
      // Check if a specific variant was requested
      if (variantParam) {
        selectedVariant = variants.find(v => v.id === variantParam || v.name === variantParam) || null;
      }

      // If no specific variant requested or not found, randomly select based on traffic percentages
      if (!selectedVariant) {
        const random = Math.random() * 100;
        let cumulative = 0;
        for (const v of variants) {
          cumulative += v.trafficPercent;
          if (random <= cumulative) {
            selectedVariant = v;
            break;
          }
        }
        // Fallback to first variant if somehow nothing was selected
        if (!selectedVariant) {
          selectedVariant = variants[0];
        }
      }

      abTestInfo = {
        testId: activeTest.id,
        testName: activeTest.name,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
      };
    }
  }

  // Build base Prebid-compatible config
  let prebidConfig: Record<string, any> = {
    publisherId: publisher.id,
    publisherName: publisher.name,
    domains: safeJsonParseArray(publisher.domains, []),
    config: {
      bidderTimeout: config?.bidderTimeout || TIMEOUTS.DEFAULT_BIDDER_TIMEOUT,
      priceGranularity: config?.priceGranularity || 'medium',
      enableSendAllBids: config?.enableSendAllBids ?? true,
      bidderSequence: config?.bidderSequence || 'random',
      debug: config?.debugMode || false,
    },
    adUnits: units.map(u => ({
      code: u.code,
      name: u.name,
      mediaTypes: safeJsonParseObject(u.mediaTypes, {}),
      floorPrice: u.floorPrice,
      status: u.status,
    })),
    bidders: bidders.filter(b => b.enabled).map(b => ({
      bidderCode: b.bidderCode,
      params: safeJsonParseObject(b.params, {}),
      timeoutOverride: b.timeoutOverride,
      priority: b.priority,
    })),
    version: config?.version || 1,
    generatedAt: new Date().toISOString(),
  };

  // Apply A/B test variant overrides if selected (and not control)
  if (selectedVariant && !selectedVariant.isControl) {
    if (selectedVariant.bidderTimeout) {
      prebidConfig.config.bidderTimeout = selectedVariant.bidderTimeout;
    }
    if (selectedVariant.priceGranularity) {
      prebidConfig.config.priceGranularity = selectedVariant.priceGranularity;
    }
    if (selectedVariant.enableSendAllBids !== null) {
      prebidConfig.config.enableSendAllBids = !!selectedVariant.enableSendAllBids;
    }
    if (selectedVariant.bidderSequence) {
      prebidConfig.config.bidderSequence = selectedVariant.bidderSequence;
    }
    if (selectedVariant.floorsConfig) {
      prebidConfig.config.floors = safeJsonParseObject(selectedVariant.floorsConfig, {});
    }
    if (selectedVariant.bidderOverrides) {
      const overrides = safeJsonParseObject(selectedVariant.bidderOverrides, {});
      // Apply bidder-specific overrides
      prebidConfig.bidders = prebidConfig.bidders.map((b: any) => {
        if (overrides[b.bidderCode]) {
          return { ...b, ...overrides[b.bidderCode] };
        }
        return b;
      });
    }
  }

  // Add A/B test info to the response
  if (abTestInfo) {
    prebidConfig.abTest = abTestInfo;
  }

  // Set cache headers (shorter for A/B tests to allow variant switching)
  const cacheTime = activeTest ? TIMEOUTS.AB_TEST_CACHE_TIME : TIMEOUTS.CONFIG_CACHE_TIME; // 1 minute for A/B tests, 5 minutes otherwise
  reply.header('Cache-Control', `public, max-age=${cacheTime}`);

  return prebidConfig;
}

/**
 * Analytics beacon endpoint (high throughput)
 */
async function analyticsBeaconHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { db, analyticsEvents, publishers } = await import('../db');
    const { v4: uuidv4 } = await import('uuid');
    const { analyticsEmitter } = await import('./analytics');
    const { eq, and, isNull } = await import('drizzle-orm');

    const body = request.body as {
      events?: Array<{
        publisherId: string;
        eventType: string;
        auctionId?: string;
        adUnitCode?: string;
        bidderCode?: string;
        cpm?: number;
        currency?: string;
        latencyMs?: number;
        timeout?: boolean;
        won?: boolean;
        rendered?: boolean;
        pageUrl?: string;
        domain?: string;
        deviceType?: string;
        country?: string;
        timestamp?: string;
      }>;
    };

    if (!body?.events || !Array.isArray(body.events)) {
      return reply.code(400).send({ error: 'Invalid beacon payload' });
    }

    const now = new Date().toISOString();
    const insertedEvents: any[] = [];

    // Insert events (in a real system, this would go to Redis Streams then ClickHouse)
    for (const event of body.events) {
      if (!event.publisherId || !event.eventType) {
        continue; // Skip invalid events
      }

      // Validate publisher exists and is active
      const publisherExists = db.select()
        .from(publishers)
        .where(and(
          eq(publishers.id, event.publisherId),
          eq(publishers.status, 'active'),
          isNull(publishers.deletedAt)
        ))
        .get();

      if (!publisherExists) {
        continue; // Skip events for invalid/inactive publishers
      }

      const eventId = uuidv4();
      db.insert(analyticsEvents).values({
        id: eventId,
        publisherId: event.publisherId,
        eventType: event.eventType,
        auctionId: event.auctionId || null,
        adUnitCode: event.adUnitCode || null,
        bidderCode: event.bidderCode || null,
        cpm: event.cpm?.toString() || null,
        currency: event.currency || 'USD',
        latencyMs: event.latencyMs || null,
        timeout: event.timeout ? 1 : 0,
        won: event.won ? 1 : 0,
        rendered: event.rendered ? 1 : 0,
        pageUrl: event.pageUrl || null,
        domain: event.domain || null,
        deviceType: event.deviceType || null,
        country: event.country || null,
        timestamp: event.timestamp || now,
        receivedAt: now,
      } as any);

      insertedEvents.push({
        id: eventId,
        publisherId: event.publisherId,
        eventType: event.eventType,
        bidderCode: event.bidderCode,
        cpm: event.cpm,
        timestamp: event.timestamp || now,
      });
    }

    // Emit events for SSE subscribers
    if (insertedEvents.length > 0) {
      for (const event of insertedEvents) {
        analyticsEmitter.emit('newEvent', event);
      }
    }

    // Return 200 for successful beacon processing
    return reply.code(200).send({ received: body.events.length });
  } catch (err) {
    request.log.error(err, 'Failed to process beacon');
    return reply.code(500).send({ error: 'Failed to process beacon' });
  }
}
