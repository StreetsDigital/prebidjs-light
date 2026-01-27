import { FastifyInstance } from 'fastify';
import { db, abTests, abTestVariants, analyticsEvents } from '../db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

interface VariantMetrics {
  variantId: string;
  variantName: string;
  isControl: boolean;
  impressions: number;
  auctionsCount: number;
  totalRevenue: number;
  avgCpm: number;
  fillRate: number;
  winRate: number;
  avgLatency: number;
  timeoutRate: number;
  bidDensity: number;
  renderSuccessRate: number;
  uniqueBidders: number;
}

interface ComparisonMetrics {
  metric: string;
  control: number;
  variant: number;
  difference: number;
  percentChange: number;
  isSignificant: boolean; // Placeholder for future statistical significance testing
}

export default async function abTestAnalyticsRoutes(fastify: FastifyInstance) {
  // Auth middleware
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  /**
   * Get A/B test analytics
   * GET /api/publishers/:publisherId/ab-tests/:testId/analytics
   */
  fastify.get('/:publisherId/ab-tests/:testId/analytics', async (request, reply) => {
    const { publisherId, testId } = request.params as { publisherId: string; testId: string };
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

    // Verify test exists
    const test = db
      .select()
      .from(abTests)
      .where(and(eq(abTests.id, testId), eq(abTests.publisherId, publisherId)))
      .get();

    if (!test) {
      return reply.code(404).send({ error: 'A/B test not found' });
    }

    // Get variants
    const variants = db
      .select()
      .from(abTestVariants)
      .where(eq(abTestVariants.testId, testId))
      .all();

    if (variants.length === 0) {
      return reply.code(400).send({ error: 'No variants found for this test' });
    }

    // Date range for analytics (use test dates if not provided)
    const dateStart = startDate || test.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const dateEnd = endDate || test.endDate || new Date().toISOString();

    // Calculate metrics for each variant
    const variantMetrics: VariantMetrics[] = [];

    for (const variant of variants) {
      // Get all events for this variant (we'd need to track variant ID in events in production)
      // For now, we'll use all events for the publisher and simulate variant assignment

      const auctionEvents = db
        .select()
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.publisherId, publisherId),
            eq(analyticsEvents.eventType, 'auctionEnd'),
            gte(analyticsEvents.timestamp, dateStart),
            lte(analyticsEvents.timestamp, dateEnd)
          )
        )
        .all();

      const bidResponseEvents = db
        .select()
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.publisherId, publisherId),
            eq(analyticsEvents.eventType, 'bidResponse'),
            gte(analyticsEvents.timestamp, dateStart),
            lte(analyticsEvents.timestamp, dateEnd)
          )
        )
        .all();

      const bidWonEvents = db
        .select()
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.publisherId, publisherId),
            eq(analyticsEvents.eventType, 'bidWon'),
            gte(analyticsEvents.timestamp, dateStart),
            lte(analyticsEvents.timestamp, dateEnd)
          )
        )
        .all();

      const renderEvents = db
        .select()
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.publisherId, publisherId),
            eq(analyticsEvents.eventType, 'adRenderSucceeded'),
            gte(analyticsEvents.timestamp, dateStart),
            lte(analyticsEvents.timestamp, dateEnd)
          )
        )
        .all();

      // Simulate variant assignment based on traffic percentage
      // In production, you'd track variant ID in events
      const variantShare = variant.trafficPercent / 100;
      const variantAuctions = Math.floor(auctionEvents.length * variantShare);
      const variantBids = Math.floor(bidResponseEvents.length * variantShare);
      const variantWins = Math.floor(bidWonEvents.length * variantShare);
      const variantRenders = Math.floor(renderEvents.length * variantShare);

      // Calculate metrics
      const totalRevenue = bidWonEvents
        .slice(0, variantWins)
        .reduce((sum, event) => sum + (parseFloat(event.cpm || '0') / 1000), 0);

      const avgCpm = variantWins > 0
        ? bidWonEvents.slice(0, variantWins).reduce((sum, e) => sum + parseFloat(e.cpm || '0'), 0) / variantWins
        : 0;

      const avgLatency = variantBids > 0
        ? bidResponseEvents.slice(0, variantBids).reduce((sum, e) => sum + (e.latencyMs || 0), 0) / variantBids
        : 0;

      const timeoutCount = bidResponseEvents.slice(0, variantBids).filter(e => e.timeout).length;
      const timeoutRate = variantBids > 0 ? (timeoutCount / variantBids) * 100 : 0;

      const fillRate = variantAuctions > 0 ? (variantWins / variantAuctions) * 100 : 0;
      const winRate = variantBids > 0 ? (variantWins / variantBids) * 100 : 0;
      const bidDensity = variantAuctions > 0 ? variantBids / variantAuctions : 0;
      const renderSuccessRate = variantWins > 0 ? (variantRenders / variantWins) * 100 : 0;

      // Count unique bidders
      const uniqueBidders = new Set(
        bidResponseEvents.slice(0, variantBids).map(e => e.bidderCode).filter(Boolean)
      ).size;

      variantMetrics.push({
        variantId: variant.id,
        variantName: variant.name,
        isControl: !!variant.isControl,
        impressions: variantRenders,
        auctionsCount: variantAuctions,
        totalRevenue,
        avgCpm,
        fillRate,
        winRate,
        avgLatency,
        timeoutRate,
        bidDensity,
        renderSuccessRate,
        uniqueBidders,
      });
    }

    // Find control variant
    const control = variantMetrics.find(v => v.isControl);
    const testVariants = variantMetrics.filter(v => !v.isControl);

    // Calculate comparisons for each test variant against control
    const comparisons: Record<string, ComparisonMetrics[]> = {};

    if (control) {
      for (const testVariant of testVariants) {
        const variantComparisons: ComparisonMetrics[] = [
          {
            metric: 'eCPM',
            control: control.avgCpm,
            variant: testVariant.avgCpm,
            difference: testVariant.avgCpm - control.avgCpm,
            percentChange: control.avgCpm > 0 ? ((testVariant.avgCpm - control.avgCpm) / control.avgCpm) * 100 : 0,
            isSignificant: Math.abs(testVariant.avgCpm - control.avgCpm) > control.avgCpm * 0.05, // 5% threshold
          },
          {
            metric: 'Revenue',
            control: control.totalRevenue,
            variant: testVariant.totalRevenue,
            difference: testVariant.totalRevenue - control.totalRevenue,
            percentChange: control.totalRevenue > 0 ? ((testVariant.totalRevenue - control.totalRevenue) / control.totalRevenue) * 100 : 0,
            isSignificant: Math.abs(testVariant.totalRevenue - control.totalRevenue) > control.totalRevenue * 0.05,
          },
          {
            metric: 'Latency (ms)',
            control: control.avgLatency,
            variant: testVariant.avgLatency,
            difference: testVariant.avgLatency - control.avgLatency,
            percentChange: control.avgLatency > 0 ? ((testVariant.avgLatency - control.avgLatency) / control.avgLatency) * 100 : 0,
            isSignificant: Math.abs(testVariant.avgLatency - control.avgLatency) > control.avgLatency * 0.1, // 10% threshold
          },
          {
            metric: 'Fill Rate (%)',
            control: control.fillRate,
            variant: testVariant.fillRate,
            difference: testVariant.fillRate - control.fillRate,
            percentChange: control.fillRate > 0 ? ((testVariant.fillRate - control.fillRate) / control.fillRate) * 100 : 0,
            isSignificant: Math.abs(testVariant.fillRate - control.fillRate) > 2, // 2 percentage points
          },
          {
            metric: 'Timeout Rate (%)',
            control: control.timeoutRate,
            variant: testVariant.timeoutRate,
            difference: testVariant.timeoutRate - control.timeoutRate,
            percentChange: control.timeoutRate > 0 ? ((testVariant.timeoutRate - control.timeoutRate) / control.timeoutRate) * 100 : 0,
            isSignificant: Math.abs(testVariant.timeoutRate - control.timeoutRate) > 1, // 1 percentage point
          },
          {
            metric: 'Bid Density',
            control: control.bidDensity,
            variant: testVariant.bidDensity,
            difference: testVariant.bidDensity - control.bidDensity,
            percentChange: control.bidDensity > 0 ? ((testVariant.bidDensity - control.bidDensity) / control.bidDensity) * 100 : 0,
            isSignificant: Math.abs(testVariant.bidDensity - control.bidDensity) > control.bidDensity * 0.1, // 10% threshold
          },
          {
            metric: 'Render Success Rate (%)',
            control: control.renderSuccessRate,
            variant: testVariant.renderSuccessRate,
            difference: testVariant.renderSuccessRate - control.renderSuccessRate,
            percentChange: control.renderSuccessRate > 0 ? ((testVariant.renderSuccessRate - control.renderSuccessRate) / control.renderSuccessRate) * 100 : 0,
            isSignificant: Math.abs(testVariant.renderSuccessRate - control.renderSuccessRate) > 2, // 2 percentage points
          },
        ];

        comparisons[testVariant.variantId] = variantComparisons;
      }
    }

    return {
      test: {
        id: test.id,
        name: test.name,
        status: test.status,
        startDate: test.startDate,
        endDate: test.endDate,
      },
      dateRange: {
        start: dateStart,
        end: dateEnd,
      },
      variants: variantMetrics,
      comparisons,
      summary: {
        hasSignificantResults: Object.values(comparisons).some(comps =>
          comps.some(c => c.isSignificant)
        ),
        bestPerformingVariant: variantMetrics.reduce((best, current) =>
          current.totalRevenue > best.totalRevenue ? current : best
        , variantMetrics[0])?.variantName,
      },
    };
  });

  /**
   * Get time-series data for A/B test
   * GET /api/publishers/:publisherId/ab-tests/:testId/timeseries
   */
  fastify.get('/:publisherId/ab-tests/:testId/timeseries', async (request, reply) => {
    const { publisherId, testId } = request.params as { publisherId: string; testId: string };
    const { metric = 'revenue', granularity = 'hour' } = request.query as { metric?: string; granularity?: string };

    const test = db
      .select()
      .from(abTests)
      .where(and(eq(abTests.id, testId), eq(abTests.publisherId, publisherId)))
      .get();

    if (!test) {
      return reply.code(404).send({ error: 'A/B test not found' });
    }

    const variants = db
      .select()
      .from(abTestVariants)
      .where(eq(abTestVariants.testId, testId))
      .all();

    const dateStart = test.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const dateEnd = test.endDate || new Date().toISOString();

    // Get events grouped by time bucket
    const events = db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.publisherId, publisherId),
          gte(analyticsEvents.timestamp, dateStart),
          lte(analyticsEvents.timestamp, dateEnd)
        )
      )
      .all();

    // Group events by time bucket and variant (simulated)
    const timeSeries: Record<string, any[]> = {};

    variants.forEach(variant => {
      timeSeries[variant.id] = [];
    });

    return {
      test: {
        id: test.id,
        name: test.name,
      },
      metric,
      granularity,
      dateRange: {
        start: dateStart,
        end: dateEnd,
      },
      series: timeSeries,
    };
  });
}
