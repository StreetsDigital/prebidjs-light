import { db, analyticsEvents } from '../db';
import { eq, and, gte, lte } from 'drizzle-orm';

export type ScenarioType = 'add_bidders' | 'increase_timeout' | 'adjust_floors' | 'custom';

export interface ScenarioParameters {
  bidderCount?: number;
  timeoutIncrease?: number; // ms
  floorIncrease?: number; // percentage
  customMultiplier?: number;
}

export interface ScenarioResult {
  scenario: ScenarioType;
  timeframe: string;
  baseline: {
    revenue: number;
    impressions: number;
    avgCpm: number;
  };
  projected: {
    revenue: number;
    impressions: number;
    avgCpm: number;
  };
  impact: {
    revenueDiff: number;
    percentChange: number;
    multiplier: number;
  };
  explanation: string;
}

/**
 * Get baseline revenue data for a specific timeframe
 */
function getBaselineData(publisherId: string, daysBack: number): {
  revenue: number;
  impressions: number;
} {
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

  const revenue = events.reduce((sum, e) => sum + parseFloat(e.cpm || '0') / 1000, 0);
  const impressions = events.length;

  return { revenue, impressions };
}

/**
 * Calculate scenario impact for adding bidders
 */
function calculateAddBiddersImpact(bidderCount: number): {
  multiplier: number;
  explanation: string;
} {
  // Typically 10-15% revenue increase per new competitive bidder
  const multiplier = 1 + (bidderCount * 0.125);
  const explanation = `Adding ${bidderCount} new bidder(s) typically increases competition and CPM by ~12.5% per bidder`;

  return { multiplier, explanation };
}

/**
 * Calculate scenario impact for increasing timeout
 */
function calculateTimeoutImpact(timeoutIncrease: number): {
  multiplier: number;
  explanation: string;
} {
  // Longer timeouts allow more bids but diminishing returns
  const timeoutFactor = Math.min(timeoutIncrease / 1000, 1.0);
  const multiplier = 1 + (timeoutFactor * 0.08);
  const explanation = `Increasing timeout by ${timeoutIncrease}ms could improve fill rate, yielding ~${((multiplier - 1) * 100).toFixed(1)}% revenue increase`;

  return { multiplier, explanation };
}

/**
 * Calculate scenario impact for adjusting floor prices
 */
function calculateFloorAdjustmentImpact(floorIncrease: number): {
  multiplier: number;
  explanation: string;
} {
  // Higher floors increase CPM but may reduce fill rate
  const netEffect = floorIncrease * 0.006; // ~0.6% per 10% floor increase
  const multiplier = 1 + netEffect;
  const explanation = `Increasing floor prices by ${floorIncrease}% yields net ~${(netEffect * 100).toFixed(1)}% revenue change (higher CPM, slightly lower fill)`;

  return { multiplier, explanation };
}

/**
 * Calculate scenario impact for custom multiplier
 */
function calculateCustomImpact(customMultiplier: number): {
  multiplier: number;
  explanation: string;
} {
  const explanation = `Custom scenario with ${((customMultiplier - 1) * 100).toFixed(1)}% revenue change`;
  return { multiplier: customMultiplier, explanation };
}

/**
 * Model a what-if scenario and calculate projected impact
 */
export function modelScenario(
  publisherId: string,
  scenario: ScenarioType,
  parameters: ScenarioParameters,
  timeframe: 'week' | 'month' | 'quarter'
): ScenarioResult {
  // Get baseline revenue
  const daysBack = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
  const { revenue: baselineRevenue, impressions: baselineImpressions } = getBaselineData(publisherId, daysBack);

  // Calculate scenario impact
  let revenueMultiplier = 1.0;
  let explanation = '';

  if (scenario === 'add_bidders') {
    const bidderCount = parameters.bidderCount || 1;
    const impact = calculateAddBiddersImpact(bidderCount);
    revenueMultiplier = impact.multiplier;
    explanation = impact.explanation;
  } else if (scenario === 'increase_timeout') {
    const timeoutIncrease = parameters.timeoutIncrease || 500;
    const impact = calculateTimeoutImpact(timeoutIncrease);
    revenueMultiplier = impact.multiplier;
    explanation = impact.explanation;
  } else if (scenario === 'adjust_floors') {
    const floorIncrease = parameters.floorIncrease || 10;
    const impact = calculateFloorAdjustmentImpact(floorIncrease);
    revenueMultiplier = impact.multiplier;
    explanation = impact.explanation;
  } else if (scenario === 'custom') {
    const impact = calculateCustomImpact(parameters.customMultiplier || 1.0);
    revenueMultiplier = impact.multiplier;
    explanation = impact.explanation;
  }

  const projectedRevenue = baselineRevenue * revenueMultiplier;
  const revenueDiff = projectedRevenue - baselineRevenue;

  return {
    scenario,
    timeframe,
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
}
