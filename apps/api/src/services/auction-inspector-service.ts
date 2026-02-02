import { db, auctionDebugEvents, publishers } from '../db';
import { eq, and, gte, lte, desc, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { safeJsonParseObject } from '../utils/safe-json';

export interface AuctionEvent {
  id: string;
  publisherId: string;
  auctionId: string;
  timestamp: string;
  eventType: 'auction_init' | 'bid_requested' | 'bid_response' | 'bid_timeout' | 'bid_won' | 'bid_error' | 'auction_end';
  adUnitCode: string | null;
  bidderCode: string | null;
  bidRequest: any;
  bidResponse: any;
  latencyMs: number | null;
  cpm: string | null;
  currency: string | null;
  pageUrl: string | null;
  domain: string | null;
  deviceType: string | null;
  userAgent: string | null;
  errorMessage: string | null;
  statusCode: number | null;
  metadata: any;
  createdAt: string;
}

export interface AuctionWaterfall {
  auctionId: string;
  adUnitCode: string;
  pageUrl: string | null;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  events: AuctionEvent[];
  bidders: {
    bidderCode: string;
    status: 'responded' | 'timeout' | 'error' | 'no_bid';
    latency: number | null;
    cpm: number | null;
    won: boolean;
    errorMessage: string | null;
    bidResponse?: any;
  }[];
  winner: {
    bidderCode: string;
    cpm: number;
    currency: string;
  } | null;
  totalBids: number;
  timeoutCount: number;
  errorCount: number;
}

export interface AuctionSummary {
  auctionId: string;
  adUnitCode: string;
  pageUrl: string | null;
  domain: string | null;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  totalBids: number;
  winner: {
    bidderCode: string;
    cpm: number;
    currency: string;
  } | null;
  deviceType: string | null;
  eventCount: number;
}

export interface LiveAuctionsFilters {
  limit?: number;
  adUnit?: string;
  bidder?: string;
  domain?: string;
}

export interface SearchFilters extends LiveAuctionsFilters {
  startDate?: string;
  endDate?: string;
  deviceType?: string;
  minCpm?: number;
  maxCpm?: number;
  hasWinner?: boolean;
}

export interface AuctionStats {
  timeRange: { start: string; end: string };
  uniqueAuctions: number;
  totalBids: number;
  totalTimeouts: number;
  totalErrors: number;
  totalWins: number;
  avgLatency: number;
  avgCpm: string;
  fillRate: string;
  timeoutRate: string;
  topBidders: { bidder: string; count: number }[];
}

/**
 * Verify that a publisher exists
 */
export function verifyPublisher(publisherId: string): boolean {
  const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
  return !!publisher;
}

/**
 * Build auction summary from events
 */
function buildAuctionSummary(auctionId: string, auctionEvents: any[]): AuctionSummary {
  const initEvent = auctionEvents.find(e => e.eventType === 'auction_init');
  const endEvent = auctionEvents.find(e => e.eventType === 'auction_end');
  const bidResponses = auctionEvents.filter(e => e.eventType === 'bid_response');
  const bidWon = auctionEvents.find(e => e.eventType === 'bid_won');

  const winnerCpm = bidWon?.cpm ? parseFloat(bidWon.cpm) : null;

  return {
    auctionId,
    adUnitCode: initEvent?.adUnitCode || 'unknown',
    pageUrl: initEvent?.pageUrl || null,
    domain: initEvent?.domain || null,
    startTime: initEvent?.timestamp || auctionEvents[0].timestamp,
    endTime: endEvent?.timestamp || null,
    duration: initEvent && endEvent
      ? new Date(endEvent.timestamp).getTime() - new Date(initEvent.timestamp).getTime()
      : null,
    totalBids: bidResponses.length,
    winner: bidWon ? {
      bidderCode: bidWon.bidderCode!,
      cpm: winnerCpm!,
      currency: bidWon.currency || 'USD',
    } : null,
    deviceType: initEvent?.deviceType || null,
    eventCount: auctionEvents.length,
  };
}

/**
 * Group events by auction ID
 */
function groupEventsByAuction(events: any[]): Map<string, any[]> {
  const auctionGroups = new Map<string, any[]>();
  events.forEach(event => {
    if (!auctionGroups.has(event.auctionId)) {
      auctionGroups.set(event.auctionId, []);
    }
    auctionGroups.get(event.auctionId)!.push(event);
  });
  return auctionGroups;
}

/**
 * Get live auctions (recent auctions in last 5 minutes)
 */
export function getLiveAuctions(publisherId: string, filters: LiveAuctionsFilters = {}) {
  const { limit = 50, adUnit, bidder, domain } = filters;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const query = db
    .select()
    .from(auctionDebugEvents)
    .where(
      and(
        eq(auctionDebugEvents.publisherId, publisherId),
        gte(auctionDebugEvents.timestamp, fiveMinutesAgo),
        adUnit ? eq(auctionDebugEvents.adUnitCode, adUnit) : undefined,
        bidder ? eq(auctionDebugEvents.bidderCode, bidder) : undefined,
        domain ? like(auctionDebugEvents.domain, `%${domain}%`) : undefined
      )
    )
    .orderBy(desc(auctionDebugEvents.timestamp))
    .limit(limit);

  const events = query.all();
  const auctionGroups = groupEventsByAuction(events);
  const auctions = Array.from(auctionGroups.entries()).map(([auctionId, auctionEvents]) =>
    buildAuctionSummary(auctionId, auctionEvents)
  );

  return {
    auctions,
    totalEvents: events.length,
    timeRange: {
      start: fiveMinutesAgo,
      end: new Date().toISOString(),
    },
  };
}

/**
 * Build bidder map from auction events
 */
function buildBidderMap(events: any[]): Map<string, any> {
  const bidResponses = events.filter(e => e.eventType === 'bid_response');
  const bidTimeouts = events.filter(e => e.eventType === 'bid_timeout');
  const bidErrors = events.filter(e => e.eventType === 'bid_error');
  const bidWon = events.find(e => e.eventType === 'bid_won');

  const bidderMap = new Map<string, any>();

  bidResponses.forEach(event => {
    if (event.bidderCode) {
      bidderMap.set(event.bidderCode, {
        bidderCode: event.bidderCode,
        status: 'responded',
        latency: event.latencyMs,
        cpm: event.cpm ? parseFloat(event.cpm) : null,
        won: bidWon?.bidderCode === event.bidderCode,
        errorMessage: null,
        bidResponse: safeJsonParseObject(event.bidResponse, undefined),
      });
    }
  });

  bidTimeouts.forEach(event => {
    if (event.bidderCode && !bidderMap.has(event.bidderCode)) {
      bidderMap.set(event.bidderCode, {
        bidderCode: event.bidderCode,
        status: 'timeout',
        latency: event.latencyMs,
        cpm: null,
        won: false,
        errorMessage: 'Request timed out',
      });
    }
  });

  bidErrors.forEach(event => {
    if (event.bidderCode) {
      bidderMap.set(event.bidderCode, {
        bidderCode: event.bidderCode,
        status: 'error',
        latency: event.latencyMs,
        cpm: null,
        won: false,
        errorMessage: event.errorMessage,
      });
    }
  });

  return bidderMap;
}

/**
 * Get auction waterfall (detailed view of single auction)
 */
export function getAuctionWaterfall(publisherId: string, auctionId: string): AuctionWaterfall | null {
  const events = db
    .select()
    .from(auctionDebugEvents)
    .where(
      and(
        eq(auctionDebugEvents.publisherId, publisherId),
        eq(auctionDebugEvents.auctionId, auctionId)
      )
    )
    .orderBy(auctionDebugEvents.timestamp)
    .all();

  if (events.length === 0) {
    return null;
  }

  const initEvent = events.find(e => e.eventType === 'auction_init');
  const endEvent = events.find(e => e.eventType === 'auction_end');
  const bidResponses = events.filter(e => e.eventType === 'bid_response');
  const bidTimeouts = events.filter(e => e.eventType === 'bid_timeout');
  const bidErrors = events.filter(e => e.eventType === 'bid_error');
  const bidWon = events.find(e => e.eventType === 'bid_won');

  const bidderMap = buildBidderMap(events);

  const waterfall: AuctionWaterfall = {
    auctionId,
    adUnitCode: initEvent?.adUnitCode || 'unknown',
    pageUrl: initEvent?.pageUrl || null,
    startTime: initEvent?.timestamp || events[0].timestamp,
    endTime: endEvent?.timestamp || null,
    duration: initEvent && endEvent
      ? new Date(endEvent.timestamp).getTime() - new Date(initEvent.timestamp).getTime()
      : null,
    events: events.map(e => ({
      ...e,
      bidRequest: safeJsonParseObject(e.bidRequest, undefined),
      bidResponse: safeJsonParseObject(e.bidResponse, undefined),
      metadata: safeJsonParseObject(e.metadata, undefined),
    })),
    bidders: Array.from(bidderMap.values()),
    winner: bidWon ? {
      bidderCode: bidWon.bidderCode!,
      cpm: parseFloat(bidWon.cpm || '0'),
      currency: bidWon.currency || 'USD',
    } : null,
    totalBids: bidResponses.length,
    timeoutCount: bidTimeouts.length,
    errorCount: bidErrors.length,
  };

  return waterfall;
}

/**
 * Apply additional filters to auction summaries
 */
function applyFilters(auctions: AuctionSummary[], filters: SearchFilters): AuctionSummary[] {
  let filtered = auctions;

  if (filters.hasWinner === true) {
    filtered = filtered.filter(a => a.winner !== null);
  } else if (filters.hasWinner === false) {
    filtered = filtered.filter(a => a.winner === null);
  }

  if (filters.minCpm !== undefined) {
    filtered = filtered.filter(a => a.winner && a.winner.cpm >= filters.minCpm!);
  }

  if (filters.maxCpm !== undefined) {
    filtered = filtered.filter(a => a.winner && a.winner.cpm <= filters.maxCpm!);
  }

  return filtered;
}

/**
 * Search/filter auctions
 */
export function searchAuctions(publisherId: string, filters: SearchFilters = {}) {
  const { limit = 100, startDate, endDate, adUnit, bidder, domain, deviceType } = filters;

  // Default to last 24 hours if no date range provided
  const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const end = endDate || new Date().toISOString();

  const conditions = [
    eq(auctionDebugEvents.publisherId, publisherId),
    gte(auctionDebugEvents.timestamp, start),
    lte(auctionDebugEvents.timestamp, end),
  ];

  if (adUnit) conditions.push(eq(auctionDebugEvents.adUnitCode, adUnit));
  if (bidder) conditions.push(eq(auctionDebugEvents.bidderCode, bidder));
  if (domain) conditions.push(like(auctionDebugEvents.domain, `%${domain}%`));
  if (deviceType) conditions.push(eq(auctionDebugEvents.deviceType, deviceType));

  const events = db
    .select()
    .from(auctionDebugEvents)
    .where(and(...conditions))
    .orderBy(desc(auctionDebugEvents.timestamp))
    .limit(limit * 10) // Get more events to group into auctions
    .all();

  const auctionGroups = groupEventsByAuction(events);
  let auctions = Array.from(auctionGroups.entries()).map(([auctionId, auctionEvents]) =>
    buildAuctionSummary(auctionId, auctionEvents)
  );

  // Apply additional filters
  auctions = applyFilters(auctions, filters);

  // Limit results
  auctions = auctions.slice(0, limit);

  return {
    auctions,
    total: auctions.length,
    timeRange: { start, end },
  };
}

/**
 * Record auction debug event
 */
export function recordAuctionEvent(publisherId: string, eventData: any) {
  const eventId = uuidv4();
  const now = new Date().toISOString();

  db.insert(auctionDebugEvents).values({
    id: eventId,
    publisherId,
    auctionId: eventData.auctionId,
    timestamp: eventData.timestamp || now,
    eventType: eventData.eventType,
    adUnitCode: eventData.adUnitCode || null,
    bidderCode: eventData.bidderCode || null,
    bidRequest: eventData.bidRequest ? JSON.stringify(eventData.bidRequest) : null,
    bidResponse: eventData.bidResponse ? JSON.stringify(eventData.bidResponse) : null,
    latencyMs: eventData.latencyMs || null,
    cpm: eventData.cpm?.toString() || null,
    currency: eventData.currency || 'USD',
    pageUrl: eventData.pageUrl || null,
    domain: eventData.domain || null,
    deviceType: eventData.deviceType || null,
    userAgent: eventData.userAgent || null,
    errorMessage: eventData.errorMessage || null,
    statusCode: eventData.statusCode || null,
    metadata: eventData.metadata ? JSON.stringify(eventData.metadata) : null,
    createdAt: now,
  }).run();

  return { success: true, eventId };
}

/**
 * Get auction statistics
 */
export function getAuctionStats(publisherId: string, startDate?: string, endDate?: string): AuctionStats {
  const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const end = endDate || new Date().toISOString();

  const events = db
    .select()
    .from(auctionDebugEvents)
    .where(
      and(
        eq(auctionDebugEvents.publisherId, publisherId),
        gte(auctionDebugEvents.timestamp, start),
        lte(auctionDebugEvents.timestamp, end)
      )
    )
    .all();

  // Calculate stats
  const uniqueAuctions = new Set(events.map(e => e.auctionId)).size;
  const totalBids = events.filter(e => e.eventType === 'bid_response').length;
  const totalTimeouts = events.filter(e => e.eventType === 'bid_timeout').length;
  const totalErrors = events.filter(e => e.eventType === 'bid_error').length;
  const totalWins = events.filter(e => e.eventType === 'bid_won').length;

  const latencies = events
    .filter(e => e.eventType === 'bid_response' && e.latencyMs)
    .map(e => e.latencyMs!);
  const avgLatency = latencies.length > 0
    ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
    : 0;

  const cpms = events
    .filter(e => e.eventType === 'bid_won' && e.cpm)
    .map(e => parseFloat(e.cpm!));
  const avgCpm = cpms.length > 0
    ? cpms.reduce((sum, c) => sum + c, 0) / cpms.length
    : 0;

  // Top bidders
  const bidderCounts = new Map<string, number>();
  events.filter(e => e.bidderCode).forEach(e => {
    const count = bidderCounts.get(e.bidderCode!) || 0;
    bidderCounts.set(e.bidderCode!, count + 1);
  });
  const topBidders = Array.from(bidderCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([bidder, count]) => ({ bidder, count }));

  return {
    timeRange: { start, end },
    uniqueAuctions,
    totalBids,
    totalTimeouts,
    totalErrors,
    totalWins,
    avgLatency: Math.round(avgLatency),
    avgCpm: avgCpm.toFixed(2),
    fillRate: uniqueAuctions > 0 ? ((totalWins / uniqueAuctions) * 100).toFixed(1) : '0',
    timeoutRate: totalBids > 0 ? ((totalTimeouts / (totalBids + totalTimeouts)) * 100).toFixed(1) : '0',
    topBidders,
  };
}

/**
 * Delete old auction debug events (cleanup)
 */
export function cleanupOldEvents(publisherId: string, daysToKeep: number = 7) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

  db.delete(auctionDebugEvents)
    .where(
      and(
        eq(auctionDebugEvents.publisherId, publisherId),
        lte(auctionDebugEvents.timestamp, cutoffDate)
      )
    )
    .run();

  return {
    success: true,
    deletedCount: 0, // Drizzle doesn't return count without .get()
    cutoffDate,
  };
}
