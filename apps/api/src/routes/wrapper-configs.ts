import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db, wrapperConfigs, configTargetingRules, configServeLog } from '../db';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { invalidatePublisherCache } from '../utils/wrapper-generator';
import { testMatch, RequestAttributes } from '../utils/targeting';

interface CreateConfigBody {
  name: string;
  description?: string;
  status?: 'draft' | 'active' | 'paused' | 'archived';
  isDefault?: boolean;
  websiteId?: string; // NEW: Website-specific config
  blockWrapper?: boolean; // NEW: Block wrapper initialization

  // Wrapper settings
  bidderTimeout?: number;
  priceGranularity?: string;
  customPriceBucket?: any;
  enableSendAllBids?: boolean;
  bidderSequence?: string;
  userSync?: any;
  targetingControls?: any;
  currencyConfig?: any;
  consentManagement?: any;
  floorsConfig?: any;
  userIdModules?: any;
  videoConfig?: any;
  s2sConfig?: any;
  debugMode?: boolean;
  customConfig?: any;

  // Bidders and ad units
  bidders?: any[];
  adUnits?: Record<string, any>;

  // Targeting rules
  targetingRules?: {
    conditions: any[];
    matchType: 'all' | 'any';
    priority: number;
  };
}

export default async function wrapperConfigsRoutes(fastify: FastifyInstance) {
  // List all configs for publisher
  fastify.get('/', async (request: FastifyRequest<{
    Params: { publisherId: string };
    Querystring: { status?: string };
  }>, reply: FastifyReply) => {
    const { publisherId } = request.params;
    const { status } = request.query;

    try {
      let query = db
        .select({
          config: wrapperConfigs,
          rule: configTargetingRules,
        })
        .from(wrapperConfigs)
        .leftJoin(
          configTargetingRules,
          eq(wrapperConfigs.id, configTargetingRules.configId)
        )
        .where(eq(wrapperConfigs.publisherId, publisherId))
        .$dynamic();

      if (status) {
        query = query.where(eq(wrapperConfigs.status, status as any));
      }

      const results = await query.orderBy(desc(wrapperConfigs.createdAt)).all();

      // Group by config
      const configsMap = new Map();
      for (const row of results) {
        if (!configsMap.has(row.config.id)) {
          configsMap.set(row.config.id, {
            ...row.config,
            rules: [],
          });
        }
        if (row.rule) {
          configsMap.get(row.config.id).rules.push(row.rule);
        }
      }

      const configs = Array.from(configsMap.values());

      return reply.send({ data: configs });
    } catch (err) {
      console.error('Error fetching wrapper configs:', err);
      return reply.status(500).send({ error: 'Failed to fetch configs' });
    }
  });

  // Get single config
  fastify.get('/:configId', async (request: FastifyRequest<{
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

      // Get targeting rules
      const rules = await db
        .select()
        .from(configTargetingRules)
        .where(eq(configTargetingRules.configId, configId))
        .all();

      return reply.send({ data: { ...config, rules } });
    } catch (err) {
      console.error('Error fetching config:', err);
      return reply.status(500).send({ error: 'Failed to fetch config' });
    }
  });

  // Create new config
  fastify.post('/', async (request: FastifyRequest<{
    Params: { publisherId: string };
    Body: CreateConfigBody;
  }>, reply: FastifyReply) => {
    const { publisherId } = request.params;
    const body = request.body;

    try {
      const configId = uuidv4();
      const now = new Date().toISOString();

      // If this is set as default, unset other defaults
      if (body.isDefault) {
        await db
          .update(wrapperConfigs)
          .set({ isDefault: false })
          .where(
            and(
              eq(wrapperConfigs.publisherId, publisherId),
              eq(wrapperConfigs.isDefault, true)
            )
          )
          .run();
      }

      // Create config
      await db.insert(wrapperConfigs).values({
        id: configId,
        publisherId,
        websiteId: body.websiteId || null, // NEW: Website-specific config support
        name: body.name,
        description: body.description,
        status: body.status || 'draft',
        blockWrapper: body.blockWrapper || false, // NEW: Blocking support
        bidderTimeout: body.bidderTimeout,
        priceGranularity: body.priceGranularity,
        customPriceBucket: body.customPriceBucket ? JSON.stringify(body.customPriceBucket) : null,
        enableSendAllBids: body.enableSendAllBids,
        bidderSequence: body.bidderSequence,
        userSync: body.userSync ? JSON.stringify(body.userSync) : null,
        targetingControls: body.targetingControls ? JSON.stringify(body.targetingControls) : null,
        currencyConfig: body.currencyConfig ? JSON.stringify(body.currencyConfig) : null,
        consentManagement: body.consentManagement ? JSON.stringify(body.consentManagement) : null,
        floorsConfig: body.floorsConfig ? JSON.stringify(body.floorsConfig) : null,
        userIdModules: body.userIdModules ? JSON.stringify(body.userIdModules) : null,
        videoConfig: body.videoConfig ? JSON.stringify(body.videoConfig) : null,
        s2sConfig: body.s2sConfig ? JSON.stringify(body.s2sConfig) : null,
        debugMode: body.debugMode,
        customConfig: body.customConfig ? JSON.stringify(body.customConfig) : null,
        bidders: body.bidders ? JSON.stringify(body.bidders) : null,
        adUnits: body.adUnits ? JSON.stringify(body.adUnits) : null,
        version: 1,
        isDefault: body.isDefault || false,
        createdAt: now,
        updatedAt: now,
      }).run();

      // Create targeting rules if provided
      if (body.targetingRules) {
        const ruleId = uuidv4();
        await db.insert(configTargetingRules).values({
          id: ruleId,
          configId,
          publisherId,
          conditions: JSON.stringify(body.targetingRules.conditions),
          matchType: body.targetingRules.matchType,
          priority: body.targetingRules.priority || 0,
          enabled: true,
          createdAt: now,
          updatedAt: now,
        }).run();
      }

      // Invalidate cache
      invalidatePublisherCache(publisherId);

      return reply.status(201).send({ data: { id: configId }, message: 'Config created' });
    } catch (err) {
      console.error('Error creating config:', err);
      return reply.status(500).send({ error: 'Failed to create config' });
    }
  });

  // Update config
  fastify.put('/:configId', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string };
    Body: Partial<CreateConfigBody>;
  }>, reply: FastifyReply) => {
    const { publisherId, configId } = request.params;
    const body = request.body;

    try {
      // Check if config exists
      const existing = await db
        .select()
        .from(wrapperConfigs)
        .where(
          and(
            eq(wrapperConfigs.id, configId),
            eq(wrapperConfigs.publisherId, publisherId)
          )
        )
        .get();

      if (!existing) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      // If setting as default, unset others
      if (body.isDefault) {
        await db
          .update(wrapperConfigs)
          .set({ isDefault: false })
          .where(
            and(
              eq(wrapperConfigs.publisherId, publisherId),
              eq(wrapperConfigs.isDefault, true)
            )
          )
          .run();
      }

      // Update config
      const updates: any = {
        updatedAt: new Date().toISOString(),
      };

      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.status !== undefined) updates.status = body.status;
      if (body.isDefault !== undefined) updates.isDefault = body.isDefault;
      if (body.websiteId !== undefined) updates.websiteId = body.websiteId; // NEW: Website support
      if (body.blockWrapper !== undefined) updates.blockWrapper = body.blockWrapper; // NEW: Blocking support
      if (body.bidderTimeout !== undefined) updates.bidderTimeout = body.bidderTimeout;
      if (body.priceGranularity !== undefined) updates.priceGranularity = body.priceGranularity;
      if (body.customPriceBucket !== undefined) updates.customPriceBucket = JSON.stringify(body.customPriceBucket);
      if (body.enableSendAllBids !== undefined) updates.enableSendAllBids = body.enableSendAllBids;
      if (body.bidderSequence !== undefined) updates.bidderSequence = body.bidderSequence;
      if (body.userSync !== undefined) updates.userSync = JSON.stringify(body.userSync);
      if (body.targetingControls !== undefined) updates.targetingControls = JSON.stringify(body.targetingControls);
      if (body.currencyConfig !== undefined) updates.currencyConfig = JSON.stringify(body.currencyConfig);
      if (body.consentManagement !== undefined) updates.consentManagement = JSON.stringify(body.consentManagement);
      if (body.floorsConfig !== undefined) updates.floorsConfig = JSON.stringify(body.floorsConfig);
      if (body.userIdModules !== undefined) updates.userIdModules = JSON.stringify(body.userIdModules);
      if (body.videoConfig !== undefined) updates.videoConfig = JSON.stringify(body.videoConfig);
      if (body.s2sConfig !== undefined) updates.s2sConfig = JSON.stringify(body.s2sConfig);
      if (body.debugMode !== undefined) updates.debugMode = body.debugMode;
      if (body.customConfig !== undefined) updates.customConfig = JSON.stringify(body.customConfig);
      if (body.bidders !== undefined) updates.bidders = JSON.stringify(body.bidders);
      if (body.adUnits !== undefined) updates.adUnits = JSON.stringify(body.adUnits);

      await db
        .update(wrapperConfigs)
        .set(updates)
        .where(eq(wrapperConfigs.id, configId))
        .run();

      // Update targeting rules if provided
      if (body.targetingRules) {
        // Delete existing rules
        await db
          .delete(configTargetingRules)
          .where(eq(configTargetingRules.configId, configId))
          .run();

        // Create new rule
        const ruleId = uuidv4();
        await db.insert(configTargetingRules).values({
          id: ruleId,
          configId,
          publisherId,
          conditions: JSON.stringify(body.targetingRules.conditions),
          matchType: body.targetingRules.matchType,
          priority: body.targetingRules.priority || 0,
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).run();
      }

      // Invalidate cache
      invalidatePublisherCache(publisherId);

      return reply.send({ message: 'Config updated' });
    } catch (err) {
      console.error('Error updating config:', err);
      return reply.status(500).send({ error: 'Failed to update config' });
    }
  });

  // Delete config
  fastify.delete('/:configId', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string };
  }>, reply: FastifyReply) => {
    const { publisherId, configId } = request.params;

    try {
      const result = await db
        .delete(wrapperConfigs)
        .where(
          and(
            eq(wrapperConfigs.id, configId),
            eq(wrapperConfigs.publisherId, publisherId)
          )
        )
        .run();

      if (result.changes === 0) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      // Rules will be deleted by CASCADE

      // Invalidate cache
      invalidatePublisherCache(publisherId);

      return reply.send({ message: 'Config deleted' });
    } catch (err) {
      console.error('Error deleting config:', err);
      return reply.status(500).send({ error: 'Failed to delete config' });
    }
  });

  // Duplicate config
  fastify.post('/:configId/duplicate', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string };
    Body: { name: string };
  }>, reply: FastifyReply) => {
    const { publisherId, configId } = request.params;
    const { name } = request.body;

    try {
      const original = await db
        .select()
        .from(wrapperConfigs)
        .where(
          and(
            eq(wrapperConfigs.id, configId),
            eq(wrapperConfigs.publisherId, publisherId)
          )
        )
        .get();

      if (!original) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      // Get original rules
      const originalRules = await db
        .select()
        .from(configTargetingRules)
        .where(eq(configTargetingRules.configId, configId))
        .all();

      // Create duplicate
      const newConfigId = uuidv4();
      const now = new Date().toISOString();

      await db.insert(wrapperConfigs).values({
        ...original,
        id: newConfigId,
        name: name || `${original.name} (Copy)`,
        status: 'draft', // Always start as draft
        isDefault: false, // Never default
        impressionsServed: 0,
        lastServedAt: null,
        createdAt: now,
        updatedAt: now,
      }).run();

      // Duplicate rules
      for (const rule of originalRules) {
        const newRuleId = uuidv4();
        await db.insert(configTargetingRules).values({
          ...rule,
          id: newRuleId,
          configId: newConfigId,
          createdAt: now,
          updatedAt: now,
        }).run();
      }

      return reply.status(201).send({ data: { id: newConfigId }, message: 'Config duplicated' });
    } catch (err) {
      console.error('Error duplicating config:', err);
      return reply.status(500).send({ error: 'Failed to duplicate config' });
    }
  });

  // Test match
  fastify.post('/:configId/test-match', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string };
    Body: {
      geo?: string;
      device?: 'mobile' | 'tablet' | 'desktop';
      browser?: string;
      os?: string;
    };
  }>, reply: FastifyReply) => {
    const { publisherId, configId } = request.params;
    const attributes: RequestAttributes = {
      geo: request.body.geo || null,
      device: request.body.device || 'desktop',
      browser: request.body.browser || null,
      os: request.body.os || null,
    };

    try {
      const rules = await db
        .select()
        .from(configTargetingRules)
        .where(
          and(
            eq(configTargetingRules.configId, configId),
            eq(configTargetingRules.publisherId, publisherId)
          )
        )
        .all();

      if (rules.length === 0) {
        return reply.send({
          data: {
            matches: false,
            message: 'No targeting rules configured',
          },
        });
      }

      // Test each rule
      const ruleResults = rules.map(rule => {
        const conditions = JSON.parse(rule.conditions);
        const result = testMatch(conditions, rule.matchType, attributes);

        return {
          ruleId: rule.id,
          priority: rule.priority,
          matchType: rule.matchType,
          ...result,
        };
      });

      // Check if any rule matches
      const anyMatch = ruleResults.some(r => r.matches);

      return reply.send({
        data: {
          matches: anyMatch,
          rules: ruleResults,
          attributes,
        },
      });
    } catch (err) {
      console.error('Error testing match:', err);
      return reply.status(500).send({ error: 'Failed to test match' });
    }
  });

  // Activate config
  fastify.post('/:configId/activate', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string };
  }>, reply: FastifyReply) => {
    const { publisherId, configId } = request.params;

    try {
      const result = await db
        .update(wrapperConfigs)
        .set({ status: 'active', updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(wrapperConfigs.id, configId),
            eq(wrapperConfigs.publisherId, publisherId)
          )
        )
        .run();

      if (result.changes === 0) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      // Invalidate cache
      invalidatePublisherCache(publisherId);

      return reply.send({ message: 'Config activated' });
    } catch (err) {
      console.error('Error activating config:', err);
      return reply.status(500).send({ error: 'Failed to activate config' });
    }
  });

  // Pause config
  fastify.post('/:configId/pause', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string };
  }>, reply: FastifyReply) => {
    const { publisherId, configId } = request.params;

    try {
      const result = await db
        .update(wrapperConfigs)
        .set({ status: 'paused', updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(wrapperConfigs.id, configId),
            eq(wrapperConfigs.publisherId, publisherId)
          )
        )
        .run();

      if (result.changes === 0) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      // Invalidate cache
      invalidatePublisherCache(publisherId);

      return reply.send({ message: 'Config paused' });
    } catch (err) {
      console.error('Error pausing config:', err);
      return reply.status(500).send({ error: 'Failed to pause config' });
    }
  });

  // Get analytics for config
  fastify.get('/:configId/analytics', async (request: FastifyRequest<{
    Params: { publisherId: string; configId: string };
    Querystring: { days?: string };
  }>, reply: FastifyReply) => {
    const { publisherId, configId } = request.params;
    const days = parseInt(request.query.days || '7');

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

      // Get serve logs for the period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const logs = await db
        .select()
        .from(configServeLog)
        .where(
          and(
            eq(configServeLog.configId, configId),
            eq(configServeLog.publisherId, publisherId)
          )
        )
        .all();

      // Aggregate by day, geo, device
      const byDay: Record<string, number> = {};
      const byGeo: Record<string, number> = {};
      const byDevice: Record<string, number> = {};

      for (const log of logs) {
        const date = log.timestamp.split('T')[0];
        byDay[date] = (byDay[date] || 0) + 1;

        if (log.geo) {
          byGeo[log.geo] = (byGeo[log.geo] || 0) + 1;
        }

        if (log.device) {
          byDevice[log.device] = (byDevice[log.device] || 0) + 1;
        }
      }

      return reply.send({
        data: {
          config,
          totalServed: config.impressionsServed,
          lastServedAt: config.lastServedAt,
          byDay,
          byGeo,
          byDevice,
        },
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      return reply.status(500).send({ error: 'Failed to fetch analytics' });
    }
  });
}
