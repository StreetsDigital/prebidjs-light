import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, publisherCustomBidders, publisherRemovedBidders } from '../db';
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

interface DeleteBidderParams {
  publisherId: string;
  bidderId: string;
}

interface DeleteBidderRequest {
  Params: DeleteBidderParams;
}

export default async function customBiddersRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/publishers/:publisherId/available-bidders
   * List all available bidders (built-in + custom)
   */
  fastify.get('/:publisherId/available-bidders', async (request: FastifyRequest<{ Params: { publisherId: string } }>, reply: FastifyReply) => {
    const { publisherId } = request.params;

    try {
      // Get removed bidders (including built-ins explicitly removed by publisher)
      const removedBidders = db
        .select()
        .from(publisherRemovedBidders)
        .where(eq(publisherRemovedBidders.publisherId, publisherId))
        .all();

      const removedBidderCodes = new Set(removedBidders.map(b => b.bidderCode));

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

      // Combine built-in bidders with custom bidders, excluding removed ones
      const allBidders = [
        // Built-in bidders with capability info (exclude removed ones)
        ...BUILT_IN_BIDDERS
          .filter(bidder => !removedBidderCodes.has(bidder.code))
          .map(bidder => {
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
        // Custom bidders (exclude removed ones)
        ...customBidders
          .filter(bidder => !removedBidderCodes.has(bidder.bidderCode))
          .map(bidder => ({
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
   * POST /api/publishers/:publisherId/available-bidders
   * Add a custom bidder OR re-add a removed built-in bidder
   */
  fastify.post('/:publisherId/available-bidders', async (request: FastifyRequest<{ Params: { publisherId: string }; Body: AddBidderRequest }>, reply: FastifyReply) => {
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

      // Check if it's a built-in bidder that was previously removed
      const builtInBidder = BUILT_IN_BIDDERS.find(b => b.code === normalizedCode);
      if (builtInBidder) {
        const removed = db
          .select()
          .from(publisherRemovedBidders)
          .where(
            and(
              eq(publisherRemovedBidders.publisherId, publisherId),
              eq(publisherRemovedBidders.bidderCode, normalizedCode)
            )
          )
          .get();

        if (removed) {
          // Re-add by removing from removed list
          db.delete(publisherRemovedBidders)
            .where(eq(publisherRemovedBidders.id, removed.id))
            .run();

          return reply.status(200).send({
            data: {
              code: normalizedCode,
              name: builtInBidder.name,
              isBuiltIn: true,
            },
            message: `${builtInBidder.name} re-added successfully`
          });
        } else {
          return reply.status(400).send({
            error: 'This bidder is already available as a built-in bidder.'
          });
        }
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
   * DELETE /api/publishers/:publisherId/available-bidders/:bidderId
   * Remove a bidder (custom or built-in)
   * For custom bidders: delete from publisher_custom_bidders
   * For built-in bidders: add to publisher_removed_bidders
   */
  fastify.delete('/:publisherId/available-bidders/:bidderId', async (request: FastifyRequest<DeleteBidderRequest>, reply: FastifyReply) => {
    const { publisherId, bidderId } = request.params;

    try {
      // Check if it's a built-in bidder (bidderId would be the bidder code)
      const builtInBidder = BUILT_IN_BIDDERS.find(b => b.code === bidderId);

      if (builtInBidder) {
        // Check if already removed
        const existing = db
          .select()
          .from(publisherRemovedBidders)
          .where(
            and(
              eq(publisherRemovedBidders.publisherId, publisherId),
              eq(publisherRemovedBidders.bidderCode, bidderId)
            )
          )
          .get();

        if (existing) {
          return reply.status(400).send({ error: 'Bidder already removed' });
        }

        // Add to removed bidders list
        db.insert(publisherRemovedBidders).values({
          id: uuidv4(),
          publisherId,
          bidderCode: bidderId,
          createdAt: new Date().toISOString()
        }).run();

        return reply.send({ message: `${builtInBidder.name} removed successfully` });
      }

      // Otherwise, it's a custom bidder - verify and delete
      const customBidder = db
        .select()
        .from(publisherCustomBidders)
        .where(
          and(
            eq(publisherCustomBidders.id, bidderId),
            eq(publisherCustomBidders.publisherId, publisherId)
          )
        )
        .get();

      if (!customBidder) {
        return reply.status(404).send({ error: 'Bidder not found' });
      }

      // Delete the custom bidder
      db.delete(publisherCustomBidders)
        .where(eq(publisherCustomBidders.id, bidderId))
        .run();

      return reply.send({ message: 'Bidder removed successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove bidder' });
    }
  });

}
