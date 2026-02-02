import { FastifyInstance } from 'fastify';
import * as auctionService from '../services/auction-inspector-service';

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
    if (!auctionService.verifyPublisher(publisherId)) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const result = auctionService.getLiveAuctions(publisherId, {
      limit: parseInt(limit),
      adUnit,
      bidder,
      domain,
    });

    return result;
  });

  /**
   * Get auction waterfall (detailed view of single auction)
   * GET /api/publishers/:publisherId/auction-inspector/auctions/:auctionId
   */
  fastify.get('/:publisherId/auction-inspector/auctions/:auctionId', async (request, reply) => {
    const { publisherId, auctionId } = request.params as { publisherId: string; auctionId: string };

    const waterfall = auctionService.getAuctionWaterfall(publisherId, auctionId);

    if (!waterfall) {
      return reply.code(404).send({ error: 'Auction not found' });
    }

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

    const result = auctionService.searchAuctions(publisherId, {
      startDate,
      endDate,
      adUnit,
      bidder,
      domain,
      deviceType,
      minCpm: minCpm ? parseFloat(minCpm) : undefined,
      maxCpm: maxCpm ? parseFloat(maxCpm) : undefined,
      hasWinner: hasWinner === 'true' ? true : hasWinner === 'false' ? false : undefined,
      limit: parseInt(limit),
    });

    return result;
  });

  /**
   * Record auction debug event (called by wrapper)
   * POST /api/publishers/:publisherId/auction-inspector/events
   */
  fastify.post('/:publisherId/auction-inspector/events', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const body = request.body as any;

    // Verify publisher exists
    if (!auctionService.verifyPublisher(publisherId)) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const result = auctionService.recordAuctionEvent(publisherId, body);
    return result;
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

    const stats = auctionService.getAuctionStats(publisherId, startDate, endDate);
    return stats;
  });

  /**
   * Delete old auction debug events (cleanup)
   * DELETE /api/publishers/:publisherId/auction-inspector/cleanup
   */
  fastify.delete('/:publisherId/auction-inspector/cleanup', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { daysToKeep = '7' } = request.query as { daysToKeep?: string };

    const result = auctionService.cleanupOldEvents(publisherId, parseInt(daysToKeep));
    return result;
  });
}
