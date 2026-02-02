/**
 * Prebid Components API Routes
 *
 * Provides access to Prebid.js component marketplace data:
 * - GET /api/prebid/bidders - 700+ bidder adapters
 * - GET /api/prebid/modules - 200+ modules
 * - GET /api/prebid/analytics - 50+ analytics adapters
 * - GET /api/prebid/recommended - 6 recommended core modules
 * - GET /api/prebid/search - Search all components
 * - GET /api/prebid/status - Cache status
 */

import { FastifyInstance } from 'fastify';
import {
  getAllBidders,
  getAllModules,
  getAllAnalytics,
  getRecommendedModules,
  searchComponents,
  getComponentInfo,
  getCacheStatus
} from '../utils/prebid-data-fetcher.js';
import { requireAuth } from '../middleware/auth';

export default async function prebidComponentsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/prebid/bidders
   * Get all available Prebid.js bidder adapters (700+)
   */
  fastify.get('/bidders', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const bidders = getAllBidders();
    return reply.send({
      data: bidders,
      count: bidders.length
    });
  });

  /**
   * GET /api/prebid/modules
   * Get all available Prebid.js modules (200+)
   * Optional query param: ?category=recommended|userId|rtd|general|vendor
   */
  fastify.get('/modules', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { category } = request.query as { category?: string };

    let modules = getAllModules();

    // Filter by category if provided
    if (category) {
      modules = modules.filter(m => m.category === category);
    }

    return reply.send({
      data: modules,
      count: modules.length
    });
  });

  /**
   * GET /api/prebid/analytics
   * Get all available Prebid.js analytics adapters (50+)
   */
  fastify.get('/analytics', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const analytics = getAllAnalytics();
    return reply.send({
      data: analytics,
      count: analytics.length
    });
  });

  /**
   * GET /api/prebid/recommended
   * Get recommended Prebid.js modules (core functionality)
   */
  fastify.get('/recommended', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const recommended = getRecommendedModules();
    return reply.send({
      data: recommended,
      count: recommended.length
    });
  });

  /**
   * GET /api/prebid/search
   * Search all Prebid.js components
   * Query params:
   *   - q: search query (required)
   *   - type: component type filter (optional: bidder|module|analytics)
   */
  fastify.get('/search', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { q, type } = request.query as { q?: string; type?: 'bidder' | 'module' | 'analytics' };

    if (!q) {
      return reply.status(400).send({
        error: 'Missing required query parameter: q'
      });
    }

    const results = searchComponents(q, type);

    return reply.send({
      data: results,
      count: results.length,
      query: q,
      type: type || 'all'
    });
  });

  /**
   * GET /api/prebid/component/:type/:code
   * Get specific component info
   * Path params:
   *   - type: bidder|module|analytics
   *   - code: component code
   */
  fastify.get('/component/:type/:code', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { type, code } = request.params as { type: 'bidder' | 'module' | 'analytics'; code: string };

    if (!['bidder', 'module', 'analytics'].includes(type)) {
      return reply.status(400).send({
        error: 'Invalid component type. Must be: bidder, module, or analytics'
      });
    }

    const component = getComponentInfo(code, type);

    if (!component) {
      return reply.status(404).send({
        error: `Component not found: ${type}/${code}`
      });
    }

    return reply.send({
      data: component
    });
  });

  /**
   * GET /api/prebid/status
   * Get cache status and metadata
   */
  fastify.get('/status', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const status = getCacheStatus();

    return reply.send({
      data: {
        ...status,
        totalComponents: status.biddersCount + status.modulesCount + status.analyticsCount,
        healthy: status.biddersCount > 0 && status.modulesCount > 0
      }
    });
  });
}
