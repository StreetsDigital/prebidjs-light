import { db } from '../db';
import { publisherBidders } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAnalyticsEvents,
  getPublisherBidders,
  calculateBidderMetrics,
  calculateCpmStatistics,
} from './yield-analysis-service';

/**
 * Service for generating and implementing yield optimization recommendations
 */

export interface Recommendation {
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  dataSnapshot: any;
  estimatedImpact: {
    revenueChange?: number;
    percentChange?: number;
    latencyReduction?: number;
    qualityImprovement?: boolean;
    confidence: string;
  } | null;
  targetEntity: string | null;
  recommendedAction: any;
  confidence: string;
}

/**
 * Generate all recommendations for a publisher
 */
export async function generateRecommendations(
  publisherId: string,
  days: number
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get analytics events and bidders
  const events = getAnalyticsEvents(publisherId, startDate);
  const bidders = getPublisherBidders(publisherId);

  // Analyze each bidder
  for (const bidder of bidders) {
    const metrics = calculateBidderMetrics(bidder, events);

    if (metrics.bidResponses === 0) continue;

    // Generate bidder-specific recommendations
    const bidderRecs = [
      ...generateUnderperformerRecommendation(bidder, metrics, days),
      ...generateTimeoutRecommendation(bidder, metrics),
      ...generateAbTestRecommendation(bidder, metrics),
      ...generateReenableRecommendation(bidder, metrics),
    ];

    recommendations.push(...bidderRecs);
  }

  // Generate global recommendations
  const globalRecs = generateFloorPriceRecommendation(events);
  recommendations.push(...globalRecs);

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return recommendations;
}

/**
 * Generate recommendation to disable underperforming bidders
 */
