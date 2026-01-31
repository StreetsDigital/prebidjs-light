import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, publisherCustomBidders } from '../db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
  getBidderInfo,
  searchBidders,
  getAllKnownBidders,
  isValidBidderCode
} from '../utils/bidder-registry';

// Built-in bidders (always available to all publishers)
const BUILT_IN_BIDDERS = [
  { code: 'appnexus', name: 'AppNexus', isBuiltIn: true },
  { code: 'rubicon', name: 'Rubicon Project', isBuiltIn: true },
  { code: 'pubmatic', name: 'PubMatic', isBuiltIn: true },
  { code: 'openx', name: 'OpenX', isBuiltIn: true },
  { code: 'criteo', name: 'Criteo', isBuiltIn: true },
];

interface AddBidderRequest {
  bidderCode: string;
  bidderName?: string;
}

interface DeleteBidderRequest {
  Params: {
    publisherId: string;
    bidderId: string;
  };
}

export default async function customBiddersRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/publishers/:publisherId/bidders
   * List all available bidders (built-in + custom)
   */
  fastify.get('/', async (request: FastifyRequest<{ Params: { publisherId: string } }>, reply: FastifyReply) => {
    const { publisherId } = request.params;

    try {
      // Get custom bidders from database
      const customBidders = db
        .select()
        .from(publisherCustomBidders)
        .where(
          and(
            eq(publisherCustomBidders.publisherId, publisherId),
            eq(publisherCustomBidders.enabled, true)
          )
        )
        .all();

      // Combine built-in bidders with custom bidders
      const allBidders = [
        // Built-in bidders with capability info
        ...BUILT_IN_BIDDERS.map(bidder => {
          const info = getBidderInfo(bidder.code);
          return {
            code: bidder.code,
            name: bidder.name,
            isBuiltIn: true,
            isClientSide: info.isClientSide,
            isServerSide: info.isServerSide,
            documentationUrl: info.documentationUrl,
            description: info.description,
          };
        }),
        // Custom bidders
        ...customBidders.map(bidder => ({
          id: bidder.id,
          code: bidder.bidderCode,
          name: bidder.bidderName,
          isBuiltIn: false,
          isClientSide: bidder.isClientSide,
          isServerSide: bidder.isServerSide,
          documentationUrl: bidder.documentationUrl,
          description: bidder.description,
        })),
      ];

      return reply.send({ data: allBidders });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch bidders' });
    }
  });

  /**
   * POST /api/publishers/:publisherId/bidders
   * Add a custom bidder
   */
  fastify.post('/', async (request: FastifyRequest<{ Params: { publisherId: string }; Body: AddBidderRequest }>, reply: FastifyReply) => {
    const { publisherId } = request.params;
    const { bidderCode, bidderName } = request.body;

    try {
      // Validate bidder code
      if (!bidderCode || !isValidBidderCode(bidderCode)) {
        return reply.status(400).send({
          error: 'Invalid bidder code. Must be 2-50 characters, alphanumeric with hyphens/underscores only.'
        });
      }

      const normalizedCode = bidderCode.toLowerCase().trim();

      // Check if it's a built-in bidder
      if (BUILT_IN_BIDDERS.some(b => b.code === normalizedCode)) {
        return reply.status(400).send({
          error: 'This bidder is already available as a built-in bidder.'
        });
      }

      // Check if custom bidder already exists for this publisher
      const existing = db
        .select()
        .from(publisherCustomBidders)
        .where(
          and(
            eq(publisherCustomBidders.publisherId, publisherId),
            eq(publisherCustomBidders.bidderCode, normalizedCode)
          )
        )
        .get();

      if (existing) {
        return reply.status(400).send({
          error: 'This bidder has already been added to your account.'
        });
      }

      // Look up bidder info from registry
      const bidderInfo = getBidderInfo(normalizedCode);

      // Create custom bidder
      const newBidder = {
        id: uuidv4(),
        publisherId,
        bidderCode: normalizedCode,
        bidderName: bidderName || bidderInfo.name,
        isClientSide: bidderInfo.isClientSide,
        isServerSide: bidderInfo.isServerSide,
        description: bidderInfo.description || null,
        documentationUrl: bidderInfo.documentationUrl || null,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.insert(publisherCustomBidders).values(newBidder).run();

      return reply.status(201).send({
        data: {
          id: newBidder.id,
          code: newBidder.bidderCode,
          name: newBidder.bidderName,
          isClientSide: newBidder.isClientSide,
          isServerSide: newBidder.isServerSide,
          documentationUrl: newBidder.documentationUrl,
          description: newBidder.description,
        },
        message: bidderInfo.documentationUrl
          ? `${newBidder.bidderName} added successfully`
          : `${newBidder.bidderName} added successfully (unknown bidder, defaulting to client-side)`
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to add custom bidder' });
    }
  });

  /**
   * DELETE /api/publishers/:publisherId/bidders/:bidderId
   * Remove a custom bidder
   */
  fastify.delete('/:bidderId', async (request: FastifyRequest<DeleteBidderRequest>, reply: FastifyReply) => {
    const { publisherId, bidderId } = request.params;

    try {
      // Verify bidder belongs to publisher
      const bidder = db
        .select()
        .from(publisherCustomBidders)
        .where(
          and(
            eq(publisherCustomBidders.id, bidderId),
            eq(publisherCustomBidders.publisherId, publisherId)
          )
        )
        .get();

      if (!bidder) {
        return reply.status(404).send({ error: 'Custom bidder not found' });
      }

      // Delete the bidder
      db.delete(publisherCustomBidders)
        .where(eq(publisherCustomBidders.id, bidderId))
        .run();

      return reply.send({ message: 'Custom bidder removed successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove custom bidder' });
    }
  });

}
