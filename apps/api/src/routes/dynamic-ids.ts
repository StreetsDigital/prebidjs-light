/**
 * Dynamic IDs API Routes
 *
 * Manages per-ad-unit bidder parameters (Dynamic IDs) within wrapper configs.
 * Inspired by Nexx360's Prebid adapter (Prebid 10.17+), Dynamic IDs allow
 * each ad unit to specify its own bidder-specific parameters instead of
 * sharing a single set of params across all ad units.
 *
 * Routes:
 *   GET  /api/publishers/:publisherId/configs/:configId/dynamic-ids
 *     → List all ad units with their dynamic bidder IDs
 *
 *   GET  /api/publishers/:publisherId/configs/:configId/dynamic-ids/:adUnitCode
 *     → Get dynamic IDs for a specific ad unit
 *
 *   PUT  /api/publishers/:publisherId/configs/:configId/dynamic-ids/:adUnitCode
 *     → Set/update dynamic IDs for a specific ad unit
 *
 *   DELETE /api/publishers/:publisherId/configs/:configId/dynamic-ids/:adUnitCode
 *     → Remove all dynamic IDs for a specific ad unit (reverts to publisher defaults)
 *
 *   PUT  /api/publishers/:publisherId/configs/:configId/dynamic-ids/:adUnitCode/:bidderCode
 *     → Set dynamic IDs for a specific bidder on a specific ad unit
 *
 *   DELETE /api/publishers/:publisherId/configs/:configId/dynamic-ids/:adUnitCode/:bidderCode
 *     → Remove dynamic IDs for a specific bidder on a specific ad unit
 *
 *   GET  /api/bidders/param-schema/:bidderCode
 *     → Get the known parameter schema for a bidder
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, wrapperConfigs } from '../db';
import { eq, and } from 'drizzle-orm';
import { invalidatePublisherCache } from '../utils/wrapper-generator';
import { getBidderParamSchema, isValidBidderCode } from '../utils/bidder-registry';

interface AdUnitDefinition {
  mediaTypes?: any;
  bids?: any[];
  bidders?: Record<string, Record<string, any>>;
  [key: string]: any;
}

type AdUnitsMap = Record<string, AdUnitDefinition>;

/**
 * Helper: Get parsed ad units from a wrapper config
 */
function getAdUnits(config: any): AdUnitsMap {
  if (!config.adUnits) return {};
  try {
    return typeof config.adUnits === 'string' ? JSON.parse(config.adUnits) : config.adUnits;
  } catch {
    return {};
  }
}

/**
 * Helper: Save ad units back to wrapper config
 */
