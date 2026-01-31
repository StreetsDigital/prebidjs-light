/**
 * Wrapper Script Routes
 * Serves the minified publisher wrapper script with embedded configs
 */

import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db, wrapperConfigs, configTargetingRules, configServeLog, publishers } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import {
  detectAttributes,
  evaluateRules,
  findDefaultConfig,
  WrapperConfig,
} from '../utils/targeting';
import {
  generateWrapper,
  generateCacheKey,
  getCachedWrapper,
  cacheWrapper,
} from '../utils/wrapper-generator';

const WRAPPER_PATH = path.join(process.cwd(), '../wrapper/dist/pb.min.js');
const WRAPPER_SOURCE_MAP_PATH = path.join(process.cwd(), '../wrapper/dist/pb.min.js.map');

export default async function wrapperRoutes(fastify: FastifyInstance) {
  /**
   * Serve the minified wrapper script
   * GET /pb.min.js or /pb/{publisherApiKey}.js
   */
  fastify.get('/pb.min.js', async (request, reply) => {
    try {
      if (!fs.existsSync(WRAPPER_PATH)) {
        return reply.code(404).send({
          error: 'Wrapper not built',
          message: 'Run "npm run build" in apps/wrapper directory'
        });
      }

      const content = fs.readFileSync(WRAPPER_PATH, 'utf-8');

      reply
        .header('Content-Type', 'application/javascript; charset=utf-8')
        .header('Cache-Control', 'public, max-age=300, s-maxage=3600') // 5 min browser, 1 hour CDN
        .header('Access-Control-Allow-Origin', '*') // CORS for CDN usage
        .send(content);
    } catch (err) {
      fastify.log.error({ err }, 'Failed to serve wrapper');
      return reply.code(500).send({ error: 'Failed to load wrapper' });
    }
  });

  /**
   * Serve source map for debugging
   * GET /pb.min.js.map
   */
  fastify.get('/pb.min.js.map', async (request, reply) => {
    try {
      if (!fs.existsSync(WRAPPER_SOURCE_MAP_PATH)) {
        return reply.code(404).send({ error: 'Source map not found' });
      }

      const content = fs.readFileSync(WRAPPER_SOURCE_MAP_PATH, 'utf-8');

      reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600')
        .header('Access-Control-Allow-Origin', '*')
        .send(content);
    } catch (err) {
      fastify.log.error({ err }, 'Failed to serve source map');
      return reply.code(500).send({ error: 'Failed to load source map' });
    }
  });

  /**
   * Serve publisher-specific wrapper with embedded config
   * GET /pb/{publisherId}.js
   *
   * NEW ARCHITECTURE: Detects request attributes (GEO, device, browser) and
   * embeds the matching config directly into the wrapper script.
   * This eliminates the separate config API call for 3-4x faster auction starts.
   */
  fastify.get<{ Params: { publisherId: string } }>('/pb/:publisherId.js', async (request, reply) => {
    const { publisherId } = request.params;

    try {
      // 1. Detect request attributes from headers
      const attributes = detectAttributes(request);

      // 2. Generate cache key
      const cacheKey = generateCacheKey(publisherId, attributes);

      // 3. Check memory cache
      const cached = getCachedWrapper(cacheKey);
      if (cached) {
        return reply
          .header('Content-Type', 'application/javascript; charset=utf-8')
          .header('Cache-Control', 'public, max-age=300')
          .header('Vary', 'CF-IPCountry, User-Agent')
          .header('Access-Control-Allow-Origin', '*')
          .send(cached);
      }

      // 4. Verify publisher exists
      const publisher = await db
        .select()
        .from(publishers)
        .where(eq(publishers.id, publisherId))
        .get();

      if (!publisher) {
        return reply.code(404).send({ error: 'Publisher not found' });
      }

      // 5. Get active configs with targeting rules (sorted by priority DESC)
      const results = await db
        .select({
          config: wrapperConfigs,
          rule: configTargetingRules,
        })
        .from(wrapperConfigs)
        .leftJoin(
          configTargetingRules,
          eq(wrapperConfigs.id, configTargetingRules.configId)
        )
        .where(
          and(
            eq(wrapperConfigs.publisherId, publisherId),
            eq(wrapperConfigs.status, 'active'),
            eq(configTargetingRules.enabled, true)
          )
        )
        .orderBy(desc(configTargetingRules.priority))
        .all();

      // 6. Group configs with rules
      const configsMap = new Map<string, { config: WrapperConfig; rule: any }>();
      for (const row of results) {
        if (row.config && row.rule) {
          const key = row.config.id;
          if (!configsMap.has(key) || configsMap.get(key)!.rule.priority < row.rule.priority) {
            configsMap.set(key, {
              config: row.config as any,
              rule: {
                ...row.rule,
                conditions: JSON.parse(row.rule.conditions),
              },
            });
          }
        }
      }

      const configsWithRules = Array.from(configsMap.values());

      // 7. Evaluate rules to find matching config
      let matchedConfig: WrapperConfig | null = evaluateRules(configsWithRules, attributes);
      let matchedRuleId: string | undefined;

      if (matchedConfig) {
        matchedRuleId = configsWithRules.find(c => c.config.id === matchedConfig!.id)?.rule.id;
      }

      // 8. Fallback to default config if no match
      if (!matchedConfig) {
        const allConfigs = await db
          .select()
          .from(wrapperConfigs)
          .where(
            and(
              eq(wrapperConfigs.publisherId, publisherId),
              eq(wrapperConfigs.status, 'active')
            )
          )
          .all();

        matchedConfig = findDefaultConfig(allConfigs as any);
      }

      // 9. If still no config, return error
      if (!matchedConfig) {
        return reply.code(404).send({
          error: 'No config found',
          message: 'Publisher has no active configs',
        });
      }

      // 9.5. NEW: Check if config blocks wrapper initialization
      if (matchedConfig.blockWrapper) {
        // Log blocked request asynchronously
        logConfigServe(
          publisherId,
          matchedConfig.id,
          attributes,
          matchedRuleId
        ).catch(err => {
          fastify.log.error({ err }, 'Failed to log blocked config serve');
        });

        // Return minimal JavaScript that does nothing
        const blockedScript = `
/* Wrapper blocked by configuration */
(function() {
  if (typeof window !== 'undefined') {
    window.pbjs_blocked = true;
    window.pbjs_block_reason = 'config_match';
    window.pbjs_config_id = '${matchedConfig.id}';
    console.log('[pbjs_engine] Wrapper initialization blocked by config: ${matchedConfig.name || matchedConfig.id}');
  }
})();
`.trim();

        return reply
          .header('Content-Type', 'application/javascript; charset=utf-8')
          .header('Cache-Control', 'public, max-age=300')
          .header('Vary', 'CF-IPCountry, User-Agent')
          .header('Access-Control-Allow-Origin', '*')
          .send(blockedScript);
      }

      // 10. Generate wrapper with embedded config
      const wrapper = generateWrapper(
        publisherId,
        matchedConfig,
        attributes,
        matchedRuleId
      );

      // 11. Cache the wrapper variant
      cacheWrapper(cacheKey, wrapper);

      // 12. Log the match asynchronously (don't block response)
      logConfigServe(
        publisherId,
        matchedConfig.id,
        attributes,
        matchedRuleId
      ).catch(err => {
        fastify.log.error({ err }, 'Failed to log config serve');
      });

      // 13. Update impression count asynchronously
      updateImpressionCount(matchedConfig.id).catch(err => {
        fastify.log.error({ err }, 'Failed to update impression count');
      });

      // 14. Return wrapper with proper headers
      return reply
        .header('Content-Type', 'application/javascript; charset=utf-8')
        .header('Cache-Control', 'public, max-age=300')
        .header('Vary', 'CF-IPCountry, User-Agent')
        .header('Access-Control-Allow-Origin', '*')
        .send(wrapper);
    } catch (err) {
      fastify.log.error({ err }, 'Failed to serve publisher wrapper');
      return reply.code(500).send({ error: 'Failed to load wrapper' });
    }
  });

  /**
   * Get wrapper build info
   * GET /pb/info
   */
  fastify.get('/pb/info', async (request, reply) => {
    try {
      if (!fs.existsSync(WRAPPER_PATH)) {
        return {
          built: false,
          message: 'Wrapper not built. Run "npm run build" in apps/wrapper directory',
        };
      }

      const stats = fs.statSync(WRAPPER_PATH);
      const content = fs.readFileSync(WRAPPER_PATH, 'utf-8');

      // Extract version from wrapper (if present in preamble)
      const versionMatch = content.match(/v(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      return {
        built: true,
        version,
        fileSize: stats.size,
        fileSizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
        lastModified: stats.mtime,
        hasSourceMap: fs.existsSync(WRAPPER_SOURCE_MAP_PATH),
        endpoints: {
          generic: '/pb.min.js',
          publisherSpecific: '/pb/{publisherId}.js',
          sourceMap: '/pb.min.js.map',
        },
      };
    } catch (err) {
      fastify.log.error({ err }, 'Failed to get wrapper info');
      return reply.code(500).send({ error: 'Failed to get wrapper info' });
    }
  });
}

/**
 * Log config serve to analytics (async)
 */
async function logConfigServe(
  publisherId: string,
  configId: string,
  attributes: any,
  matchedRuleId?: string
): Promise<void> {
  await db.insert(configServeLog).values({
    id: uuidv4(),
    publisherId,
    configId,
    geo: attributes.geo,
    device: attributes.device,
    browser: attributes.browser,
    os: attributes.os,
    matchedRuleId: matchedRuleId || null,
    timestamp: new Date().toISOString(),
  }).run();
}

/**
 * Update impression count for config (async)
 */
async function updateImpressionCount(configId: string): Promise<void> {
  const config = await db
    .select()
    .from(wrapperConfigs)
    .where(eq(wrapperConfigs.id, configId))
    .get();

  if (config) {
    await db
      .update(wrapperConfigs)
      .set({
        impressionsServed: (config.impressionsServed || 0) + 1,
        lastServedAt: new Date().toISOString(),
      })
      .where(eq(wrapperConfigs.id, configId))
      .run();
  }
}
