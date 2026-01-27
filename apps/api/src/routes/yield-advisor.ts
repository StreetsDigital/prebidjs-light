import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { yieldRecommendations, analyticsEvents, publisherBidders } from '../db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

export default async function yieldAdvisorRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================

  // Get all recommendations for a publisher
  fastify.get('/:publisherId/yield-recommendations', async (request, reply) => {
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
      dataSnapshot: JSON.parse(rec.dataSnapshot),
      estimatedImpact: rec.estimatedImpact ? JSON.parse(rec.estimatedImpact) : null,
      recommendedAction: JSON.parse(rec.recommendedAction),
      actualImpact: rec.actualImpact ? JSON.parse(rec.actualImpact) : null,
      measurementPeriod: rec.measurementPeriod ? JSON.parse(rec.measurementPeriod) : null,
    }));

    return reply.send({ recommendations: recommendationsWithData });
  });

  // Generate new recommendations
  fastify.post('/:publisherId/yield-recommendations/generate', async (request, reply) => {
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
          type: rec.type,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          dataSnapshot: JSON.stringify(rec.dataSnapshot),
          estimatedImpact: rec.estimatedImpact ? JSON.stringify(rec.estimatedImpact) : null,
          targetEntity: rec.targetEntity || null,
          recommendedAction: JSON.stringify(rec.recommendedAction),
          status: 'pending',
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
  fastify.post('/:publisherId/yield-recommendations/:recommendationId/implement', async (request, reply) => {
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

    const action = JSON.parse(recommendation.recommendedAction);
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
  fastify.post('/:publisherId/yield-recommendations/:recommendationId/dismiss', async (request, reply) => {
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
  fastify.post('/:publisherId/yield-recommendations/:recommendationId/measure', async (request, reply) => {
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

    const measurementPeriod = recommendation.measurementPeriod ? JSON.parse(recommendation.measurementPeriod) : null;
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
  fastify.get('/:publisherId/yield-recommendations/stats', async (request, reply) => {
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
        const estimated = JSON.parse(rec.estimatedImpact);
        stats.totalEstimatedImpact += estimated.revenueChange || 0;
      }

      if (rec.actualImpact) {
        const actual = JSON.parse(rec.actualImpact);
        stats.totalActualImpact += actual.revenueChange || 0;
      }
    });

    return reply.send({ stats });
  });
}

// ============================================================================
// RECOMMENDATION GENERATION
// ============================================================================

async function generateRecommendations(publisherId: string, days: number): Promise<any[]> {
  const recommendations: any[] = [];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get analytics events
  const events = db.select().from(analyticsEvents)
    .where(and(
      eq(analyticsEvents.publisherId, publisherId),
      gte(analyticsEvents.timestamp, startDate)
    ))
    .all();

  // Get current bidders
  const bidders = db.select().from(publisherBidders)
    .where(eq(publisherBidders.publisherId, publisherId))
    .all();

  // Analyze each bidder
  for (const bidder of bidders) {
    const bidderEvents = events.filter(e => e.bidderCode === bidder.bidderCode);
    const bidResponses = bidderEvents.filter(e => e.eventType === 'bidResponse');
    const bidWins = bidderEvents.filter(e => e.eventType === 'bidWon');
    const timeouts = bidResponses.filter(e => e.timeout);

    if (bidResponses.length === 0) continue;

    // Calculate metrics
    const timeoutRate = (timeouts.length / bidResponses.length) * 100;
    const fillRate = bidResponses.length > 0 ? (bidWins.length / bidResponses.length) * 100 : 0;
    const avgCpm = bidWins.length > 0
      ? bidWins.reduce((sum, e) => sum + (parseFloat(e.cpm || '0') || 0), 0) / bidWins.length
      : 0;
    const revenue = bidWins.reduce((sum, e) => sum + (parseFloat(e.cpm || '0') || 0), 0);

    // RECOMMENDATION 1: Disable underperforming bidders
    if (revenue < 1 && bidResponses.length > 100 && bidder.enabled) {
      recommendations.push({
        type: 'disable_bidder',
        priority: revenue === 0 ? 'high' : 'medium',
        title: `Disable ${bidder.bidderCode}`,
        description: `This bidder has generated only $${revenue.toFixed(2)} in the last ${days} days despite ${bidResponses.length} bid requests. Disabling it will reduce latency and improve user experience.`,
        dataSnapshot: {
          bidderCode: bidder.bidderCode,
          bidResponses: bidResponses.length,
          revenue,
          fillRate: fillRate.toFixed(1),
          avgCpm: avgCpm.toFixed(2),
        },
        estimatedImpact: {
          revenueChange: -revenue,
          percentChange: 0,
          latencyReduction: 50, // ms estimate
          confidence: 'high',
        },
        targetEntity: bidder.bidderCode,
        recommendedAction: {
          action: 'disable_bidder',
          bidderCode: bidder.bidderCode,
        },
        confidence: 'high',
      });
    }

    // RECOMMENDATION 2: Reduce timeout for slow bidders
    if (timeoutRate > 15 && bidResponses.length > 50 && bidder.enabled) {
      const currentTimeout = bidder.timeoutOverride || 1500;
      const recommendedTimeout = Math.max(500, Math.floor(currentTimeout * 0.7));

      recommendations.push({
        type: 'adjust_timeout',
        priority: timeoutRate > 30 ? 'high' : 'medium',
        title: `Reduce timeout for ${bidder.bidderCode}`,
        description: `This bidder times out ${timeoutRate.toFixed(1)}% of the time. Reducing the timeout from ${currentTimeout}ms to ${recommendedTimeout}ms will improve page load times.`,
        dataSnapshot: {
          bidderCode: bidder.bidderCode,
          timeoutRate: timeoutRate.toFixed(1),
          timeouts: timeouts.length,
          currentTimeout,
        },
        estimatedImpact: {
          revenueChange: -revenue * 0.1, // Estimate 10% revenue loss
          percentChange: -10,
          latencyReduction: currentTimeout - recommendedTimeout,
          confidence: 'medium',
        },
        targetEntity: bidder.bidderCode,
        recommendedAction: {
          action: 'adjust_timeout',
          bidderCode: bidder.bidderCode,
          newTimeout: recommendedTimeout,
        },
        confidence: 'medium',
      });
    }

    // RECOMMENDATION 3: Run A/B test for high-revenue bidders
    if (revenue > 50 && fillRate < 50 && bidder.enabled) {
      recommendations.push({
        type: 'run_ab_test',
        priority: 'low',
        title: `Test timeout optimization for ${bidder.bidderCode}`,
        description: `This bidder generates significant revenue ($${revenue.toFixed(2)}) but has a low fill rate (${fillRate.toFixed(1)}%). Test different timeout values to find the optimal balance.`,
        dataSnapshot: {
          bidderCode: bidder.bidderCode,
          revenue,
          fillRate: fillRate.toFixed(1),
          avgCpm: avgCpm.toFixed(2),
        },
        estimatedImpact: {
          revenueChange: revenue * 0.15, // Estimate 15% uplift
          percentChange: 15,
          confidence: 'low',
        },
        targetEntity: bidder.bidderCode,
        recommendedAction: {
          action: 'create_ab_test',
          bidderCode: bidder.bidderCode,
          testVariants: [
            { timeout: 1000, traffic: 33 },
            { timeout: 1500, traffic: 33 },
            { timeout: 2000, traffic: 34 },
          ],
        },
        confidence: 'low',
      });
    }

    // RECOMMENDATION 4: Enable disabled high-performers
    if (!bidder.enabled && revenue > 20) {
      recommendations.push({
        type: 'enable_bidder',
        priority: 'medium',
        title: `Re-enable ${bidder.bidderCode}`,
        description: `This bidder generated $${revenue.toFixed(2)} before being disabled. Consider re-enabling it to capture additional revenue.`,
        dataSnapshot: {
          bidderCode: bidder.bidderCode,
          revenue,
          fillRate: fillRate.toFixed(1),
          avgCpm: avgCpm.toFixed(2),
        },
        estimatedImpact: {
          revenueChange: revenue,
          percentChange: 10,
          confidence: 'medium',
        },
        targetEntity: bidder.bidderCode,
        recommendedAction: {
          action: 'enable_bidder',
          bidderCode: bidder.bidderCode,
        },
        confidence: 'medium',
      });
    }
  }

  // RECOMMENDATION 5: Overall floor price optimization
  const allBidWins = events.filter(e => e.eventType === 'bidWon');
  if (allBidWins.length > 100) {
    const cpms = allBidWins.map(e => parseFloat(e.cpm || '0')).filter(c => c > 0).sort((a, b) => a - b);
    const medianCpm = cpms[Math.floor(cpms.length / 2)];
    const suggestedFloor = Math.floor(medianCpm * 0.5 * 100) / 100; // 50% of median

    if (suggestedFloor > 0.1) {
      recommendations.push({
        type: 'adjust_floor_price',
        priority: 'low',
        title: 'Optimize floor prices',
        description: `Based on your median CPM of $${medianCpm.toFixed(2)}, consider setting a floor price of $${suggestedFloor.toFixed(2)} to filter out low-quality bids.`,
        dataSnapshot: {
          totalBids: allBidWins.length,
          medianCpm: medianCpm.toFixed(2),
          suggestedFloor: suggestedFloor.toFixed(2),
        },
        estimatedImpact: {
          revenueChange: 0,
          percentChange: 5,
          qualityImprovement: true,
          confidence: 'low',
        },
        targetEntity: null,
        recommendedAction: {
          action: 'set_floor_price',
          floorPrice: suggestedFloor,
        },
        confidence: 'low',
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

  return recommendations;
}

async function implementRecommendation(publisherId: string, type: string, action: any): Promise<void> {
  switch (type) {
    case 'disable_bidder':
      db.update(publisherBidders)
        .set({ enabled: false, updatedAt: new Date().toISOString() })
        .where(and(
          eq(publisherBidders.publisherId, publisherId),
          eq(publisherBidders.bidderCode, action.bidderCode)
        ))
        .run();
      break;

    case 'enable_bidder':
      db.update(publisherBidders)
        .set({ enabled: true, updatedAt: new Date().toISOString() })
        .where(and(
          eq(publisherBidders.publisherId, publisherId),
          eq(publisherBidders.bidderCode, action.bidderCode)
        ))
        .run();
      break;

    case 'adjust_timeout':
      db.update(publisherBidders)
        .set({ timeoutOverride: action.newTimeout, updatedAt: new Date().toISOString() })
        .where(and(
          eq(publisherBidders.publisherId, publisherId),
          eq(publisherBidders.bidderCode, action.bidderCode)
        ))
        .run();
      break;

    default:
      console.log(`No implementation handler for recommendation type: ${type}`);
  }
}

async function measureRecommendationImpact(
  publisherId: string,
  type: string,
  targetEntity: string | null,
  implementedAt: string
): Promise<any> {
  const beforeStart = new Date(new Date(implementedAt).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const afterStart = implementedAt;
  const now = new Date().toISOString();

  // Get events before and after implementation
  const beforeEvents = db.select().from(analyticsEvents)
    .where(and(
      eq(analyticsEvents.publisherId, publisherId),
      gte(analyticsEvents.timestamp, beforeStart),
      sql`${analyticsEvents.timestamp} < ${implementedAt}`,
      targetEntity ? eq(analyticsEvents.bidderCode, targetEntity) : sql`1=1`
    ))
    .all();

  const afterEvents = db.select().from(analyticsEvents)
    .where(and(
      eq(analyticsEvents.publisherId, publisherId),
      gte(analyticsEvents.timestamp, afterStart),
      sql`${analyticsEvents.timestamp} <= ${now}`,
      targetEntity ? eq(analyticsEvents.bidderCode, targetEntity) : sql`1=1`
    ))
    .all();

  // Calculate before metrics
  const beforeWins = beforeEvents.filter(e => e.eventType === 'bidWon');
  const beforeRevenue = beforeWins.reduce((sum, e) => sum + (parseFloat(e.cpm || '0') || 0), 0);

  // Calculate after metrics
  const afterWins = afterEvents.filter(e => e.eventType === 'bidWon');
  const afterRevenue = afterWins.reduce((sum, e) => sum + (parseFloat(e.cpm || '0') || 0), 0);

  // Normalize by time period
  const beforeDays = (new Date(implementedAt).getTime() - new Date(beforeStart).getTime()) / (24 * 60 * 60 * 1000);
  const afterDays = (new Date(now).getTime() - new Date(afterStart).getTime()) / (24 * 60 * 60 * 1000);

  const beforeDailyRevenue = beforeRevenue / beforeDays;
  const afterDailyRevenue = afterRevenue / afterDays;

  const revenueChange = afterDailyRevenue - beforeDailyRevenue;
  const percentChange = beforeDailyRevenue > 0 ? (revenueChange / beforeDailyRevenue) * 100 : 0;

  return {
    revenueChange,
    percentChange,
    beforeDailyRevenue,
    afterDailyRevenue,
    beforePeriodDays: beforeDays,
    afterPeriodDays: afterDays,
  };
}