async function saveAdUnits(configId: string, adUnits: AdUnitsMap): Promise<void> {
  await db
    .update(wrapperConfigs)
    .set({
      adUnits: JSON.stringify(adUnits),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(wrapperConfigs.id, configId))
    .run();
}

export default async function dynamicIdsRoutes(fastify: FastifyInstance) {
  /**
   * List all ad units with their dynamic bidder IDs for a config
   */
  fastify.get('/', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string };
  }>, reply: FastifyReply) => {
    const { publisherId, configId } = request.params;

    try {
      const config = await db
        .select()
        .from(wrapperConfigs)
        .where(
          and(
            eq(wrapperConfigs.id, configId),
            eq(wrapperConfigs.publisherId, publisherId)
          )
        )
        .get();

      if (!config) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      const adUnits = getAdUnits(config);

      // Build response showing each ad unit and its dynamic IDs
      const result: Record<string, {
        mediaTypes: any;
        bidders: Record<string, Record<string, any>>;
        hasDynamicIds: boolean;
        bidderCount: number;
      }> = {};

      for (const [code, definition] of Object.entries(adUnits)) {
        const bidders = definition.bidders || {};
        result[code] = {
          mediaTypes: definition.mediaTypes,
          bidders,
          hasDynamicIds: Object.keys(bidders).length > 0,
          bidderCount: Object.keys(bidders).length,
        };
      }

      return reply.send({ data: result });
    } catch (err) {
      console.error('Error fetching dynamic IDs:', err);
      return reply.status(500).send({ error: 'Failed to fetch dynamic IDs' });
    }
  });

  /**
   * Get dynamic IDs for a specific ad unit
   */
  fastify.get('/:adUnitCode', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string; adUnitCode: string };
  }>, reply: FastifyReply) => {
    const { publisherId, configId, adUnitCode } = request.params;

    try {
      const config = await db
        .select()
        .from(wrapperConfigs)
        .where(
          and(
            eq(wrapperConfigs.id, configId),
            eq(wrapperConfigs.publisherId, publisherId)
          )
        )
        .get();

      if (!config) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      const adUnits = getAdUnits(config);
      const adUnit = adUnits[adUnitCode];

      if (!adUnit) {
        return reply.status(404).send({ error: `Ad unit '${adUnitCode}' not found in config` });
      }

      return reply.send({
        data: {
          adUnitCode,
          mediaTypes: adUnit.mediaTypes,
          bidders: adUnit.bidders || {},
          hasDynamicIds: !!(adUnit.bidders && Object.keys(adUnit.bidders).length > 0),
        },
      });
    } catch (err) {
      console.error('Error fetching ad unit dynamic IDs:', err);
      return reply.status(500).send({ error: 'Failed to fetch dynamic IDs' });
    }
  });

  /**
   * Set/update all dynamic IDs for a specific ad unit
   * Body: { bidders: { "appnexus": { "placement_id": "123" }, ... } }
   */
  fastify.put('/:adUnitCode', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string; adUnitCode: string };
    Body: { bidders: Record<string, Record<string, any>> };
  }>, reply: FastifyReply) => {
    const { publisherId, configId, adUnitCode } = request.params;
    const { bidders: newBidders } = request.body;

    if (!newBidders || typeof newBidders !== 'object') {
      return reply.status(400).send({ error: 'Request body must include a "bidders" object' });
    }

    // Validate bidder codes
    for (const bidderCode of Object.keys(newBidders)) {
      if (!isValidBidderCode(bidderCode)) {
        return reply.status(400).send({ error: `Invalid bidder code: '${bidderCode}'` });
      }
    }

    try {
      const config = await db
        .select()
        .from(wrapperConfigs)
        .where(
          and(
            eq(wrapperConfigs.id, configId),
            eq(wrapperConfigs.publisherId, publisherId)
          )
        )
        .get();

      if (!config) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      const adUnits = getAdUnits(config);

      if (!adUnits[adUnitCode]) {
        return reply.status(404).send({ error: `Ad unit '${adUnitCode}' not found in config` });
      }

      // Update dynamic IDs
      adUnits[adUnitCode].bidders = newBidders;

      await saveAdUnits(configId, adUnits);
      invalidatePublisherCache(publisherId);

      return reply.send({
        message: `Dynamic IDs updated for ad unit '${adUnitCode}'`,
        data: {
          adUnitCode,
          bidders: newBidders,
          bidderCount: Object.keys(newBidders).length,
        },
      });
    } catch (err) {
      console.error('Error updating dynamic IDs:', err);
      return reply.status(500).send({ error: 'Failed to update dynamic IDs' });
    }
  });

  /**
   * Remove all dynamic IDs for a specific ad unit (reverts to publisher defaults)
   */
  fastify.delete('/:adUnitCode', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string; adUnitCode: string };
  }>, reply: FastifyReply) => {
    const { publisherId, configId, adUnitCode } = request.params;

    try {
      const config = await db
        .select()
        .from(wrapperConfigs)
        .where(
          and(
            eq(wrapperConfigs.id, configId),
            eq(wrapperConfigs.publisherId, publisherId)
          )
        )
        .get();

      if (!config) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      const adUnits = getAdUnits(config);

      if (!adUnits[adUnitCode]) {
        return reply.status(404).send({ error: `Ad unit '${adUnitCode}' not found in config` });
      }

      // Remove dynamic IDs
      delete adUnits[adUnitCode].bidders;

      await saveAdUnits(configId, adUnits);
      invalidatePublisherCache(publisherId);

      return reply.send({
        message: `Dynamic IDs removed for ad unit '${adUnitCode}'. Will use publisher-level defaults.`,
      });
    } catch (err) {
      console.error('Error removing dynamic IDs:', err);
      return reply.status(500).send({ error: 'Failed to remove dynamic IDs' });
    }
  });

  /**
   * Set dynamic IDs for a specific bidder on a specific ad unit
   * Body: { params: { "placement_id": "123", ... } }
   */
  fastify.put('/:adUnitCode/:bidderCode', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string; adUnitCode: string; bidderCode: string };
    Body: { params: Record<string, any> };
  }>, reply: FastifyReply) => {
    const { publisherId, configId, adUnitCode, bidderCode } = request.params;
    const { params: bidderParams } = request.body;

    if (!bidderParams || typeof bidderParams !== 'object') {
      return reply.status(400).send({ error: 'Request body must include a "params" object' });
    }

    if (!isValidBidderCode(bidderCode)) {
      return reply.status(400).send({ error: `Invalid bidder code: '${bidderCode}'` });
    }

    try {
      const config = await db
        .select()
        .from(wrapperConfigs)
        .where(
          and(
            eq(wrapperConfigs.id, configId),
            eq(wrapperConfigs.publisherId, publisherId)
          )
        )
        .get();

      if (!config) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      const adUnits = getAdUnits(config);

      if (!adUnits[adUnitCode]) {
        return reply.status(404).send({ error: `Ad unit '${adUnitCode}' not found in config` });
      }

      // Initialize bidders map if needed
      if (!adUnits[adUnitCode].bidders) {
        adUnits[adUnitCode].bidders = {};
      }

      // Set params for this specific bidder
      adUnits[adUnitCode].bidders![bidderCode] = bidderParams;

      await saveAdUnits(configId, adUnits);
      invalidatePublisherCache(publisherId);

      return reply.send({
        message: `Dynamic IDs set for bidder '${bidderCode}' on ad unit '${adUnitCode}'`,
        data: {
          adUnitCode,
          bidderCode,
          params: bidderParams,
        },
      });
    } catch (err) {
      console.error('Error setting bidder dynamic IDs:', err);
      return reply.status(500).send({ error: 'Failed to set bidder dynamic IDs' });
    }
  });

  /**
   * Remove dynamic IDs for a specific bidder on a specific ad unit
   */
  fastify.delete('/:adUnitCode/:bidderCode', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string; adUnitCode: string; bidderCode: string };
  }>, reply: FastifyReply) => {
    const { publisherId, configId, adUnitCode, bidderCode } = request.params;

    try {
      const config = await db
        .select()
        .from(wrapperConfigs)
        .where(
          and(
            eq(wrapperConfigs.id, configId),
            eq(wrapperConfigs.publisherId, publisherId)
          )
        )
        .get();

      if (!config) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      const adUnits = getAdUnits(config);

      if (!adUnits[adUnitCode]) {
        return reply.status(404).send({ error: `Ad unit '${adUnitCode}' not found in config` });
      }

      if (!adUnits[adUnitCode].bidders || !adUnits[adUnitCode].bidders![bidderCode]) {
        return reply.status(404).send({
          error: `No dynamic IDs found for bidder '${bidderCode}' on ad unit '${adUnitCode}'`,
        });
      }

      // Remove this bidder's dynamic IDs
      delete adUnits[adUnitCode].bidders![bidderCode];

      // Clean up empty bidders map
      if (Object.keys(adUnits[adUnitCode].bidders!).length === 0) {
        delete adUnits[adUnitCode].bidders;
      }

      await saveAdUnits(configId, adUnits);
      invalidatePublisherCache(publisherId);

      return reply.send({
        message: `Dynamic IDs removed for bidder '${bidderCode}' on ad unit '${adUnitCode}'`,
      });
    } catch (err) {
      console.error('Error removing bidder dynamic IDs:', err);
      return reply.status(500).send({ error: 'Failed to remove bidder dynamic IDs' });
    }
  });
}

/**
 * Bidder parameter schema routes (registered separately)
 */
export async function bidderParamSchemaRoutes(fastify: FastifyInstance) {
  /**
   * Get the known parameter schema for a bidder
   * GET /api/bidders/param-schema/:bidderCode
   */
  fastify.get('/param-schema/:bidderCode', async (request: FastifyRequest<{
    Params: { bidderCode: string };
  }>, reply: FastifyReply) => {
    const { bidderCode } = request.params;
    const schema = getBidderParamSchema(bidderCode);

    if (!schema) {
      return reply.send({
        data: {
          bidderCode,
          schema: null,
          message: 'No known parameter schema for this bidder. Use custom key-value params.',
        },
      });
    }

    return reply.send({
      data: {
        bidderCode,
        schema,
      },
    });
  });
}
