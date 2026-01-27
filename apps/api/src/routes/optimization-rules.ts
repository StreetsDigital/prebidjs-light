import { FastifyInstance } from 'fastify';
import { db, optimizationRules, ruleExecutions, publishers, publisherBidders, analyticsEvents } from '../db';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface Condition {
  metric: string; // e.g., 'timeout_rate', 'response_rate', 'revenue', 'latency'
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  timeWindow: string; // e.g., '1h', '24h', '7d'
  target?: string; // Optional: specific bidder code, ad unit, etc.
}

interface Action {
  type: string; // e.g., 'disable_bidder', 'adjust_timeout', 'send_alert'
  target?: string; // Bidder code, config field, etc.
  value?: any; // New value or adjustment
  notification?: {
    channels: ('email' | 'slack' | 'webhook')[];
    message: string;
  };
}

interface Schedule {
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  hoursOfDay?: number[]; // 0-23
  startDate?: string;
  endDate?: string;
}

interface CreateRuleBody {
  name: string;
  description?: string;
  ruleType: 'auto_disable_bidder' | 'auto_adjust_timeout' | 'auto_adjust_floor' | 'auto_enable_bidder' | 'alert_notification' | 'traffic_allocation';
  conditions: Condition[];
  actions: Action[];
  schedule?: Schedule;
  enabled?: boolean;
  priority?: number;
}

