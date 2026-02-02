import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { yieldRecommendations } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAdmin } from '../middleware/auth';
import { safeJsonParseObject } from '../utils/safe-json';
import {
  generateRecommendations,
  implementRecommendation,
} from '../services/recommendation-service';
import { measureRecommendationImpact } from '../services/yield-analysis-service';

export default async function yieldAdvisorRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================

  // Get all recommendations for a publisher
  fastify.get('/:publisherId/yield-recommendations', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { status, priority } = request.query as any;

    let recommendations = db.select().from(yieldRecommendations)
      .where(eq(yieldRecommendations.publisherId, publisherId))
      .orderBy(desc(yieldRecommendations.createdAt))
      .all();

    // Filter by status and priority if provided
    if (status) {
      recommendations = recommendations.filter(r => r.status === status);
    }
    if (priority) {
      recommendations = recommendations.filter(r => r.priority === priority);
    }

    // Parse JSON fields
    const recommendationsWithData = recommendations.map(rec => ({
      ...rec,
      dataSnapshot: safeJsonParseObject(rec.dataSnapshot, {}),
      estimatedImpact: safeJsonParseObject(rec.estimatedImpact, null),
      recommendedAction: safeJsonParseObject(rec.recommendedAction, {}),
      actualImpact: safeJsonParseObject(rec.actualImpact, null),
      measurementPeriod: safeJsonParseObject(rec.measurementPeriod, null),
    }));

    return reply.send({ recommendations: recommendationsWithData });
  });

  // Generate new recommendations
  fastify.post('/:publisherId/yield-recommendations/generate', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { days = 7 } = request.body as { days?: number };

    try {
      // Analyze publisher data and generate recommendations
      const recommendations = await generateRecommendations(publisherId, days);

      // Save recommendations to database
      const savedRecs = [];
      for (const rec of recommendations) {
        const recId = randomUUID();
        const now = new Date().toISOString();

        db.insert(yieldRecommendations).values({
          id: recId,
          publisherId,
          type: rec.type as any,
          priority: rec.priority as any,
          title: rec.title,
          description: rec.description,
          dataSnapshot: JSON.stringify(rec.dataSnapshot),
          estimatedImpact: rec.estimatedImpact ? JSON.stringify(rec.estimatedImpact) : null,
          targetEntity: rec.targetEntity || null,
          recommendedAction: JSON.stringify(rec.recommendedAction),
          status: 'pending' as any,
          confidence: rec.confidence,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          createdAt: now,
          updatedAt: now,
        }).run();

        savedRecs.push({ ...rec, id: recId });
      }

      return reply.send({
        recommendations: savedRecs,
        count: savedRecs.length,
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to generate recommendations',
        message: String(error),
      });
    }
  });

  // Implement a recommendation
  fastify.post('/:publisherId/yield-recommendations/:recommendationId/implement', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, recommendationId } = request.params as { publisherId: string; recommendationId: string };
    const { implementedBy } = request.body as { implementedBy: string };

    const recommendation = db.select().from(yieldRecommendations)
      .where(and(
        eq(yieldRecommendations.id, recommendationId),
        eq(yieldRecommendations.publisherId, publisherId)
      ))
      .get();

    if (!recommendation) {
      return reply.status(404).send({ error: 'Recommendation not found' });
    }

    const action = safeJsonParseObject(recommendation.recommendedAction, {});
    const now = new Date().toISOString();

    try {
      // Implement the recommendation based on type
      await implementRecommendation(publisherId, recommendation.type, action);

      // Update recommendation status
      db.update(yieldRecommendations)
        .set({
          status: 'implemented',
          implementedAt: now,
          implementedBy,
          measurementPeriod: JSON.stringify({
            start: now,
            end: null,
          }),
          updatedAt: now,
        })
        .where(eq(yieldRecommendations.id, recommendationId))
        .run();

      return reply.send({ success: true, message: 'Recommendation implemented' });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to implement recommendation',
        message: String(error),
      });
    }
  });

  // Dismiss a recommendation
  fastify.post('/:publisherId/yield-recommendations/:recommendationId/dismiss', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, recommendationId } = request.params as { publisherId: string; recommendationId: string };
    const { dismissedBy, reason } = request.body as { dismissedBy: string; reason?: string };

    db.update(yieldRecommendations)
      .set({
        status: 'dismissed',
        dismissedAt: new Date().toISOString(),
        dismissedBy,
        dismissReason: reason || null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        eq(yieldRecommendations.id, recommendationId),
        eq(yieldRecommendations.publisherId, publisherId)
      ))
      .run();

    return reply.send({ success: true });
  });

  // Measure impact of implemented recommendation
  fastify.post('/:publisherId/yield-recommendations/:recommendationId/measure', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, recommendationId } = request.params as { publisherId: string; recommendationId: string };

    const recommendation = db.select().from(yieldRecommendations)
      .where(and(
        eq(yieldRecommendations.id, recommendationId),
        eq(yieldRecommendations.publisherId, publisherId)
      ))
      .get();

    if (!recommendation || recommendation.status !== 'implemented') {
      return reply.status(400).send({ error: 'Recommendation must be implemented to measure impact' });
    }

    const measurementPeriod = safeJsonParseObject(recommendation.measurementPeriod, null);
    if (!measurementPeriod) {
      return reply.status(400).send({ error: 'No measurement period defined' });
    }

    try {
      // Measure actual impact
      const actualImpact = await measureRecommendationImpact(
        publisherId,
        recommendation.type,
        recommendation.targetEntity,
        measurementPeriod.start
      );

      // Update recommendation with measured impact
      db.update(yieldRecommendations)
        .set({
          actualImpact: JSON.stringify(actualImpact),
          measurementPeriod: JSON.stringify({
            ...measurementPeriod,
            end: new Date().toISOString(),
          }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(yieldRecommendations.id, recommendationId))
        .run();

      return reply.send({ actualImpact });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to measure impact',
        message: String(error),
      });
    }
  });

  // Get recommendation statistics
  fastify.get('/:publisherId/yield-recommendations/stats', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    const allRecs = db.select().from(yieldRecommendations)
      .where(eq(yieldRecommendations.publisherId, publisherId))
      .all();

    const stats = {
      total: allRecs.length,
      byStatus: {
        pending: allRecs.filter(r => r.status === 'pending').length,
        implemented: allRecs.filter(r => r.status === 'implemented').length,
        dismissed: allRecs.filter(r => r.status === 'dismissed').length,
        expired: allRecs.filter(r => r.status === 'expired').length,
      },
      byPriority: {
        critical: allRecs.filter(r => r.priority === 'critical').length,
        high: allRecs.filter(r => r.priority === 'high').length,
        medium: allRecs.filter(r => r.priority === 'medium').length,
        low: allRecs.filter(r => r.priority === 'low').length,
      },
      byType: {} as Record<string, number>,
      totalEstimatedImpact: 0,
      totalActualImpact: 0,
    };

    // Count by type and calculate impact
    allRecs.forEach(rec => {
      stats.byType[rec.type] = (stats.byType[rec.type] || 0) + 1;

      if (rec.estimatedImpact) {
        const estimated = safeJsonParseObject(rec.estimatedImpact, {}) as any;
        stats.totalEstimatedImpact += estimated.revenueChange || 0;
      }

      if (rec.actualImpact) {
        const actual = safeJsonParseObject(rec.actualImpact, {}) as any;
        stats.totalActualImpact += actual.revenueChange || 0;
      }
    });

    return reply.send({ stats });
  });
}