function generateUnderperformerRecommendation(
  bidder: any,
  metrics: any,
  days: number
): Recommendation[] {
  if (metrics.revenue >= 1 || metrics.bidResponses <= 100 || !metrics.enabled) {
    return [];
  }

  return [{
    type: 'disable_bidder',
    priority: metrics.revenue === 0 ? 'high' : 'medium',
    title: `Disable ${bidder.bidderCode}`,
    description: `This bidder has generated only $${metrics.revenue.toFixed(2)} in the last ${days} days despite ${metrics.bidResponses} bid requests. Disabling it will reduce latency and improve user experience.`,
    dataSnapshot: {
      bidderCode: bidder.bidderCode,
      bidResponses: metrics.bidResponses,
      revenue: metrics.revenue,
      fillRate: metrics.fillRate.toFixed(1),
      avgCpm: metrics.avgCpm.toFixed(2),
    },
    estimatedImpact: {
      revenueChange: -metrics.revenue,
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
  }];
}

/**
 * Generate recommendation to adjust timeout for slow bidders
 */
function generateTimeoutRecommendation(
  bidder: any,
  metrics: any
): Recommendation[] {
  if (metrics.timeoutRate <= 15 || metrics.bidResponses <= 50 || !metrics.enabled) {
    return [];
  }

  const currentTimeout = metrics.currentTimeout || 1500;
  const recommendedTimeout = Math.max(500, Math.floor(currentTimeout * 0.7));

  return [{
    type: 'adjust_timeout',
    priority: metrics.timeoutRate > 30 ? 'high' : 'medium',
    title: `Reduce timeout for ${bidder.bidderCode}`,
    description: `This bidder times out ${metrics.timeoutRate.toFixed(1)}% of the time. Reducing the timeout from ${currentTimeout}ms to ${recommendedTimeout}ms will improve page load times.`,
    dataSnapshot: {
      bidderCode: bidder.bidderCode,
      timeoutRate: metrics.timeoutRate.toFixed(1),
      timeouts: metrics.timeouts,
      currentTimeout,
    },
    estimatedImpact: {
      revenueChange: -metrics.revenue * 0.1, // Estimate 10% revenue loss
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
  }];
}

/**
 * Generate recommendation to run A/B test for high-revenue bidders
 */
function generateAbTestRecommendation(
  bidder: any,
  metrics: any
): Recommendation[] {
  if (metrics.revenue <= 50 || metrics.fillRate >= 50 || !metrics.enabled) {
    return [];
  }

  return [{
    type: 'run_ab_test',
    priority: 'low',
    title: `Test timeout optimization for ${bidder.bidderCode}`,
    description: `This bidder generates significant revenue ($${metrics.revenue.toFixed(2)}) but has a low fill rate (${metrics.fillRate.toFixed(1)}%). Test different timeout values to find the optimal balance.`,
    dataSnapshot: {
      bidderCode: bidder.bidderCode,
      revenue: metrics.revenue,
      fillRate: metrics.fillRate.toFixed(1),
      avgCpm: metrics.avgCpm.toFixed(2),
    },
    estimatedImpact: {
      revenueChange: metrics.revenue * 0.15, // Estimate 15% uplift
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
  }];
}

/**
 * Generate recommendation to re-enable disabled high-performers
 */
function generateReenableRecommendation(
  bidder: any,
  metrics: any
): Recommendation[] {
  if (metrics.enabled || metrics.revenue <= 20) {
    return [];
  }

  return [{
    type: 'enable_bidder',
    priority: 'medium',
    title: `Re-enable ${bidder.bidderCode}`,
    description: `This bidder generated $${metrics.revenue.toFixed(2)} before being disabled. Consider re-enabling it to capture additional revenue.`,
    dataSnapshot: {
      bidderCode: bidder.bidderCode,
      revenue: metrics.revenue,
      fillRate: metrics.fillRate.toFixed(1),
      avgCpm: metrics.avgCpm.toFixed(2),
    },
    estimatedImpact: {
      revenueChange: metrics.revenue,
      percentChange: 10,
      confidence: 'medium',
    },
    targetEntity: bidder.bidderCode,
    recommendedAction: {
      action: 'enable_bidder',
      bidderCode: bidder.bidderCode,
    },
    confidence: 'medium',
  }];
}

/**
 * Generate recommendation for floor price optimization
 */
function generateFloorPriceRecommendation(events: any[]): Recommendation[] {
  const allBidWins = events.filter(e => e.eventType === 'bidWon');

  if (allBidWins.length <= 100) {
    return [];
  }

  const stats = calculateCpmStatistics(allBidWins);
  const suggestedFloor = Math.floor(stats.medianCpm * 0.5 * 100) / 100; // 50% of median

  if (suggestedFloor <= 0.1) {
    return [];
  }

  return [{
    type: 'adjust_floor_price',
    priority: 'low',
    title: 'Optimize floor prices',
    description: `Based on your median CPM of $${stats.medianCpm.toFixed(2)}, consider setting a floor price of $${suggestedFloor.toFixed(2)} to filter out low-quality bids.`,
    dataSnapshot: {
      totalBids: allBidWins.length,
      medianCpm: stats.medianCpm.toFixed(2),
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
  }];
}

/**
 * Implement a recommendation by making actual configuration changes
 */
export async function implementRecommendation(
  publisherId: string,
  type: string,
  action: any
): Promise<void> {
  const now = new Date().toISOString();

  switch (type) {
    case 'disable_bidder':
      db.update(publisherBidders)
        .set({ enabled: false, updatedAt: now })
        .where(and(
          eq(publisherBidders.publisherId, publisherId),
          eq(publisherBidders.bidderCode, action.bidderCode)
        ))
        .run();
      break;

    case 'enable_bidder':
      db.update(publisherBidders)
        .set({ enabled: true, updatedAt: now })
        .where(and(
          eq(publisherBidders.publisherId, publisherId),
          eq(publisherBidders.bidderCode, action.bidderCode)
        ))
        .run();
      break;

    case 'adjust_timeout':
      db.update(publisherBidders)
        .set({ timeoutOverride: action.newTimeout, updatedAt: now })
        .where(and(
          eq(publisherBidders.publisherId, publisherId),
          eq(publisherBidders.bidderCode, action.bidderCode)
        ))
        .run();
      break;

    default:
      // No implementation handler for this recommendation type
      // Other types may require manual implementation or future features
  }
}
