import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { db, abTests, abTestVariants, auditLogs, publishers } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface CreateTestBody {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  parentTestId?: string; // For nested tests
  parentVariantId?: string; // Which variant of parent this belongs to
  variants: Array<{
    name: string;
    trafficPercent: number;
    isControl: boolean;
    bidderTimeout?: number;
    priceGranularity?: string;
    enableSendAllBids?: boolean;
    bidderSequence?: string;
    floorsConfig?: any;
    bidderOverrides?: any;
    additionalBidders?: Array<{
      bidderCode: string;
      enabled: boolean;
      params: any;
      timeoutOverride?: number;
      priority?: number;
    }>;
  }>;
}

interface UpdateTestBody {
  name?: string;
  description?: string;
  status?: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: string;
  endDate?: string;
}

interface UpdateVariantBody {
  name?: string;
  trafficPercent?: number;
  isControl?: boolean;
  bidderTimeout?: number;
  priceGranularity?: string;
  enableSendAllBids?: boolean;
  bidderSequence?: string;
  floorsConfig?: any;
  bidderOverrides?: any;
  additionalBidders?: Array<{
    bidderCode: string;
    enabled: boolean;
    params: any;
    timeoutOverride?: number;
    priority?: number;
  }>;
}

async function abTestRoutes(app: FastifyInstance, options: FastifyPluginOptions) {
  // Auth middleware
  app.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // List A/B tests for a publisher
  app.get('/:publisherId/ab-tests', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const tests = db
      .select()
      .from(abTests)
      .where(eq(abTests.publisherId, publisherId))
      .orderBy(desc(abTests.createdAt))
      .all();

    // Get variants for each test
    const testsWithVariants = tests.map(test => {
      const variants = db
        .select()
        .from(abTestVariants)
        .where(eq(abTestVariants.testId, test.id))
        .all();

      return {
        ...test,
        variants: variants.map(v => ({
          ...v,
          floorsConfig: v.floorsConfig ? JSON.parse(v.floorsConfig) : null,
          bidderOverrides: v.bidderOverrides ? JSON.parse(v.bidderOverrides) : null,
        })),
      };
    });

    return testsWithVariants;
  });

  // Get a single A/B test
  app.get('/:publisherId/ab-tests/:testId', async (request, reply) => {
    const { publisherId, testId } = request.params as { publisherId: string; testId: string };

    const test = db
      .select()
      .from(abTests)
      .where(and(eq(abTests.id, testId), eq(abTests.publisherId, publisherId)))
      .get();

    if (!test) {
      return reply.code(404).send({ error: 'A/B test not found' });
    }

    const variants = db
      .select()
      .from(abTestVariants)
      .where(eq(abTestVariants.testId, testId))
      .all();

    return {
      ...test,
      variants: variants.map(v => ({
        ...v,
        floorsConfig: v.floorsConfig ? JSON.parse(v.floorsConfig) : null,
        bidderOverrides: v.bidderOverrides ? JSON.parse(v.bidderOverrides) : null,
      })),
    };
  });

  // Create a new A/B test
  app.post('/:publisherId/ab-tests', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const body = request.body as CreateTestBody;
    const user = request.user as any;

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Validate variants
    if (!body.variants || body.variants.length < 2) {
      return reply.code(400).send({ error: 'At least 2 variants are required' });
    }

    // Validate traffic percentages sum to 100
    const totalPercent = body.variants.reduce((sum, v) => sum + v.trafficPercent, 0);
    if (totalPercent !== 100) {
      return reply.code(400).send({ error: 'Traffic percentages must sum to 100' });
    }

    // Ensure exactly one control variant
    const controlVariants = body.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      return reply.code(400).send({ error: 'Exactly one control variant is required' });
    }

    const now = new Date().toISOString();
    const testId = uuidv4();

    // Determine test level
    let level = 0;
    if (body.parentTestId) {
      const parentTest = db.select().from(abTests).where(eq(abTests.id, body.parentTestId)).get();
      if (!parentTest) {
        return reply.code(404).send({ error: 'Parent test not found' });
      }
      level = (parentTest.level || 0) + 1;

      // Verify parent variant exists
      if (body.parentVariantId) {
        const parentVariant = db
          .select()
          .from(abTestVariants)
          .where(and(eq(abTestVariants.id, body.parentVariantId), eq(abTestVariants.testId, body.parentTestId)))
          .get();
        if (!parentVariant) {
          return reply.code(404).send({ error: 'Parent variant not found' });
        }
      }
    }

    // Create the test
    db.insert(abTests).values({
      id: testId,
      publisherId,
      name: body.name,
      description: body.description || null,
      status: 'draft',
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      parentTestId: body.parentTestId || null,
      parentVariantId: body.parentVariantId || null,
      level,
      createdAt: now,
      updatedAt: now,
    });

    // Create variants
    for (const variant of body.variants) {
      db.insert(abTestVariants).values({
        id: uuidv4(),
        testId,
        name: variant.name,
        trafficPercent: variant.trafficPercent,
        isControl: variant.isControl ? 1 : 0,
        bidderTimeout: variant.bidderTimeout || null,
        priceGranularity: variant.priceGranularity || null,
        enableSendAllBids: variant.enableSendAllBids !== undefined ? (variant.enableSendAllBids ? 1 : 0) : null,
        bidderSequence: variant.bidderSequence || null,
        floorsConfig: variant.floorsConfig ? JSON.stringify(variant.floorsConfig) : null,
        bidderOverrides: variant.bidderOverrides ? JSON.stringify(variant.bidderOverrides) : null,
        additionalBidders: variant.additionalBidders ? JSON.stringify(variant.additionalBidders) : null,
        createdAt: now,
        updatedAt: now,
      } as any);
    }

    // Audit log
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.id,
      action: 'CREATE_AB_TEST',
      entityType: 'ab_test',
      entityId: testId,
      newValues: JSON.stringify({ name: body.name, variants: body.variants.length }),
      createdAt: now,
    });

    // Return the created test with variants
    const createdTest = db.select().from(abTests).where(eq(abTests.id, testId)).get();
    const createdVariants = db.select().from(abTestVariants).where(eq(abTestVariants.testId, testId)).all();

    return reply.code(201).send({
      ...createdTest,
      variants: createdVariants.map(v => ({
        ...v,
        floorsConfig: v.floorsConfig ? JSON.parse(v.floorsConfig) : null,
        bidderOverrides: v.bidderOverrides ? JSON.parse(v.bidderOverrides) : null,
      })),
    });
  });

  // Update an A/B test
  app.put('/:publisherId/ab-tests/:testId', async (request, reply) => {
    const { publisherId, testId } = request.params as { publisherId: string; testId: string };
    const body = request.body as UpdateTestBody;
    const user = request.user as any;

    const test = db
      .select()
      .from(abTests)
      .where(and(eq(abTests.id, testId), eq(abTests.publisherId, publisherId)))
      .get();

    if (!test) {
      return reply.code(404).send({ error: 'A/B test not found' });
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = { updatedAt: now };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.startDate !== undefined) updates.startDate = body.startDate;
    if (body.endDate !== undefined) updates.endDate = body.endDate;

    db.update(abTests).set(updates).where(eq(abTests.id, testId));

    // Audit log
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.id,
      action: 'UPDATE_AB_TEST',
      entityType: 'ab_test',
      entityId: testId,
      oldValues: JSON.stringify({ name: test.name, status: test.status }),
      newValues: JSON.stringify(updates),
      createdAt: now,
    });

    // Return updated test
    const updatedTest = db.select().from(abTests).where(eq(abTests.id, testId)).get();
    const variants = db.select().from(abTestVariants).where(eq(abTestVariants.testId, testId)).all();

    return {
      ...updatedTest,
      variants: variants.map(v => ({
        ...v,
        floorsConfig: v.floorsConfig ? JSON.parse(v.floorsConfig) : null,
        bidderOverrides: v.bidderOverrides ? JSON.parse(v.bidderOverrides) : null,
      })),
    };
  });

  // Update a variant
  app.put('/:publisherId/ab-tests/:testId/variants/:variantId', async (request, reply) => {
    const { publisherId, testId, variantId } = request.params as { publisherId: string; testId: string; variantId: string };
    const body = request.body as UpdateVariantBody;
    const user = request.user as any;

    const test = db
      .select()
      .from(abTests)
      .where(and(eq(abTests.id, testId), eq(abTests.publisherId, publisherId)))
      .get();

    if (!test) {
      return reply.code(404).send({ error: 'A/B test not found' });
    }

    const variant = db
      .select()
      .from(abTestVariants)
      .where(and(eq(abTestVariants.id, variantId), eq(abTestVariants.testId, testId)))
      .get();

    if (!variant) {
      return reply.code(404).send({ error: 'Variant not found' });
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = { updatedAt: now };

    if (body.name !== undefined) updates.name = body.name;
    if (body.trafficPercent !== undefined) updates.trafficPercent = body.trafficPercent;
    if (body.isControl !== undefined) updates.isControl = body.isControl ? 1 : 0;
    if (body.bidderTimeout !== undefined) updates.bidderTimeout = body.bidderTimeout;
    if (body.priceGranularity !== undefined) updates.priceGranularity = body.priceGranularity;
    if (body.enableSendAllBids !== undefined) updates.enableSendAllBids = body.enableSendAllBids ? 1 : 0;
    if (body.bidderSequence !== undefined) updates.bidderSequence = body.bidderSequence;
    if (body.floorsConfig !== undefined) updates.floorsConfig = JSON.stringify(body.floorsConfig);
    if (body.bidderOverrides !== undefined) updates.bidderOverrides = JSON.stringify(body.bidderOverrides);
    if (body.additionalBidders !== undefined) updates.additionalBidders = JSON.stringify(body.additionalBidders);

    db.update(abTestVariants).set(updates).where(eq(abTestVariants.id, variantId));

    // Audit log
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.id,
      action: 'UPDATE_AB_VARIANT',
      entityType: 'ab_test_variant',
      entityId: variantId,
      newValues: JSON.stringify(updates),
      createdAt: now,
    });

    // Return updated variant
    const updatedVariant = db.select().from(abTestVariants).where(eq(abTestVariants.id, variantId)).get();
    return {
      ...updatedVariant,
      floorsConfig: updatedVariant?.floorsConfig ? JSON.parse(updatedVariant.floorsConfig) : null,
      bidderOverrides: updatedVariant?.bidderOverrides ? JSON.parse(updatedVariant.bidderOverrides) : null,
      additionalBidders: updatedVariant?.additionalBidders ? JSON.parse(updatedVariant.additionalBidders) : null,
    };
  });

  // Delete an A/B test
  app.delete('/:publisherId/ab-tests/:testId', async (request, reply) => {
    const { publisherId, testId } = request.params as { publisherId: string; testId: string };
    const user = request.user as any;

    const test = db
      .select()
      .from(abTests)
      .where(and(eq(abTests.id, testId), eq(abTests.publisherId, publisherId)))
      .get();

    if (!test) {
      return reply.code(404).send({ error: 'A/B test not found' });
    }

    // Delete variants first
    db.delete(abTestVariants).where(eq(abTestVariants.testId, testId));

    // Delete test
    db.delete(abTests).where(eq(abTests.id, testId));

    // Audit log
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user.id,
      action: 'DELETE_AB_TEST',
      entityType: 'ab_test',
      entityId: testId,
      oldValues: JSON.stringify({ name: test.name }),
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  });

  // Get nested tests for a variant
  app.get('/:publisherId/ab-tests/:testId/variants/:variantId/nested-tests', async (request, reply) => {
    const { publisherId, testId, variantId } = request.params as { publisherId: string; testId: string; variantId: string };

    const test = db
      .select()
      .from(abTests)
      .where(and(eq(abTests.id, testId), eq(abTests.publisherId, publisherId)))
      .get();

    if (!test) {
      return reply.code(404).send({ error: 'A/B test not found' });
    }

    // Get nested tests for this variant
    const nestedTests = db
      .select()
      .from(abTests)
      .where(and(eq(abTests.parentTestId, testId), eq(abTests.parentVariantId, variantId)))
      .all();

    // Get variants for each nested test
    const testsWithVariants = nestedTests.map(nestedTest => {
      const variants = db
        .select()
        .from(abTestVariants)
        .where(eq(abTestVariants.testId, nestedTest.id))
        .all();

      return {
        ...nestedTest,
        variants: variants.map(v => ({
          ...v,
          floorsConfig: v.floorsConfig ? JSON.parse(v.floorsConfig) : null,
          bidderOverrides: v.bidderOverrides ? JSON.parse(v.bidderOverrides) : null,
          additionalBidders: v.additionalBidders ? JSON.parse(v.additionalBidders) : null,
        })),
      };
    });

    return testsWithVariants;
  });

  // Get active A/B test for a publisher (used by config endpoint)
  app.get('/:publisherId/ab-tests/active', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    const activeTest = db
      .select()
      .from(abTests)
      .where(and(eq(abTests.publisherId, publisherId), eq(abTests.status, 'running')))
      .get();

    if (!activeTest) {
      return reply.code(404).send({ error: 'No active A/B test found' });
    }

    const variants = db
      .select()
      .from(abTestVariants)
      .where(eq(abTestVariants.testId, activeTest.id))
      .all();

    return {
      ...activeTest,
      variants: variants.map(v => ({
        ...v,
        floorsConfig: v.floorsConfig ? JSON.parse(v.floorsConfig) : null,
        bidderOverrides: v.bidderOverrides ? JSON.parse(v.bidderOverrides) : null,
      })),
    };
  });
}

export default abTestRoutes;
