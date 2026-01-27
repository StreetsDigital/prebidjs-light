import { FastifyInstance } from 'fastify';
import { db, auctionDebugEvents, publishers } from '../db';
import { eq, and, gte, lte, desc, sql, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface AuctionEvent {
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

interface AuctionWaterfall {
  auctionId: string;
  adUnitCode: string;
  pageUrl: string;
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

export default async function auctionInspectorRoutes(fastify: FastifyInstance) {
  // Auth middleware
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  /**
   * Get live auctions (recent auctions in last 5 minutes)
   * GET /api/publishers/:publisherId/auction-inspector/live
   */
  fastify.get('/:publisherId/auction-inspector/live', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      limit = '50',
      adUnit,
      bidder,
      domain,
    } = request.query as {
      limit?: string;
      adUnit?: string;
      bidder?: string;
      domain?: string;
    };

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Get auctions from last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    let query = db
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
      .limit(parseInt(limit));

    const events = query.all();

    // Group events by auction ID
    const auctionGroups = new Map<string, typeof events>();
    events.forEach(event => {
      if (!auctionGroups.has(event.auctionId)) {
        auctionGroups.set(event.auctionId, []);
      }
      auctionGroups.get(event.auctionId)!.push(event);
    });

    // Build auction summaries
    const auctions = Array.from(auctionGroups.entries()).map(([auctionId, auctionEvents]) => {
      const initEvent = auctionEvents.find(e => e.eventType === 'auction_init');
      const endEvent = auctionEvents.find(e => e.eventType === 'auction_end');
      const bidResponses = auctionEvents.filter(e => e.eventType === 'bid_response');
      const bidWon = auctionEvents.find(e => e.eventType === 'bid_won');

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
          cpm: parseFloat(bidWon.cpm || '0'),
          currency: bidWon.currency || 'USD',
        } : null,
        deviceType: initEvent?.deviceType || null,
        eventCount: auctionEvents.length,
      };
    });

    return {
      auctions,
      totalEvents: events.length,
      timeRange: {
        start: fiveMinutesAgo,
        end: new Date().toISOString(),
      },
    };
  });

  /**
   * Get auction waterfall (detailed view of single auction)
   * GET /api/publishers/:publisherId/auction-inspector/auctions/:auctionId
   */
  fastify.get('/:publisherId/auction-inspector/auctions/:auctionId', async (request, reply) => {
    const { publisherId, auctionId } = request.params as { publisherId: string; auctionId: string };

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
      return reply.code(404).send({ error: 'Auction not found' });
    }

    const initEvent = events.find(e => e.eventType === 'auction_init');
    const endEvent = events.find(e => e.eventType === 'auction_end');
    const bidResponses = events.filter(e => e.eventType === 'bid_response');
    const bidTimeouts = events.filter(e => e.eventType === 'bid_timeout');
    const bidErrors = events.filter(e => e.eventType === 'bid_error');
    const bidWon = events.find(e => e.eventType === 'bid_won');

    // Build bidder summary
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
          bidResponse: event.bidResponse ? JSON.parse(event.bidResponse) : null,
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
        bidRequest: e.bidRequest ? JSON.parse(e.bidRequest) : null,
        bidResponse: e.bidResponse ? JSON.parse(e.bidResponse) : null,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
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
  });

  /**
   * Search/filter auctions
   * GET /api/publishers/:publisherId/auction-inspector/search
   */
  fastify.get('/:publisherId/auction-inspector/search', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      startDate,
      endDate,
      adUnit,
      bidder,
      domain,
      deviceType,
      minCpm,
      maxCpm,
      hasWinner,
      limit = '100',
    } = request.query as {
      startDate?: string;
      endDate?: string;
      adUnit?: string;
      bidder?: string;
      domain?: string;
      deviceType?: string;
      minCpm?: string;
      maxCpm?: string;
      hasWinner?: string;
      limit?: string;
    };

    // Default to last 24 hours if no date range provided
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    let conditions = [
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
      .limit(parseInt(limit) * 10) // Get more events to group into auctions
      .all();

    // Group by auction ID
    const auctionGroups = new Map<string, typeof events>();
    events.forEach(event => {
      if (!auctionGroups.has(event.auctionId)) {
        auctionGroups.set(event.auctionId, []);
      }
      auctionGroups.get(event.auctionId)!.push(event);
    });

    // Build and filter auction summaries
    let auctions = Array.from(auctionGroups.entries()).map(([auctionId, auctionEvents]) => {
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
    });

    // Apply additional filters
    if (hasWinner === 'true') {
      auctions = auctions.filter(a => a.winner !== null);
    } else if (hasWinner === 'false') {
      auctions = auctions.filter(a => a.winner === null);
    }

    if (minCpm) {
      const min = parseFloat(minCpm);
      auctions = auctions.filter(a => a.winner && a.winner.cpm >= min);
    }

    if (maxCpm) {
      const max = parseFloat(maxCpm);
      auctions = auctions.filter(a => a.winner && a.winner.cpm <= max);
    }

    // Limit results
    auctions = auctions.slice(0, parseInt(limit));

    return {
      auctions,
      total: auctions.length,
      timeRange: { start, end },
    };
  });

  /**
   * Record auction debug event (called by wrapper)
   * POST /api/publishers/:publisherId/auction-inspector/events
   */
  fastify.post('/:publisherId/auction-inspector/events', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const body = request.body as any;

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const eventId = uuidv4();
    const now = new Date().toISOString();

    db.insert(auctionDebugEvents).values({
      id: eventId,
      publisherId,
      auctionId: body.auctionId,
      timestamp: body.timestamp || now,
      eventType: body.eventType,
      adUnitCode: body.adUnitCode || null,
      bidderCode: body.bidderCode || null,
      bidRequest: body.bidRequest ? JSON.stringify(body.bidRequest) : null,
      bidResponse: body.bidResponse ? JSON.stringify(body.bidResponse) : null,
      latencyMs: body.latencyMs || null,
      cpm: body.cpm?.toString() || null,
      currency: body.currency || 'USD',
      pageUrl: body.pageUrl || null,
      domain: body.domain || null,
      deviceType: body.deviceType || null,
      userAgent: body.userAgent || null,
      errorMessage: body.errorMessage || null,
      statusCode: body.statusCode || null,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      createdAt: now,
    });

    return { success: true, eventId };
  });

  /**
   * Get auction statistics
   * GET /api/publishers/:publisherId/auction-inspector/stats
   */
  fastify.get('/:publisherId/auction-inspector/stats', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      startDate,
      endDate,
    } = request.query as {
      startDate?: string;
      endDate?: string;
    };

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
  });

  /**
   * Delete old auction debug events (cleanup)
   * DELETE /api/publishers/:publisherId/auction-inspector/cleanup
   */
  fastify.delete('/:publisherId/auction-inspector/cleanup', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { daysToKeep = '7' } = request.query as { daysToKeep?: string };

    const cutoffDate = new Date(Date.now() - parseInt(daysToKeep) * 24 * 60 * 60 * 1000).toISOString();

    const result = db
      .delete(auctionDebugEvents)
      .where(
        and(
          eq(auctionDebugEvents.publisherId, publisherId),
          lte(auctionDebugEvents.timestamp, cutoffDate)
        )
      )
      ;

    return {
      success: true,
      deletedCount: result.changes,
      cutoffDate,
    };
  });
}
