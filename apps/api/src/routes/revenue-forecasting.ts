import { FastifyInstance } from 'fastify';
import { db, publishers } from '../db';
import { eq } from 'drizzle-orm';
import {
  getHistoricalRevenue,
  generateForecast,
  detectSeasonality,
  calculatePacing,
} from '../services/forecasting-service';
import {
  modelScenario,
  ScenarioType,
  ScenarioParameters,
} from '../services/scenario-service';
import { detectAnomalies } from '../services/anomaly-detection-service';

export default async function revenueForecastingRoutes(fastify: FastifyInstance) {
  // Auth middleware
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  /**
   * Get historical revenue data
   * GET /api/publishers/:publisherId/revenue-forecasting/historical
   */
  fastify.get('/:publisherId/revenue-forecasting/historical', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      startDate,
      endDate,
      granularity = 'day'
    } = request.query as {
      startDate?: string;
      endDate?: string;
      granularity?: 'hour' | 'day' | 'week' | 'month';
    };

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Default to last 90 days
    const end = endDate || new Date().toISOString();
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const result = getHistoricalRevenue(publisherId, start, end, granularity);

    return {
      timeRange: { start, end },
      granularity,
      data: result.data,
      totalRevenue: result.totalRevenue,
      totalImpressions: result.totalImpressions,
    };
  });

  /**
   * Get revenue forecast
   * GET /api/publishers/:publisherId/revenue-forecasting/forecast
   */
  fastify.get('/:publisherId/revenue-forecasting/forecast', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      days = '30'
    } = request.query as {
      days?: string;
    };

    const forecastDays = parseInt(days);

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const result = generateForecast(publisherId, forecastDays);

    return result;
  });

  /**
   * Detect seasonality patterns
   * GET /api/publishers/:publisherId/revenue-forecasting/seasonality
   */
  fastify.get('/:publisherId/revenue-forecasting/seasonality', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const result = detectSeasonality(publisherId);

    return result;
  });

  /**
   * Detect revenue anomalies
   * GET /api/publishers/:publisherId/revenue-forecasting/anomalies
   */
  fastify.get('/:publisherId/revenue-forecasting/anomalies', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      days = '30',
      threshold = '2.0'
    } = request.query as {
      days?: string;
      threshold?: string;
    };

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const daysBack = parseInt(days);
    const stdDevThreshold = parseFloat(threshold);

    const result = detectAnomalies(publisherId, daysBack, stdDevThreshold);

    return result;
  });

  /**
   * What-if scenario modeling
   * POST /api/publishers/:publisherId/revenue-forecasting/scenario
   */
  fastify.post('/:publisherId/revenue-forecasting/scenario', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const body = request.body as {
      scenario: ScenarioType;
      parameters: ScenarioParameters;
      timeframe: 'week' | 'month' | 'quarter';
    };

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const result = modelScenario(
      publisherId,
      body.scenario,
      body.parameters,
      body.timeframe
    );

    return result;
  });

  /**
   * Budget pacing & goal tracking
   * GET /api/publishers/:publisherId/revenue-forecasting/pacing
   */
  fastify.get('/:publisherId/revenue-forecasting/pacing', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const {
      goalAmount,
      goalPeriod = 'month'
    } = request.query as {
      goalAmount?: string;
      goalPeriod?: 'week' | 'month' | 'quarter' | 'year';
    };

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const goal = goalAmount ? parseFloat(goalAmount) : null;

    const result = calculatePacing(publisherId, goal, goalPeriod);

    return result;
  });
}
