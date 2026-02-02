import { db } from '../db';
import { analyticsEvents, publisherBidders } from '../db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

/**
 * Service for analyzing yield performance and measuring recommendation impact
 */

export interface ImpactMeasurement {
  revenueChange: number;
  percentChange: number;
  beforeDailyRevenue: number;
  afterDailyRevenue: number;
  beforePeriodDays: number;
  afterPeriodDays: number;
}

export interface BidderMetrics {
  bidderCode: string;
  bidResponses: number;
  bidWins: number;
  timeouts: number;
  timeoutRate: number;
  fillRate: number;
  avgCpm: number;
  revenue: number;
  currentTimeout: number | null;
  enabled: boolean;
}

/**
 * Calculate metrics for a specific bidder
 */
export function calculateBidderMetrics(
  bidder: any,
  events: any[]
): BidderMetrics {
  const bidderEvents = events.filter(e => e.bidderCode === bidder.bidderCode);
  const bidResponses = bidderEvents.filter(e => e.eventType === 'bidResponse');
  const bidWins = bidderEvents.filter(e => e.eventType === 'bidWon');
  const timeouts = bidResponses.filter(e => e.timeout);

  const timeoutRate = bidResponses.length > 0 ? (timeouts.length / bidResponses.length) * 100 : 0;
  const fillRate = bidResponses.length > 0 ? (bidWins.length / bidResponses.length) * 100 : 0;
  const avgCpm = bidWins.length > 0
    ? bidWins.reduce((sum, e) => sum + (parseFloat(e.cpm || '0') || 0), 0) / bidWins.length
    : 0;
  const revenue = bidWins.reduce((sum, e) => sum + (parseFloat(e.cpm || '0') || 0), 0);

  return {
    bidderCode: bidder.bidderCode,
    bidResponses: bidResponses.length,
    bidWins: bidWins.length,
    timeouts: timeouts.length,
    timeoutRate,
    fillRate,
    avgCpm,
    revenue,
    currentTimeout: bidder.timeoutOverride,
    enabled: bidder.enabled,
  };
}

/**
 * Get analytics events for a publisher within a date range
 */
export function getAnalyticsEvents(
  publisherId: string,
  startDate: string,
  endDate?: string
): any[] {
  const query = db.select().from(analyticsEvents)
    .where(and(
      eq(analyticsEvents.publisherId, publisherId),
      gte(analyticsEvents.timestamp, startDate)
    ));

  return query.all();
}

/**
 * Get active bidders for a publisher
 */
export function getPublisherBidders(publisherId: string): any[] {
  return db.select().from(publisherBidders)
    .where(eq(publisherBidders.publisherId, publisherId))
    .all();
}

/**
 * Calculate overall CPM statistics from bid wins
 */
export function calculateCpmStatistics(bidWins: any[]): {
  cpms: number[];
  medianCpm: number;
  avgCpm: number;
  totalRevenue: number;
} {
  const cpms = bidWins
    .map(e => parseFloat(e.cpm || '0'))
    .filter(c => c > 0)
    .sort((a, b) => a - b);

  const medianCpm = cpms.length > 0 ? cpms[Math.floor(cpms.length / 2)] : 0;
  const avgCpm = cpms.length > 0 ? cpms.reduce((sum, c) => sum + c, 0) / cpms.length : 0;
  const totalRevenue = cpms.reduce((sum, c) => sum + c, 0);

  return {
    cpms,
    medianCpm,
    avgCpm,
    totalRevenue,
  };
}

/**
 * Measure the impact of an implemented recommendation
 */
export async function measureRecommendationImpact(
  publisherId: string,
  type: string,
  targetEntity: string | null,
  implementedAt: string
): Promise<ImpactMeasurement> {
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

/**
 * Get yield statistics grouped by event type
 */
export function getYieldStatistics(events: any[]): {
  totalEvents: number;
  bidRequests: number;
  bidResponses: number;
  bidWins: number;
  totalRevenue: number;
  avgCpm: number;
} {
  const bidRequests = events.filter(e => e.eventType === 'bidRequest').length;
  const bidResponses = events.filter(e => e.eventType === 'bidResponse').length;
  const bidWins = events.filter(e => e.eventType === 'bidWon');
  const totalRevenue = bidWins.reduce((sum, e) => sum + (parseFloat(e.cpm || '0') || 0), 0);
  const avgCpm = bidWins.length > 0 ? totalRevenue / bidWins.length : 0;

  return {
    totalEvents: events.length,
    bidRequests,
    bidResponses,
    bidWins: bidWins.length,
    totalRevenue,
    avgCpm,
  };
}
