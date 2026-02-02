import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { bidderMetrics } from '../db/schema.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '../middleware/auth';

interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  granularity?: 'hour' | 'day';
  bidderCode?: string;
  metric?: string;
}

/**
 * Analytics Dashboard Routes
 * Handles bidder performance metrics and analytics
 */
export default async function analyticsDashboardRoutes(fastify: FastifyInstance) {

  // Get bidder performance metrics
  fastify.get('/publishers/:publisherId/analytics/bidders', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { startDate, endDate, granularity = 'day', bidderCode } = request.query as AnalyticsQuery;

    try {
      const conditions = [eq(bidderMetrics.publisherId, publisherId)];

      if (startDate) {
        conditions.push(gte(bidderMetrics.metricDate, startDate));
      }

      if (endDate) {
        conditions.push(lte(bidderMetrics.metricDate, endDate));
      }

      if (bidderCode) {
        conditions.push(eq(bidderMetrics.bidderCode, bidderCode));
      }

      const metrics = db
        .select()
        .from(bidderMetrics)
        .where(and(...conditions))
        .all();

      // Transform metrics to include calculated rates
      const transformedMetrics = metrics.map((m) => ({
        bidderCode: m.bidderCode,
        date: m.metricDate,
        hour: m.metricHour,
        impressions: m.impressions,
        bids: m.bids,
        wins: m.wins,
        revenue: m.revenue / 100, // Convert from cents
        avgCpm: m.avgCpm / 100, // Convert from cents
        avgLatency: m.avgLatency,
        p95Latency: m.p95Latency,
        p99Latency: m.p99Latency,
        timeoutCount: m.timeoutCount,
        errorCount: m.errorCount,
        fillRate: m.fillRate ? m.fillRate / 10000 : null, // Convert from basis points
        winRate: m.winRate ? m.winRate / 10000 : null, // Convert from basis points
        countryCode: m.countryCode,
      }));

      return reply.send({ data: transformedMetrics });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to fetch bidder metrics',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Get geographic analytics
  fastify.get('/publishers/:publisherId/analytics/geo', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { startDate, endDate, metric = 'winRate' } = request.query as AnalyticsQuery;

    try {
      const conditions = [eq(bidderMetrics.publisherId, publisherId)];

      if (startDate) {
        conditions.push(gte(bidderMetrics.metricDate, startDate));
      }

      if (endDate) {
        conditions.push(lte(bidderMetrics.metricDate, endDate));
      }

      // Aggregate by country
      const geoMetrics = db
        .select({
          countryCode: bidderMetrics.countryCode,
          impressions: sql<number>`SUM(${bidderMetrics.impressions})`,
          avgWinRate: sql<number>`AVG(${bidderMetrics.winRate})`,
          avgCpm: sql<number>`AVG(${bidderMetrics.avgCpm})`,
          avgLatency: sql<number>`AVG(${bidderMetrics.avgLatency})`,
        })
        .from(bidderMetrics)
        .where(and(...conditions))
        .groupBy(bidderMetrics.countryCode)
        .all();

      const transformedGeoMetrics = geoMetrics.map((m) => ({
        countryCode: m.countryCode,
        impressions: m.impressions,
        winRate: m.avgWinRate ? m.avgWinRate / 10000 : 0,
        avgCpm: m.avgCpm ? m.avgCpm / 100 : 0,
        avgLatency: m.avgLatency || 0,
      }));

      return reply.send({ data: transformedGeoMetrics });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to fetch geo analytics',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Get time series data
  fastify.get('/publishers/:publisherId/analytics/timeseries', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { startDate, endDate, metric = 'revenue' } = request.query as AnalyticsQuery;

    try {
      const conditions = [eq(bidderMetrics.publisherId, publisherId)];

      if (startDate) {
        conditions.push(gte(bidderMetrics.metricDate, startDate));
      }

      if (endDate) {
        conditions.push(lte(bidderMetrics.metricDate, endDate));
      }

      // Aggregate by date
      const timeseriesData = db
        .select({
          date: bidderMetrics.metricDate,
          totalRevenue: sql<number>`SUM(${bidderMetrics.revenue})`,
          totalImpressions: sql<number>`SUM(${bidderMetrics.impressions})`,
          avgWinRate: sql<number>`AVG(${bidderMetrics.winRate})`,
          avgLatency: sql<number>`AVG(${bidderMetrics.avgLatency})`,
        })
        .from(bidderMetrics)
        .where(and(...conditions))
        .groupBy(bidderMetrics.metricDate)
        .orderBy(bidderMetrics.metricDate)
        .all();

      const transformedData = timeseriesData.map((d) => ({
        timestamp: d.date,
        revenue: d.totalRevenue ? d.totalRevenue / 100 : 0,
        impressions: d.totalImpressions || 0,
        winRate: d.avgWinRate ? d.avgWinRate / 10000 : 0,
        avgLatency: d.avgLatency || 0,
      }));

      return reply.send({ data: transformedData });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to fetch timeseries data',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Get component health
  fastify.get('/publishers/:publisherId/analytics/health', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { componentType, componentCode } = request.query as {
      componentType?: string;
      componentCode?: string;
    };

    try {
      if (!componentCode) {
        return reply.code(400).send({ error: 'Component code is required' });
      }

      // Get recent metrics for the component
      const recentMetrics = db
        .select()
        .from(bidderMetrics)
        .where(
          and(
            eq(bidderMetrics.publisherId, publisherId),
            eq(bidderMetrics.bidderCode, componentCode)
          )
        )
        .orderBy(sql`${bidderMetrics.metricDate} DESC`)
        .limit(24) // Last 24 hours or days
        .all();

      if (recentMetrics.length === 0) {
        return reply.send({
          data: {
            componentCode,
            status: 'unknown',
            metrics: {},
            alerts: [],
          },
        });
      }

      // Calculate health metrics
      const totalErrors = recentMetrics.reduce((sum, m) => sum + m.errorCount, 0);
      const totalTimeouts = recentMetrics.reduce((sum, m) => sum + m.timeoutCount, 0);
      const totalBids = recentMetrics.reduce((sum, m) => sum + m.bids, 0);
      const avgLatency = recentMetrics.reduce((sum, m) => sum + m.avgLatency, 0) / recentMetrics.length;

      const errorRate = totalBids > 0 ? (totalErrors / totalBids) * 100 : 0;
      const timeoutRate = totalBids > 0 ? (totalTimeouts / totalBids) * 100 : 0;

      // Determine health status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      const alerts = [];

      if (errorRate > 10) {
        status = 'critical';
        alerts.push({ severity: 'critical', message: `High error rate: ${errorRate.toFixed(2)}%` });
      } else if (errorRate > 5) {
        status = 'warning';
        alerts.push({ severity: 'warning', message: `Elevated error rate: ${errorRate.toFixed(2)}%` });
      }

      if (timeoutRate > 20) {
        status = 'critical';
        alerts.push({ severity: 'critical', message: `High timeout rate: ${timeoutRate.toFixed(2)}%` });
      } else if (timeoutRate > 10) {
        if (status !== 'critical') status = 'warning';
        alerts.push({ severity: 'warning', message: `Elevated timeout rate: ${timeoutRate.toFixed(2)}%` });
      }

      if (avgLatency > 1500) {
        if (status !== 'critical') status = 'warning';
        alerts.push({ severity: 'warning', message: `High average latency: ${avgLatency.toFixed(0)}ms` });
      }

      return reply.send({
        data: {
          componentCode,
          status,
          metrics: {
            errorRate: errorRate.toFixed(2),
            timeoutRate: timeoutRate.toFixed(2),
            avgLatency: avgLatency.toFixed(0),
            uptime: ((1 - errorRate / 100) * 100).toFixed(2),
          },
          alerts,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to fetch component health',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Ingest metrics (for publishers to submit performance data)
  fastify.post('/publishers/:publisherId/analytics/ingest', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const bodyMetrics = request.body as any;

    // Handle both single object and array
    const metricsArray = Array.isArray(bodyMetrics) ? bodyMetrics : [bodyMetrics];

    try {
      const now = new Date().toISOString();

      // Insert metrics into database
      for (const metric of metricsArray) {
        const {
          bidderCode,
          date,
          impressions = 0,
          bids = 0,
          wins = 0,
          revenue = 0,
          avgCpm = 0,
          avgLatency = 0,
          fillRate = null,
          winRate = null,
          countryCode = 'US',
        } = metric;

        // Check if record already exists for this date/bidder/country
        const existing = db
          .select()
          .from(bidderMetrics)
          .where(
            and(
              eq(bidderMetrics.publisherId, publisherId),
              eq(bidderMetrics.bidderCode, bidderCode),
              eq(bidderMetrics.metricDate, date),
              eq(bidderMetrics.countryCode, countryCode)
            )
          )
          .get();

        if (existing) {
          // Update existing record
          db.update(bidderMetrics)
            .set({
              impressions,
              bids,
              wins,
              revenue,
              avgCpm,
              avgLatency,
              fillRate,
              winRate,
            })
            .where(eq(bidderMetrics.id, existing.id))
            .run();
        } else {
          // Insert new record
          db.insert(bidderMetrics)
            .values({
              id: uuidv4(),
              publisherId,
              bidderCode,
              metricDate: date,
              impressions,
              bids,
              wins,
              revenue,
              avgCpm,
              avgLatency,
              fillRate,
              winRate,
              countryCode,
              createdAt: now,
            })
            .run();
        }
      }

      return reply.send({
        data: { received: metricsArray.length, inserted: metricsArray.length },
        message: 'Metrics ingested successfully',
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to ingest metrics',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
