import { db, analyticsEvents } from '../db';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface DailyRevenue {
  date: string;
  revenue: number;
  impressions: number;
  avgCpm: number;
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number; // Lower confidence bound
  upper: number; // Upper confidence bound
  confidence: number; // 0-1
}

export interface SeasonalityPattern {
  type: 'hourly' | 'daily' | 'monthly';
  patterns: {
    period: number; // Hour (0-23), Day (0-6), Month (1-12)
    avgRevenue: number;
    percentOfAvg: number;
  }[];
}

/**
 * Get historical revenue data grouped by specified granularity
 */
export function getHistoricalRevenue(
  publisherId: string,
  startDate: string,
  endDate: string,
  granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
): {
  data: DailyRevenue[];
  totalRevenue: number;
  totalImpressions: number;
} {
  // Get bid won events
  const events = db
    .select()
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.publisherId, publisherId),
        eq(analyticsEvents.eventType, 'bidWon'),
        gte(analyticsEvents.timestamp, startDate),
        lte(analyticsEvents.timestamp, endDate)
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
    data: historicalData,
    totalRevenue: historicalData.reduce((sum, d) => sum + d.revenue, 0),
    totalImpressions: historicalData.reduce((sum, d) => sum + d.impressions, 0),
  };
}

/**
 * Generate revenue forecast using linear regression
 */
export function generateForecast(
  publisherId: string,
  forecastDays: number
): {
  forecast: ForecastPoint[];
  method: string;
  trend: {
    direction: string;
    slope: number;
    percentChange: number;
  };
  confidence: {
    avg: number;
    range: [number, number];
  };
  projectedTotal: number;
  message?: string;
} {
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
      trend: { direction: 'unknown', slope: 0, percentChange: 0 },
      confidence: { avg: 0, range: [0, 0] },
      projectedTotal: 0,
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
}

/**
 * Detect seasonality patterns (hourly and daily)
 */
export function detectSeasonality(publisherId: string): {
  hourly: {
    patterns: any[];
    peakHours: number[];
  };
  daily: {
    patterns: any[];
    bestDays: string[];
  };
  insights: {
    hasStrongHourlyPattern: boolean;
    hasStrongDailyPattern: boolean;
  };
} {
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
}

/**
 * Calculate budget pacing and goal tracking
 */
export function calculatePacing(
  publisherId: string,
  goalAmount: number | null,
  goalPeriod: 'week' | 'month' | 'quarter' | 'year'
): {
  period: {
    type: string;
    start: string;
    end: string;
    daysElapsed: number;
    daysRemaining: number;
    percentComplete: number;
  };
  goal: number | null;
  actual: {
    revenue: number;
    dailyAvg: number;
    projectedTotal: number;
  };
  pacing: {
    status: 'ahead' | 'on_track' | 'behind';
    percentDiff: number;
    onTrackFor: number | null;
    needsDaily: number | null;
  };
} {
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
  const dailyAvg = daysElapsed > 0 ? actualRevenue / daysElapsed : 0;
  const projectedTotal = dailyAvg * daysInPeriod;

  let pacingStatus: 'ahead' | 'on_track' | 'behind' = 'on_track';
  let pacingPercent = 0;

  if (goalAmount) {
    const expectedProgress = (daysElapsed / daysInPeriod) * goalAmount;
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
    goal: goalAmount,
    actual: {
      revenue: actualRevenue,
      dailyAvg,
      projectedTotal,
    },
    pacing: {
      status: pacingStatus,
      percentDiff: pacingPercent,
      onTrackFor: goalAmount ? projectedTotal : null,
      needsDaily: goalAmount && daysRemaining > 0 ? (goalAmount - actualRevenue) / daysRemaining : null,
    },
  };
}