export default async function optimizationRulesRoutes(fastify: FastifyInstance) {
  // Auth middleware
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  /**
   * List optimization rules for a publisher
   * GET /api/publishers/:publisherId/optimization-rules
   */
  fastify.get('/:publisherId/optimization-rules', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const rules = db
      .select()
      .from(optimizationRules)
      .where(eq(optimizationRules.publisherId, publisherId))
      .orderBy(desc(optimizationRules.priority), desc(optimizationRules.createdAt))
      .all();

    return rules.map(rule => ({
      ...rule,
      conditions: JSON.parse(rule.conditions),
      actions: JSON.parse(rule.actions),
      schedule: rule.schedule ? JSON.parse(rule.schedule) : null,
    }));
  });

  /**
   * Get a single optimization rule
   * GET /api/publishers/:publisherId/optimization-rules/:ruleId
   */
  fastify.get('/:publisherId/optimization-rules/:ruleId', async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };

    const rule = db
      .select()
      .from(optimizationRules)
      .where(and(eq(optimizationRules.id, ruleId), eq(optimizationRules.publisherId, publisherId)))
      .get();

    if (!rule) {
      return reply.code(404).send({ error: 'Rule not found' });
    }

    return {
      ...rule,
      conditions: JSON.parse(rule.conditions),
      actions: JSON.parse(rule.actions),
      schedule: rule.schedule ? JSON.parse(rule.schedule) : null,
    };
  });

  /**
   * Create a new optimization rule
   * POST /api/publishers/:publisherId/optimization-rules
   */
  fastify.post('/:publisherId/optimization-rules', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const body = request.body as CreateRuleBody;
    const user = request.user as { id: string };

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Validate conditions
    if (!body.conditions || body.conditions.length === 0) {
      return reply.code(400).send({ error: 'At least one condition is required' });
    }

    // Validate actions
    if (!body.actions || body.actions.length === 0) {
      return reply.code(400).send({ error: 'At least one action is required' });
    }

    const now = new Date().toISOString();
    const ruleId = uuidv4();

    db.insert(optimizationRules).values({
      id: ruleId,
      publisherId,
      name: body.name,
      description: body.description || null,
      ruleType: body.ruleType,
      conditions: JSON.stringify(body.conditions),
      actions: JSON.stringify(body.actions),
      schedule: body.schedule ? JSON.stringify(body.schedule) : null,
      enabled: body.enabled !== undefined ? (body.enabled ? 1 : 0) : 1,
      priority: body.priority || 0,
      lastExecuted: null,
      executionCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const createdRule = db
      .select()
      .from(optimizationRules)
      .where(eq(optimizationRules.id, ruleId))
      .get();

    return reply.code(201).send({
      ...createdRule,
      conditions: JSON.parse(createdRule!.conditions),
      actions: JSON.parse(createdRule!.actions),
      schedule: createdRule!.schedule ? JSON.parse(createdRule!.schedule) : null,
    });
  });

  /**
   * Update an optimization rule
   * PUT /api/publishers/:publisherId/optimization-rules/:ruleId
   */
  fastify.put('/:publisherId/optimization-rules/:ruleId', async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };
    const body = request.body as Partial<CreateRuleBody>;

    const rule = db
      .select()
      .from(optimizationRules)
      .where(and(eq(optimizationRules.id, ruleId), eq(optimizationRules.publisherId, publisherId)))
      .get();

    if (!rule) {
      return reply.code(404).send({ error: 'Rule not found' });
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = { updatedAt: now };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.ruleType !== undefined) updates.ruleType = body.ruleType;
    if (body.conditions !== undefined) updates.conditions = JSON.stringify(body.conditions);
    if (body.actions !== undefined) updates.actions = JSON.stringify(body.actions);
    if (body.schedule !== undefined) updates.schedule = body.schedule ? JSON.stringify(body.schedule) : null;
    if (body.enabled !== undefined) updates.enabled = body.enabled ? 1 : 0;
    if (body.priority !== undefined) updates.priority = body.priority;

    db.update(optimizationRules).set(updates).where(eq(optimizationRules.id, ruleId));

    const updatedRule = db
      .select()
      .from(optimizationRules)
      .where(eq(optimizationRules.id, ruleId))
      .get();

    return {
      ...updatedRule,
      conditions: JSON.parse(updatedRule!.conditions),
      actions: JSON.parse(updatedRule!.actions),
      schedule: updatedRule!.schedule ? JSON.parse(updatedRule!.schedule) : null,
    };
  });

  /**
   * Delete an optimization rule
   * DELETE /api/publishers/:publisherId/optimization-rules/:ruleId
   */
  fastify.delete('/:publisherId/optimization-rules/:ruleId', async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };

    const rule = db
      .select()
      .from(optimizationRules)
      .where(and(eq(optimizationRules.id, ruleId), eq(optimizationRules.publisherId, publisherId)))
      .get();

    if (!rule) {
      return reply.code(404).send({ error: 'Rule not found' });
    }

    db.delete(optimizationRules).where(eq(optimizationRules.id, ruleId));

    return { success: true };
  });

  /**
   * Toggle rule enabled/disabled
   * PATCH /api/publishers/:publisherId/optimization-rules/:ruleId/toggle
   */
  fastify.patch('/:publisherId/optimization-rules/:ruleId/toggle', async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };

    const rule = db
      .select()
      .from(optimizationRules)
      .where(and(eq(optimizationRules.id, ruleId), eq(optimizationRules.publisherId, publisherId)))
      .get();

    if (!rule) {
      return reply.code(404).send({ error: 'Rule not found' });
    }

    const newEnabled = rule.enabled ? 0 : 1;

    db.update(optimizationRules)
      .set({
        enabled: newEnabled,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(optimizationRules.id, ruleId))
      ;

    return { enabled: !!newEnabled };
  });

  /**
   * Get rule execution history
   * GET /api/publishers/:publisherId/optimization-rules/:ruleId/executions
   */
  fastify.get('/:publisherId/optimization-rules/:ruleId/executions', async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };
    const { limit = '50' } = request.query as { limit?: string };

    const executions = db
      .select()
      .from(ruleExecutions)
      .where(and(eq(ruleExecutions.ruleId, ruleId), eq(ruleExecutions.publisherId, publisherId)))
      .orderBy(desc(ruleExecutions.executedAt))
      .limit(parseInt(limit))
      .all();

    return executions.map(exec => ({
      ...exec,
      conditionsMet: JSON.parse(exec.conditionsMet),
      actionsPerformed: JSON.parse(exec.actionsPerformed),
      metricsSnapshot: exec.metricsSnapshot ? JSON.parse(exec.metricsSnapshot) : null,
    }));
  });

  /**
   * Get all rule executions for a publisher (audit log)
   * GET /api/publishers/:publisherId/optimization-rules/executions
   */
  fastify.get('/:publisherId/optimization-rules-executions', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { limit = '100', ruleType } = request.query as { limit?: string; ruleType?: string };

    let query = db
      .select()
      .from(ruleExecutions)
      .where(eq(ruleExecutions.publisherId, publisherId))
      .orderBy(desc(ruleExecutions.executedAt))
      .limit(parseInt(limit));

    const executions = query.all();

    // Join with rules to get rule type if filtering
    const executionsWithRules = executions.map(exec => {
      const rule = db
        .select()
        .from(optimizationRules)
        .where(eq(optimizationRules.id, exec.ruleId))
        .get();

      return {
        ...exec,
        ruleName: rule?.name || 'Deleted Rule',
        ruleType: rule?.ruleType || 'unknown',
        conditionsMet: JSON.parse(exec.conditionsMet),
        actionsPerformed: JSON.parse(exec.actionsPerformed),
        metricsSnapshot: exec.metricsSnapshot ? JSON.parse(exec.metricsSnapshot) : null,
      };
    });

    // Filter by rule type if specified
    if (ruleType) {
      return executionsWithRules.filter(e => e.ruleType === ruleType);
    }

    return executionsWithRules;
  });

  /**
   * Test/simulate a rule (dry run)
   * POST /api/publishers/:publisherId/optimization-rules/:ruleId/test
   */
  fastify.post('/:publisherId/optimization-rules/:ruleId/test', async (request, reply) => {
    const { publisherId, ruleId } = request.params as { publisherId: string; ruleId: string };

    const rule = db
      .select()
      .from(optimizationRules)
      .where(and(eq(optimizationRules.id, ruleId), eq(optimizationRules.publisherId, publisherId)))
      .get();

    if (!rule) {
      return reply.code(404).send({ error: 'Rule not found' });
    }

    const conditions = JSON.parse(rule.conditions) as Condition[];
    const actions = JSON.parse(rule.actions) as Action[];

    // Evaluate conditions against current metrics
    const now = new Date();
    const evaluationResults: Array<{
      condition: Condition;
      currentValue: number;
      threshold: number;
      met: boolean;
    }> = [];

    for (const condition of conditions) {
      // Calculate time window
      const hours = condition.timeWindow === '1h' ? 1 :
                   condition.timeWindow === '6h' ? 6 :
                   condition.timeWindow === '24h' ? 24 :
                   condition.timeWindow === '7d' ? 168 : 24;
      const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

      // Get metrics from analytics events
      let currentValue = 0;

      if (condition.metric === 'timeout_rate') {
        const events = db
          .select()
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.publisherId, publisherId),
              eq(analyticsEvents.eventType, 'bidResponse'),
              gte(analyticsEvents.timestamp, startTime),
              condition.target ? eq(analyticsEvents.bidderCode, condition.target) : undefined
            )
          )
          .all();

        const timeouts = events.filter(e => e.timeout).length;
        currentValue = events.length > 0 ? (timeouts / events.length) * 100 : 0;
      } else if (condition.metric === 'response_rate') {
        const events = db
          .select()
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.publisherId, publisherId),
              eq(analyticsEvents.eventType, 'bidResponse'),
              gte(analyticsEvents.timestamp, startTime),
              condition.target ? eq(analyticsEvents.bidderCode, condition.target) : undefined
            )
          )
          .all();

        const responses = events.filter(e => !e.timeout).length;
        currentValue = events.length > 0 ? (responses / events.length) * 100 : 0;
      } else if (condition.metric === 'avg_latency') {
        const events = db
          .select()
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.publisherId, publisherId),
              eq(analyticsEvents.eventType, 'bidResponse'),
              gte(analyticsEvents.timestamp, startTime),
              condition.target ? eq(analyticsEvents.bidderCode, condition.target) : undefined
            )
          )
          .all();

        const latencies = events.filter(e => !e.timeout && e.latencyMs).map(e => e.latencyMs!);
        currentValue = latencies.length > 0
          ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
          : 0;
      } else if (condition.metric === 'revenue') {
        const events = db
          .select()
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.publisherId, publisherId),
              eq(analyticsEvents.eventType, 'bidWon'),
              gte(analyticsEvents.timestamp, startTime),
              condition.target ? eq(analyticsEvents.bidderCode, condition.target) : undefined
            )
          )
          .all();

        currentValue = events.reduce((sum, e) => sum + (parseFloat(e.cpm || '0') / 1000), 0);
      }

      // Evaluate condition
      let met = false;
      switch (condition.operator) {
        case '>': met = currentValue > condition.value; break;
        case '<': met = currentValue < condition.value; break;
        case '>=': met = currentValue >= condition.value; break;
        case '<=': met = currentValue <= condition.value; break;
        case '==': met = currentValue === condition.value; break;
        case '!=': met = currentValue !== condition.value; break;
      }

      evaluationResults.push({
        condition,
        currentValue,
        threshold: condition.value,
        met,
      });
    }

    const allConditionsMet = evaluationResults.every(r => r.met);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      wouldExecute: allConditionsMet,
      conditionResults: evaluationResults,
      plannedActions: allConditionsMet ? actions : [],
      dryRun: true,
    };
  });
}
