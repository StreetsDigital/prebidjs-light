import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { searchBidders, getAllKnownBidders } from '../utils/bidder-registry';
import { requireAuth } from '../middleware/auth';

/**
 * Global bidder registry routes
 * These are not publisher-specific
 */
export default async function biddersRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/bidders/search?q=query
   * Search known bidders from registry
   */
  fastify.get('/search', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest<{ Querystring: { q: string } }>, reply: FastifyReply) => {
    const { q } = request.query as { q: string };

    if (!q || q.trim().length < 2) {
      return reply.status(400).send({ error: 'Query must be at least 2 characters' });
    }

    try {
      const results = searchBidders(q);
      return reply.send({ data: results });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Search failed' });
    }
  });

  /**
   * GET /api/bidders/known
   * List all known bidders from registry
   */
  fastify.get('/known', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const bidders = getAllKnownBidders();
      return reply.send({ data: bidders });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch known bidders' });
    }
  });
}
