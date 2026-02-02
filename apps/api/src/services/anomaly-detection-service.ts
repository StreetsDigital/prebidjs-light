import { db, analyticsEvents } from '../db';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface Anomaly {
  date: string;
  revenue: number;
  expected: number;
  deviation: number;
  percentChange: number;
  type: 'spike' | 'drop';
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  statistics: {
    avgRevenue: number;
    stdDev: number;
    threshold: number;
  };
  summary: {
    total: number;
    spikes: number;
    drops: number;
  };
  message?: string;
}

/**
 * Get daily revenue data for anomaly detection
 */
function getDailyRevenue(publisherId: string, daysBack: number): Array<{ date: string; revenue: number }> {
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

  return Array.from(revenueByDate.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate statistical measures for revenue data
 */
function calculateStatistics(revenues: number[]): {
  avgRevenue: number;
  variance: number;
  stdDev: number;
} {
  const n = revenues.length;
  const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / n;
  const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return { avgRevenue, variance, stdDev };
}

/**
 * Calculate expected revenue using moving average
 */
function calculateExpectedRevenue(
  dailyRevenues: Array<{ date: string; revenue: number }>,
  index: number,
  avgRevenue: number,
  windowSize: number = 7
): number {
  const startIdx = Math.max(0, index - windowSize);
  const endIdx = index;
  const windowRevenues = dailyRevenues.slice(startIdx, endIdx).map(d => d.revenue);

  return windowRevenues.length > 0
    ? windowRevenues.reduce((sum, r) => sum + r, 0) / windowRevenues.length
    : avgRevenue;
}

/**
 * Detect revenue anomalies using statistical analysis
 */
export function detectAnomalies(
  publisherId: string,
  daysBack: number = 30,
  stdDevThreshold: number = 2.0
): AnomalyDetectionResult {
  const dailyRevenues = getDailyRevenue(publisherId, daysBack);

  if (dailyRevenues.length < 7) {
    return {
      anomalies: [],
      statistics: { avgRevenue: 0, stdDev: 0, threshold: stdDevThreshold },
      summary: { total: 0, spikes: 0, drops: 0 },
      message: 'Not enough data for anomaly detection',
    };
  }

  // Calculate statistics
  const revenues = dailyRevenues.map(d => d.revenue);
  const { avgRevenue, stdDev } = calculateStatistics(revenues);

  // Detect anomalies
  const anomalies: Anomaly[] = [];

  dailyRevenues.forEach((day, index) => {
    // Use moving average as expected value
    const expected = calculateExpectedRevenue(dailyRevenues, index, avgRevenue);
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

  // Sort by deviation magnitude
  const sortedAnomalies = anomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

  return {
    anomalies: sortedAnomalies,
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
}
