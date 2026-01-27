import { FastifyInstance } from 'fastify';
import { db, analyticsEvents, publishers, bidders } from '../db';
import { eq, and, gte, lte, sql, desc, inArray } from 'drizzle-orm';

interface BidderMetrics {
  bidderCode: string;
  bidderName: string;
  requests: number;
  responses: number;
  wins: number;
  timeouts: number;
  totalRevenue: number;
  avgCpm: number;
  avgLatency: number;
  fillRate: number;
  winRate: number;
  timeoutRate: number;
  responseRate: number;
  revenueShare: number;
  healthScore: number;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface TimeRange {
  start: string;
  end: string;
}

export default async function bidderHealthRoutes(fastify: FastifyInstance) {
  // Auth middleware
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  /**
   * Get bidder health metrics for a publisher
   * GET /api/publishers/:publisherId/bidder-health
   */
  fastify.get('/:publisherId/bidder-health', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      timeRange = '24h',
      startDate,
      endDate
    } = request.query as {
      timeRange?: string;
      startDate?: string;
      endDate?: string;
    };

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Calculate time range
    const now = new Date();
    let dateStart: string;
    let dateEnd: string = endDate || now.toISOString();

    if (startDate) {
      dateStart = startDate;
    } else {
      const hours = timeRange === '1h' ? 1 :
                   timeRange === '6h' ? 6 :
                   timeRange === '24h' ? 24 :
                   timeRange === '7d' ? 168 :
                   timeRange === '30d' ? 720 : 24;
      dateStart = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
    }

    // Calculate comparison period (same duration before current period)
    const duration = new Date(dateEnd).getTime() - new Date(dateStart).getTime();
    const comparisonStart = new Date(new Date(dateStart).getTime() - duration).toISOString();
    const comparisonEnd = dateStart;

    // Get all events for the current period
    const currentEvents = db
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

    // Get events for comparison period
    const comparisonEvents = db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.publisherId, publisherId),
          gte(analyticsEvents.timestamp, comparisonStart),
          lte(analyticsEvents.timestamp, comparisonEnd)
        )
      )
      .all();

    // Get publisher's configured bidders
    const publisherBidders = db
      .select()
      .from(bidders)
      .where(eq(bidders.publisherId, publisherId))
      .all();

    // Group events by bidder code
    const bidderGroups = new Map<string, typeof currentEvents>();
    const comparisonBidderGroups = new Map<string, typeof comparisonEvents>();

    currentEvents.forEach(event => {
      if (event.bidderCode) {
        if (!bidderGroups.has(event.bidderCode)) {
          bidderGroups.set(event.bidderCode, []);
        }
        bidderGroups.get(event.bidderCode)!.push(event);
      }
    });

    comparisonEvents.forEach(event => {
      if (event.bidderCode) {
        if (!comparisonBidderGroups.has(event.bidderCode)) {
          comparisonBidderGroups.set(event.bidderCode, []);
        }
        comparisonBidderGroups.get(event.bidderCode)!.push(event);
      }
    });

    // Calculate total revenue for revenue share calculation
    const totalRevenue = currentEvents
      .filter(e => e.eventType === 'bidWon')
      .reduce((sum, e) => sum + (parseFloat(e.cpm || '0') / 1000), 0);

    // Calculate metrics for each bidder
    const bidderMetrics: BidderMetrics[] = [];

    for (const [bidderCode, events] of bidderGroups.entries()) {
      // Find bidder config
      const bidderConfig = publisherBidders.find(b => b.bidderCode === bidderCode);
      const bidderName = bidderConfig?.bidderCode || bidderCode;

      // Current period metrics
      const bidResponses = events.filter(e => e.eventType === 'bidResponse');
      const bidWins = events.filter(e => e.eventType === 'bidWon');
      const timeoutEvents = bidResponses.filter(e => e.timeout);

      const requests = bidResponses.length;
      const responses = bidResponses.filter(e => !e.timeout).length;
      const wins = bidWins.length;
      const timeouts = timeoutEvents.length;

      const revenue = bidWins.reduce((sum, e) => sum + (parseFloat(e.cpm || '0') / 1000), 0);
      const avgCpm = wins > 0 ? bidWins.reduce((sum, e) => sum + parseFloat(e.cpm || '0'), 0) / wins : 0;
      const avgLatency = responses > 0
        ? bidResponses.filter(e => !e.timeout).reduce((sum, e) => sum + (e.latencyMs || 0), 0) / responses
        : 0;

      const fillRate = requests > 0 ? (responses / requests) * 100 : 0;
      const winRate = responses > 0 ? (wins / responses) * 100 : 0;
      const timeoutRate = requests > 0 ? (timeouts / requests) * 100 : 0;
      const responseRate = requests > 0 ? (responses / requests) * 100 : 0;
      const revenueShare = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

      // Comparison period metrics for trend
      const comparisonBidderEvents = comparisonBidderGroups.get(bidderCode) || [];
      const comparisonResponses = comparisonBidderEvents.filter(e => e.eventType === 'bidResponse' && !e.timeout);
      const comparisonWins = comparisonBidderEvents.filter(e => e.eventType === 'bidWon');
      const comparisonRevenue = comparisonWins.reduce((sum, e) => sum + (parseFloat(e.cpm || '0') / 1000), 0);

      // Calculate trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (comparisonRevenue > 0) {
        const revenueChange = ((revenue - comparisonRevenue) / comparisonRevenue) * 100;
        if (revenueChange > 5) trend = 'up';
        else if (revenueChange < -5) trend = 'down';
      } else if (revenue > 0) {
        trend = 'up';
      }

      // Calculate health score (0-100)
      // Factors: response rate (30%), win rate (25%), low timeout rate (25%), revenue contribution (20%)
      const healthScore = Math.min(100, Math.round(
        (responseRate * 0.3) +
        (winRate * 0.25) +
        ((100 - timeoutRate) * 0.25) +
        (revenueShare * 0.20)
      ));

      // Determine status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (healthScore < 40 || timeoutRate > 50) {
        status = 'critical';
      } else if (healthScore < 60 || timeoutRate > 25) {
        status = 'warning';
      }

      bidderMetrics.push({
        bidderCode,
        bidderName,
        requests,
        responses,
        wins,
        timeouts,
        totalRevenue: revenue,
        avgCpm,
        avgLatency,
        fillRate,
        winRate,
        timeoutRate,
        responseRate,
        revenueShare,
        healthScore,
        status,
        trend,
      });
    }

    // Sort by revenue (highest first)
    bidderMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Calculate overall summary
    const summary = {
      totalBidders: bidderMetrics.length,
      activeBidders: bidderMetrics.filter(b => b.requests > 0).length,
      healthyBidders: bidderMetrics.filter(b => b.status === 'healthy').length,
      warningBidders: bidderMetrics.filter(b => b.status === 'warning').length,
      criticalBidders: bidderMetrics.filter(b => b.status === 'critical').length,
      totalRequests: bidderMetrics.reduce((sum, b) => sum + b.requests, 0),
      totalResponses: bidderMetrics.reduce((sum, b) => sum + b.responses, 0),
      totalWins: bidderMetrics.reduce((sum, b) => sum + b.wins, 0),
      totalTimeouts: bidderMetrics.reduce((sum, b) => sum + b.timeouts, 0),
      totalRevenue,
      avgResponseRate: bidderMetrics.length > 0
        ? bidderMetrics.reduce((sum, b) => sum + b.responseRate, 0) / bidderMetrics.length
        : 0,
      avgTimeoutRate: bidderMetrics.length > 0
        ? bidderMetrics.reduce((sum, b) => sum + b.timeoutRate, 0) / bidderMetrics.length
        : 0,
      avgHealthScore: bidderMetrics.length > 0
        ? bidderMetrics.reduce((sum, b) => sum + b.healthScore, 0) / bidderMetrics.length
        : 0,
    };

    // Identify problem bidders that need attention
    const alerts = [];

    for (const bidder of bidderMetrics) {
      if (bidder.timeoutRate > 50 && bidder.requests > 10) {
        alerts.push({
          severity: 'critical',
          bidderCode: bidder.bidderCode,
          message: `${bidder.bidderName} has very high timeout rate (${bidder.timeoutRate.toFixed(1)}%)`,
          recommendation: 'Consider increasing timeout or disabling this bidder',
        });
      } else if (bidder.timeoutRate > 25 && bidder.requests > 10) {
        alerts.push({
          severity: 'warning',
          bidderCode: bidder.bidderCode,
          message: `${bidder.bidderName} has elevated timeout rate (${bidder.timeoutRate.toFixed(1)}%)`,
          recommendation: 'Monitor closely or adjust timeout settings',
        });
      }

      if (bidder.responseRate < 50 && bidder.requests > 10) {
        alerts.push({
          severity: 'warning',
          bidderCode: bidder.bidderCode,
          message: `${bidder.bidderName} has low response rate (${bidder.responseRate.toFixed(1)}%)`,
          recommendation: 'Check bidder configuration and connectivity',
        });
      }

      if (bidder.avgLatency > 1500 && bidder.responses > 5) {
        alerts.push({
          severity: 'warning',
          bidderCode: bidder.bidderCode,
          message: `${bidder.bidderName} has high latency (${bidder.avgLatency.toFixed(0)}ms)`,
          recommendation: 'Consider reducing timeout or investigating slow responses',
        });
      }

      if (bidder.trend === 'down' && bidder.totalRevenue > 0) {
        alerts.push({
          severity: 'info',
          bidderCode: bidder.bidderCode,
          message: `${bidder.bidderName} revenue is trending down`,
          recommendation: 'Review recent performance changes',
        });
      }
    }

    return {
      timeRange: {
        start: dateStart,
        end: dateEnd,
        label: timeRange,
      },
      summary,
      bidders: bidderMetrics,
      alerts,
    };
  });

  /**
   * Get detailed metrics for a specific bidder
   * GET /api/publishers/:publisherId/bidder-health/:bidderCode
   */
  fastify.get('/:publisherId/bidder-health/:bidderCode', async (request, reply) => {
    const { publisherId, bidderCode } = request.params as { publisherId: string; bidderCode: string };
    const {
      timeRange = '24h',
      startDate,
      endDate
    } = request.query as {
      timeRange?: string;
      startDate?: string;
      endDate?: string;
    };

    // Calculate time range
    const now = new Date();
    let dateStart: string;
    let dateEnd: string = endDate || now.toISOString();

    if (startDate) {
      dateStart = startDate;
    } else {
      const hours = timeRange === '1h' ? 1 :
                   timeRange === '6h' ? 6 :
                   timeRange === '24h' ? 24 :
                   timeRange === '7d' ? 168 :
                   timeRange === '30d' ? 720 : 24;
      dateStart = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
    }

    // Get events for this bidder
    const events = db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.publisherId, publisherId),
          eq(analyticsEvents.bidderCode, bidderCode),
          gte(analyticsEvents.timestamp, dateStart),
          lte(analyticsEvents.timestamp, dateEnd)
        )
      )
      .orderBy(desc(analyticsEvents.timestamp))
      .all();

    // Performance by ad unit
    const adUnitPerformance = new Map<string, any>();
    events.forEach(event => {
      if (event.adUnitCode) {
        if (!adUnitPerformance.has(event.adUnitCode)) {
          adUnitPerformance.set(event.adUnitCode, {
            adUnitCode: event.adUnitCode,
            requests: 0,
            responses: 0,
            wins: 0,
            revenue: 0,
          });
        }
        const perf = adUnitPerformance.get(event.adUnitCode)!;
        if (event.eventType === 'bidResponse') {
          perf.requests++;
          if (!event.timeout) perf.responses++;
        }
        if (event.eventType === 'bidWon') {
          perf.wins++;
          perf.revenue += parseFloat(event.cpm || '0') / 1000;
        }
      }
    });

    // Latency distribution
    const bidResponses = events.filter(e => e.eventType === 'bidResponse' && !e.timeout);
    const latencies = bidResponses.map(e => e.latencyMs || 0).sort((a, b) => a - b);
    const latencyDistribution = {
      min: latencies[0] || 0,
      max: latencies[latencies.length - 1] || 0,
      avg: latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0,
      p50: latencies[Math.floor(latencies.length * 0.5)] || 0,
      p75: latencies[Math.floor(latencies.length * 0.75)] || 0,
      p90: latencies[Math.floor(latencies.length * 0.90)] || 0,
      p95: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99: latencies[Math.floor(latencies.length * 0.99)] || 0,
    };

    // CPM distribution
    const bidWins = events.filter(e => e.eventType === 'bidWon');
    const cpms = bidWins.map(e => parseFloat(e.cpm || '0')).sort((a, b) => a - b);
    const cpmDistribution = {
      min: cpms[0] || 0,
      max: cpms[cpms.length - 1] || 0,
      avg: cpms.length > 0 ? cpms.reduce((sum, c) => sum + c, 0) / cpms.length : 0,
      p50: cpms[Math.floor(cpms.length * 0.5)] || 0,
      p75: cpms[Math.floor(cpms.length * 0.75)] || 0,
      p90: cpms[Math.floor(cpms.length * 0.90)] || 0,
    };

    return {
      bidderCode,
      timeRange: {
        start: dateStart,
        end: dateEnd,
        label: timeRange,
      },
      adUnitPerformance: Array.from(adUnitPerformance.values()),
      latencyDistribution,
      cpmDistribution,
      recentEvents: events.slice(0, 100), // Last 100 events
    };
  });
}
