import { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { CurrencyService } from '../services/currency-service';
import { validateUUID } from '../utils/validation';
import { db, publishers } from '../db';
import { eq } from 'drizzle-orm';

export default async function currencyRoutes(fastify: FastifyInstance) {
  /**
   * Get latest currency rates
   * Public endpoint - used by wrapper
   */
  fastify.get('/rates', async (request, reply) => {
    try {
      const rates = await CurrencyService.fetchCurrencyRates();
      return rates;
    } catch (error) {
      return reply.code(500).send({
        error: 'Failed to fetch currency rates',
        message: error.message,
      });
    }
  });

  /**
   * Get supported currencies list
   */
  fastify.get('/supported', async (request, reply) => {
    try {
      const currencies = await CurrencyService.getSupportedCurrencies();
      return { currencies };
    } catch (error) {
      return reply.code(500).send({
        error: 'Failed to fetch supported currencies',
        message: error.message,
      });
    }
  });

  /**
   * Get currency config for a specific publisher
   * Used by wrapper to configure Prebid.js currency module
   */
  fastify.get<{ Params: { publisherId: string } }>(
    '/config/:publisherId',
    async (request, reply) => {
      const { publisherId } = request.params;

      try {
        validateUUID(publisherId, 'Publisher ID');
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }

      try {
        const config = await CurrencyService.getPrebidCurrencyConfig(publisherId);
        return config;
      } catch (error) {
        return reply.code(500).send({
          error: 'Failed to fetch currency config',
          message: error.message,
        });
      }
    }
  );

  /**
   * Update publisher currency preference
   * Admin only
   */
  fastify.put<{
    Params: { publisherId: string };
    Body: { currency: string };
  }>(
    '/:publisherId',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { publisherId } = request.params;
      const { currency } = request.body;

      try {
        validateUUID(publisherId, 'Publisher ID');
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }

      // Validate currency code
      if (!currency || currency.length !== 3) {
        return reply.code(400).send({
          error: 'Invalid currency code',
          message: 'Currency must be a 3-letter code (e.g., USD, EUR, GBP)',
        });
      }

      const upperCurrency = currency.toUpperCase();

      // Verify currency is supported
      try {
        const supported = await CurrencyService.getSupportedCurrencies();
        if (!supported.includes(upperCurrency)) {
          return reply.code(400).send({
            error: 'Unsupported currency',
            message: `Currency ${upperCurrency} is not supported`,
            supportedCurrencies: supported,
          });
        }
      } catch (error) {
        return reply.code(500).send({
          error: 'Failed to validate currency',
          message: error.message,
        });
      }

      // Update publisher
      const now = new Date().toISOString();
      db.update(publishers)
        .set({ currency: upperCurrency, updatedAt: now })
        .where(eq(publishers.id, publisherId))
        .run();

      const updated = db
        .select()
        .from(publishers)
        .where(eq(publishers.id, publisherId))
        .get();

      if (!updated) {
        return reply.code(404).send({ error: 'Publisher not found' });
      }

      return {
        id: updated.id,
        currency: updated.currency,
        message: `Currency updated to ${upperCurrency}`,
      };
    }
  );

  /**
   * Get conversion rate between two currencies
   */
  fastify.get<{
    Querystring: { from: string; to: string };
  }>('/convert', async (request, reply) => {
    const { from, to } = request.query;

    if (!from || !to) {
      return reply.code(400).send({
        error: 'Missing parameters',
        message: 'Both "from" and "to" currency codes are required',
      });
    }

    try {
      const rate = await CurrencyService.getConversionRate(
        from.toUpperCase(),
        to.toUpperCase()
      );

      if (rate === null) {
        return reply.code(404).send({
          error: 'Conversion not available',
          message: `Cannot convert from ${from} to ${to}`,
        });
      }

      return {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate,
      };
    } catch (error) {
      return reply.code(500).send({
        error: 'Conversion failed',
        message: error.message,
      });
    }
  });
}
