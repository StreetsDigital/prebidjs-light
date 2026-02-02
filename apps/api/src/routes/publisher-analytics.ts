import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, publisherAnalytics } from '../db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getAllAnalytics } from '../utils/prebid-data-fetcher';
import { requireAdmin } from '../middleware/auth';
import { safeJsonParse, safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

interface AddAnalyticsRequest {
  analyticsCode: string;
  analyticsName?: string;
  params?: Record<string, any>;
}

interface DeleteAnalyticsParams {
  publisherId: string;
  analyticsCode: string;
}

interface DeleteAnalyticsRequest {
  Params: DeleteAnalyticsParams;
}

export default async function publisherAnalyticsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/publishers/:publisherId/analytics
   * List enabled analytics adapters for a publisher
   */
  fastify.get('/:publisherId/analytics', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest<{ Params: { publisherId: string } }>, reply: FastifyReply) => {
    const { publisherId } = request.params;

    try {
      // Get enabled analytics adapters from database
      const analytics = db
        .select()
        .from(publisherAnalytics)
        .where(
          and(
            eq(publisherAnalytics.publisherId, publisherId),
            eq(publisherAnalytics.enabled, true)
          )
        )
        .all();

      // Get full component info from Prebid data
      const allAnalytics = getAllAnalytics();
      const analyticsMap = new Map(allAnalytics.map(a => [a.code, a]));

      // Enrich with Prebid data
      const enrichedAnalytics = analytics.map(adapter => {
        const prebidInfo = analyticsMap.get(adapter.analyticsCode);
        return {
          id: adapter.id,
          code: adapter.analyticsCode,
          name: adapter.analyticsName,
          params: safeJsonParseObject(adapter.params, null),
          enabled: adapter.enabled,
          isPrebidMember: !!prebidInfo, // If in Prebid docs, it's official
          documentationUrl: prebidInfo?.documentationUrl || null,
          dependencies: prebidInfo?.dependencies || [],
          createdAt: adapter.createdAt,
          updatedAt: adapter.updatedAt,
        };
      });

      return reply.send({ data: enrichedAnalytics });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch analytics adapters' });
    }
  });

  /**
   * POST /api/publishers/:publisherId/analytics
   * Add an analytics adapter to a publisher
   */
  fastify.post('/:publisherId/analytics', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest<{ Params: { publisherId: string }; Body: AddAnalyticsRequest }>, reply: FastifyReply) => {
    const { publisherId } = request.params;
    const { analyticsCode, analyticsName, params } = request.body;

    try {
      // Validate analytics code
      if (!analyticsCode || analyticsCode.trim().length === 0) {
        return reply.status(400).send({
          error: 'Analytics code is required'
        });
      }

      const normalizedCode = analyticsCode.toLowerCase().trim();

      // Check if already exists for this publisher
      const existing = db
        .select()
        .from(publisherAnalytics)
        .where(
          and(
            eq(publisherAnalytics.publisherId, publisherId),
            eq(publisherAnalytics.analyticsCode, normalizedCode)
          )
        )
        .get();

      if (existing) {
        return reply.status(400).send({
          error: 'This analytics adapter has already been added to your account.'
        });
      }

      // Look up analytics info from Prebid data
      const allAnalytics = getAllAnalytics();
      const analyticsInfo = allAnalytics.find(a => a.code === normalizedCode);

      // Create analytics adapter
      const newAnalytics = {
        id: uuidv4(),
        publisherId,
        analyticsCode: normalizedCode,
        analyticsName: analyticsName || analyticsInfo?.name || normalizedCode,
        params: params ? JSON.stringify(params) : null,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.insert(publisherAnalytics).values(newAnalytics).run();

      return reply.status(201).send({
        data: {
          id: newAnalytics.id,
          code: newAnalytics.analyticsCode,
          name: newAnalytics.analyticsName,
          params: params || null,
          isPrebidMember: !!analyticsInfo,
          documentationUrl: analyticsInfo?.documentationUrl || null,
        },
        message: `${newAnalytics.analyticsName} added successfully`
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to add analytics adapter' });
    }
  });

  /**
   * DELETE /api/publishers/:publisherId/analytics/:analyticsCode
   * Remove an analytics adapter from a publisher
   */
  fastify.delete('/:publisherId/analytics/:analyticsCode', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest<DeleteAnalyticsRequest>, reply: FastifyReply) => {
    const { publisherId, analyticsCode } = request.params;

    try {
      // Find the analytics adapter
      const analytics = db
        .select()
        .from(publisherAnalytics)
        .where(
          and(
            eq(publisherAnalytics.publisherId, publisherId),
            eq(publisherAnalytics.analyticsCode, analyticsCode)
          )
        )
        .get();

      if (!analytics) {
        return reply.status(404).send({ error: 'Analytics adapter not found' });
      }

      // Delete the analytics adapter
      db.delete(publisherAnalytics)
        .where(eq(publisherAnalytics.id, analytics.id))
        .run();

      return reply.send({ message: 'Analytics adapter removed successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove analytics adapter' });
    }
  });
}
