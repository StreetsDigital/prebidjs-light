import { FastifyInstance } from 'fastify';
import { db, analyticsEvents } from '../db';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

interface AnalyticsQuery {
  publisherId?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export default async function analyticsRoutes(fastify: FastifyInstance) {
  // Get analytics events
  fastify.get<{ Querystring: AnalyticsQuery }>('/events', async (request, reply) => {
    const { publisherId, eventType, startDate, endDate, limit = 100 } = request.query;

    const conditions = [];

    if (publisherId) {
      conditions.push(eq(analyticsEvents.publisherId, publisherId));
    }

    if (eventType) {
      conditions.push(eq(analyticsEvents.eventType, eventType));
    }

    if (startDate) {
      conditions.push(gte(analyticsEvents.timestamp, startDate));
    }

    const query = conditions.length > 0
      ? db.select().from(analyticsEvents).where(and(...conditions)).orderBy(desc(analyticsEvents.timestamp)).limit(limit)
      : db.select().from(analyticsEvents).orderBy(desc(analyticsEvents.timestamp)).limit(limit);

    const events = query.all();

    return {
      events,
      count: events.length,
    };
  });

  // Get analytics summary/stats
  fastify.get('/stats', async (request, reply) => {
    // Get total events by type
    const eventsByType = db.select({
      eventType: analyticsEvents.eventType,
      count: sql<number>`count(*)`.as('count'),
    })
      .from(analyticsEvents)
      .groupBy(analyticsEvents.eventType)
      .all();

    // Get total events
    const totalResult = db.select({
      count: sql<number>`count(*)`.as('count'),
    })
      .from(analyticsEvents)
      .get();

    // Get events in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentResult = db.select({
      count: sql<number>`count(*)`.as('count'),
    })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.timestamp, oneDayAgo))
      .get();

    // Get unique publishers
    const publishersResult = db.select({
      count: sql<number>`count(distinct publisher_id)`.as('count'),
    })
      .from(analyticsEvents)
      .get();

    // Calculate revenue (sum of won bids)
    const revenueResult = db.select({
      total: sql<number>`sum(case when won = 1 then cast(cpm as real) else 0 end)`.as('total'),
    })
      .from(analyticsEvents)
      .get();

    return {
      totalEvents: totalResult?.count || 0,
      eventsLast24h: recentResult?.count || 0,
      uniquePublishers: publishersResult?.count || 0,
      totalRevenue: revenueResult?.total || 0,
      eventsByType: eventsByType.reduce((acc, row) => {
        acc[row.eventType] = row.count;
        return acc;
      }, {} as Record<string, number>),
    };
  });

  // Get bidder performance
  fastify.get('/bidders', async (request, reply) => {
    const bidderStats = db.select({
      bidderCode: analyticsEvents.bidderCode,
      bidsRequested: sql<number>`count(case when event_type = 'bidRequested' then 1 end)`.as('bids_requested'),
      bidsReceived: sql<number>`count(case when event_type = 'bidResponse' then 1 end)`.as('bids_received'),
      bidsWon: sql<number>`sum(case when won = 1 then 1 else 0 end)`.as('bids_won'),
      bidsTimeout: sql<number>`sum(case when timeout = 1 then 1 else 0 end)`.as('bids_timeout'),
      avgCpm: sql<number>`avg(case when cpm is not null then cast(cpm as real) else null end)`.as('avg_cpm'),
      avgLatency: sql<number>`avg(latency_ms)`.as('avg_latency'),
    })
      .from(analyticsEvents)
      .where(sql`bidder_code is not null`)
      .groupBy(analyticsEvents.bidderCode)
      .all();

    return {
      bidders: bidderStats.map(b => ({
        ...b,
        avgCpm: b.avgCpm ? Number(b.avgCpm.toFixed(2)) : 0,
        avgLatency: b.avgLatency ? Math.round(b.avgLatency) : 0,
      })),
    };
  });
}
