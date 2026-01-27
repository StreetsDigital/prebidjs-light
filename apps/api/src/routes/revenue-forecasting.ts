import { FastifyInstance } from 'fastify';
import { db, analyticsEvents, publishers } from '../db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

interface DailyRevenue {
  date: string;
  revenue: number;
  impressions: number;
  avgCpm: number;
}

interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number; // Lower confidence bound
  upper: number; // Upper confidence bound
  confidence: number; // 0-1
}

interface SeasonalityPattern {
  type: 'hourly' | 'daily' | 'monthly';
  patterns: {
    period: number; // Hour (0-23), Day (0-6), Month (1-12)
    avgRevenue: number;
    percentOfAvg: number;
  }[];
}

interface Anomaly {
  date: string;
  revenue: number;
  expected: number;
  deviation: number;
  percentChange: number;
  type: 'spike' | 'drop';
}

export default async function revenueForecastingRoutes(fastify: FastifyInstance) {
  // Auth middleware
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  /**
   * Get historical revenue data
   * GET /api/publishers/:publisherId/revenue-forecasting/historical
   */
  fastify.get('/:publisherId/revenue-forecasting/historical', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      startDate,
      endDate,
      granularity = 'day'
    } = request.query as {
      startDate?: string;
      endDate?: string;
      granularity?: 'hour' | 'day' | 'week' | 'month';
    };

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Default to last 90 days
    const end = endDate || new Date().toISOString();
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Get bid won events
    const events = db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.publisherId, publisherId),
          eq(analyticsEvents.eventType, 'bidWon'),
          gte(analyticsEvents.timestamp, start),
          lte(analyticsEvents.timestamp, end)
        )
      )
      .all();

    // Group by date
    const revenueByDate = new Map<string, { revenue: number; impressions: number; cpms: number[] }>();

    events.forEach(event => {
      const date = new Date(event.timestamp);
      let key: string;

      if (granularity === 'hour') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      } else if (granularity === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (granularity === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else { // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!revenueByDate.has(key)) {
        revenueByDate.set(key, { revenue: 0, impressions: 0, cpms: [] });
      }

      const data = revenueByDate.get(key)!;
      const cpm = parseFloat(event.cpm || '0');
      data.revenue += cpm / 1000;
      data.impressions += 1;
      data.cpms.push(cpm);
    });

    const historicalData: DailyRevenue[] = Array.from(revenueByDate.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        impressions: data.impressions,
        avgCpm: data.impressions > 0 ? data.cpms.reduce((sum, cpm) => sum + cpm, 0) / data.impressions : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      timeRange: { start, end },
      granularity,
      data: historicalData,
      totalRevenue: historicalData.reduce((sum, d) => sum + d.revenue, 0),
      totalImpressions: historicalData.reduce((sum, d) => sum + d.impressions, 0),
    };
  });

  /**
   * Get revenue forecast
   * GET /api/publishers/:publisherId/revenue-forecasting/forecast
   */
  fastify.get('/:publisherId/revenue-forecasting/forecast', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      days = '30'
    } = request.query as {
      days?: string;
    };

    const forecastDays = parseInt(days);

    // Get last 90 days of data for training
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const events = db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.publisherId, publisherId),
          eq(analyticsEvents.eventType, 'bidWon'),
          gte(analyticsEvents.timestamp, start),
          lte(analyticsEvents.timestamp, end)
        )
      )
      .all();

    // Group by date
    const revenueByDate = new Map<string, number>();
    events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      const revenue = parseFloat(event.cpm || '0') / 1000;
      revenueByDate.set(date, (revenueByDate.get(date) || 0) + revenue);
    });

    const historicalData = Array.from(revenueByDate.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (historicalData.length === 0) {
      return {
        forecast: [],
        method: 'insufficient_data',
        message: 'Not enough historical data for forecasting',
      };
    }

    // Simple linear regression for trend
    const revenues = historicalData.map(d => d.revenue);
    const n = revenues.length;
    const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / n;

    // Calculate linear trend
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    revenues.forEach((revenue, i) => {
      sumX += i;
      sumY += revenue;
      sumXY += i * revenue;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate standard deviation for confidence intervals
    const predictions = revenues.map((_, i) => slope * i + intercept);
    const errors = revenues.map((r, i) => r - predictions[i]);
    const variance = errors.reduce((sum, e) => sum + e * e, 0) / n;
    const stdDev = Math.sqrt(variance);

    // Generate forecast
    const forecast: ForecastPoint[] = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].date);

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(lastDate.getDate() + i);

      const x = n + i - 1;
      const predicted = slope * x + intercept;

      // Confidence decreases over time
      const confidence = Math.max(0.5, 1 - (i / forecastDays) * 0.5);

      // Wider confidence intervals further out
      const spread = stdDev * 2 * (1 + i / forecastDays);

      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predicted: Math.max(0, predicted),
        lower: Math.max(0, predicted - spread),
        upper: predicted + spread,
        confidence,
      });
    }

    // Detect trend
    const trendDirection = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable';
    const trendPercent = avgRevenue > 0 ? (slope / avgRevenue) * 100 : 0;

    return {
      forecast,
      method: 'linear_regression',
      trend: {
        direction: trendDirection,
        slope,
        percentChange: trendPercent,
      },
      confidence: {
        avg: forecast.reduce((sum, f) => sum + f.confidence, 0) / forecast.length,
        range: [forecast[0]?.confidence || 0, forecast[forecast.length - 1]?.confidence || 0],
      },
      projectedTotal: forecast.reduce((sum, f) => sum + f.predicted, 0),
    };
  });

  /**
   * Detect seasonality patterns
   * GET /api/publishers/:publisherId/revenue-forecasting/seasonality
   */
  fastify.get('/:publisherId/revenue-forecasting/seasonality', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    // Get last 90 days of data
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const events = db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.publisherId, publisherId),
          eq(analyticsEvents.eventType, 'bidWon'),
          gte(analyticsEvents.timestamp, start),
          lte(analyticsEvents.timestamp, end)
        )
      )
      .all();

    // Group by hour of day
    const revenueByHour = new Map<number, number[]>();
    for (let i = 0; i < 24; i++) {
      revenueByHour.set(i, []);
    }

    // Group by day of week
    const revenueByDay = new Map<number, number[]>();
    for (let i = 0; i < 7; i++) {
      revenueByDay.set(i, []);
    }

    events.forEach(event => {
      const date = new Date(event.timestamp);
      const revenue = parseFloat(event.cpm || '0') / 1000;

      const hour = date.getHours();
      revenueByHour.get(hour)!.push(revenue);

      const day = date.getDay();
      revenueByDay.get(day)!.push(revenue);
    });

    // Calculate averages
    const avgRevenuePerEvent = events.length > 0
      ? events.reduce((sum, e) => sum + parseFloat(e.cpm || '0') / 1000, 0) / events.length
      : 0;

    // Hourly patterns
    const hourlyPatterns = Array.from(revenueByHour.entries()).map(([hour, revenues]) => {
      const avgRevenue = revenues.length > 0
        ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length
        : 0;
      return {
        period: hour,
        avgRevenue,
        percentOfAvg: avgRevenuePerEvent > 0 ? (avgRevenue / avgRevenuePerEvent) * 100 : 100,
        count: revenues.length,
      };
    });

    // Daily patterns (0 = Sunday, 6 = Saturday)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyPatterns = Array.from(revenueByDay.entries()).map(([day, revenues]) => {
      const avgRevenue = revenues.length > 0
        ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length
        : 0;
      return {
        period: day,
        name: dayNames[day],
        avgRevenue,
        percentOfAvg: avgRevenuePerEvent > 0 ? (avgRevenue / avgRevenuePerEvent) * 100 : 100,
        count: revenues.length,
      };
    });

    // Find peak hours
    const sortedHours = [...hourlyPatterns].sort((a, b) => b.avgRevenue - a.avgRevenue);
    const peakHours = sortedHours.slice(0, 5).map(h => h.period);

    // Find best days
    const sortedDays = [...dailyPatterns].sort((a, b) => b.avgRevenue - a.avgRevenue);
    const bestDays = sortedDays.slice(0, 3).map(d => dayNames[d.period]);

    return {
      hourly: {
        patterns: hourlyPatterns,
        peakHours,
      },
      daily: {
        patterns: dailyPatterns,
        bestDays,
      },
      insights: {
        hasStrongHourlyPattern: Math.max(...hourlyPatterns.map(h => h.percentOfAvg)) > 150,
        hasStrongDailyPattern: Math.max(...dailyPatterns.map(d => d.percentOfAvg)) > 130,
      },
    };
  });

  /**
   * Detect revenue anomalies
   * GET /api/publishers/:publisherId/revenue-forecasting/anomalies
   */
  fastify.get('/:publisherId/revenue-forecasting/anomalies', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      days = '30',
      threshold = '2.0'
    } = request.query as {
      days?: string;
      threshold?: string;
    };

    const daysBack = parseInt(days);
    const stdDevThreshold = parseFloat(threshold);

    // Get historical data
    const end = new Date().toISOString();
    const start = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const events = db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.publisherId, publisherId),
          eq(analyticsEvents.eventType, 'bidWon'),
          gte(analyticsEvents.timestamp, start),
          lte(analyticsEvents.timestamp, end)
        )
      )
      .all();

    // Group by date
    const revenueByDate = new Map<string, number>();
    events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      const revenue = parseFloat(event.cpm || '0') / 1000;
      revenueByDate.set(date, (revenueByDate.get(date) || 0) + revenue);
    });

    const dailyRevenues = Array.from(revenueByDate.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (dailyRevenues.length < 7) {
      return { anomalies: [], message: 'Not enough data for anomaly detection' };
    }

    // Calculate statistics
    const revenues = dailyRevenues.map(d => d.revenue);
    const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
    const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / revenues.length;
    const stdDev = Math.sqrt(variance);

    // Detect anomalies
    const anomalies: Anomaly[] = [];
    dailyRevenues.forEach((day, index) => {
      // Use moving average as expected value
      const windowSize = 7;
      const startIdx = Math.max(0, index - windowSize);
      const endIdx = index;
      const windowRevenues = dailyRevenues.slice(startIdx, endIdx).map(d => d.revenue);
      const expected = windowRevenues.length > 0
        ? windowRevenues.reduce((sum, r) => sum + r, 0) / windowRevenues.length
        : avgRevenue;

      const deviation = (day.revenue - expected) / stdDev;

      if (Math.abs(deviation) > stdDevThreshold) {
        const percentChange = expected > 0 ? ((day.revenue - expected) / expected) * 100 : 0;
        anomalies.push({
          date: day.date,
          revenue: day.revenue,
          expected,
          deviation,
          percentChange,
          type: day.revenue > expected ? 'spike' : 'drop',
        });
      }
    });

    return {
      anomalies: anomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)),
      statistics: {
        avgRevenue,
        stdDev,
        threshold: stdDevThreshold,
      },
      summary: {
        total: anomalies.length,
        spikes: anomalies.filter(a => a.type === 'spike').length,
        drops: anomalies.filter(a => a.type === 'drop').length,
      },
    };
  });

  /**
   * What-if scenario modeling
   * POST /api/publishers/:publisherId/revenue-forecasting/scenario
   */
  fastify.post('/:publisherId/revenue-forecasting/scenario', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const body = request.body as {
      scenario: 'add_bidders' | 'increase_timeout' | 'adjust_floors' | 'custom';
      parameters: {
        bidderCount?: number;
        timeoutIncrease?: number; // ms
        floorIncrease?: number; // percentage
        customMultiplier?: number;
      };
      timeframe: 'week' | 'month' | 'quarter';
    };

    // Get baseline revenue
    const daysBack = body.timeframe === 'week' ? 7 : body.timeframe === 'month' ? 30 : 90;
    const end = new Date().toISOString();
    const start = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const events = db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.publisherId, publisherId),
          eq(analyticsEvents.eventType, 'bidWon'),
          gte(analyticsEvents.timestamp, start),
          lte(analyticsEvents.timestamp, end)
        )
      )
      .all();

    const baselineRevenue = events.reduce((sum, e) => sum + parseFloat(e.cpm || '0') / 1000, 0);
    const baselineImpressions = events.length;

    // Calculate scenario impact
    let revenueMultiplier = 1.0;
    let explanation = '';

    if (body.scenario === 'add_bidders') {
      const bidderCount = body.parameters.bidderCount || 1;
      // Typically 10-15% revenue increase per new competitive bidder
      revenueMultiplier = 1 + (bidderCount * 0.125);
      explanation = `Adding ${bidderCount} new bidder(s) typically increases competition and CPM by ~12.5% per bidder`;
    } else if (body.scenario === 'increase_timeout') {
      const timeoutIncrease = body.parameters.timeoutIncrease || 500;
      // Longer timeouts allow more bids but diminishing returns
      const timeoutFactor = Math.min(timeoutIncrease / 1000, 1.0);
      revenueMultiplier = 1 + (timeoutFactor * 0.08);
      explanation = `Increasing timeout by ${timeoutIncrease}ms could improve fill rate, yielding ~${(revenueMultiplier - 1) * 100}% revenue increase`;
    } else if (body.scenario === 'adjust_floors') {
      const floorIncrease = body.parameters.floorIncrease || 10;
      // Higher floors increase CPM but may reduce fill rate
      const netEffect = floorIncrease * 0.006; // ~0.6% per 10% floor increase
      revenueMultiplier = 1 + netEffect;
      explanation = `Increasing floor prices by ${floorIncrease}% yields net ~${(netEffect * 100).toFixed(1)}% revenue change (higher CPM, slightly lower fill)`;
    } else if (body.scenario === 'custom') {
      revenueMultiplier = body.parameters.customMultiplier || 1.0;
      explanation = `Custom scenario with ${((revenueMultiplier - 1) * 100).toFixed(1)}% revenue change`;
    }

    const projectedRevenue = baselineRevenue * revenueMultiplier;
    const revenueDiff = projectedRevenue - baselineRevenue;

    return {
      scenario: body.scenario,
      timeframe: body.timeframe,
      baseline: {
        revenue: baselineRevenue,
        impressions: baselineImpressions,
        avgCpm: baselineImpressions > 0 ? (baselineRevenue / baselineImpressions) * 1000 : 0,
      },
      projected: {
        revenue: projectedRevenue,
        impressions: baselineImpressions,
        avgCpm: baselineImpressions > 0 ? (projectedRevenue / baselineImpressions) * 1000 : 0,
      },
      impact: {
        revenueDiff,
        percentChange: baselineRevenue > 0 ? (revenueDiff / baselineRevenue) * 100 : 0,
        multiplier: revenueMultiplier,
      },
      explanation,
    };
  });

  /**
   * Budget pacing & goal tracking
   * GET /api/publishers/:publisherId/revenue-forecasting/pacing
   */
  fastify.get('/:publisherId/revenue-forecasting/pacing', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      goalAmount,
      goalPeriod = 'month'
    } = request.query as {
      goalAmount?: string;
      goalPeriod?: 'week' | 'month' | 'quarter' | 'year';
    };

    const goal = goalAmount ? parseFloat(goalAmount) : null;

    // Determine period
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    let daysInPeriod: number;

    if (goalPeriod === 'week') {
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - now.getDay());
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 7);
      daysInPeriod = 7;
    } else if (goalPeriod === 'month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      daysInPeriod = periodEnd.getDate();
    } else if (goalPeriod === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3, 1);
      periodEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      daysInPeriod = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000));
    } else { // year
      periodStart = new Date(now.getFullYear(), 0, 1);
      periodEnd = new Date(now.getFullYear(), 11, 31);
      daysInPeriod = 365;
    }

    const daysElapsed = Math.floor((now.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const daysRemaining = daysInPeriod - daysElapsed;

    // Get revenue for current period
    const events = db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.publisherId, publisherId),
          eq(analyticsEvents.eventType, 'bidWon'),
          gte(analyticsEvents.timestamp, periodStart.toISOString()),
          lte(analyticsEvents.timestamp, now.toISOString())
        )
      )
      .all();

    const actualRevenue = events.reduce((sum, e) => sum + parseFloat(e.cpm || '0') / 1000, 0);
    const expectedProgress = (daysElapsed / daysInPeriod) * (goal || actualRevenue);
    const dailyAvg = daysElapsed > 0 ? actualRevenue / daysElapsed : 0;
    const projectedTotal = dailyAvg * daysInPeriod;

    let pacingStatus: 'ahead' | 'on_track' | 'behind' = 'on_track';
    let pacingPercent = 0;

    if (goal) {
      const expectedProgress = (daysElapsed / daysInPeriod) * goal;
      pacingPercent = expectedProgress > 0 ? ((actualRevenue - expectedProgress) / expectedProgress) * 100 : 0;

      if (pacingPercent > 10) pacingStatus = 'ahead';
      else if (pacingPercent < -10) pacingStatus = 'behind';
    }

    return {
      period: {
        type: goalPeriod,
        start: periodStart.toISOString().split('T')[0],
        end: periodEnd.toISOString().split('T')[0],
        daysElapsed,
        daysRemaining,
        percentComplete: (daysElapsed / daysInPeriod) * 100,
      },
      goal: goal || null,
      actual: {
        revenue: actualRevenue,
        dailyAvg,
        projectedTotal,
      },
      pacing: {
        status: pacingStatus,
        percentDiff: pacingPercent,
        onTrackFor: goal ? projectedTotal : null,
        needsDaily: goal && daysRemaining > 0 ? (goal - actualRevenue) / daysRemaining : null,
      },
    };
  });
}
