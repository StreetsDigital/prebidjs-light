import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateUUID } from '../utils/validation';
import * as configService from '../services/wrapper-config-service';
import * as generationService from '../services/wrapper-generation-service';

interface CreateConfigBody {
  name: string;
  description?: string;
  status?: 'draft' | 'active' | 'paused' | 'archived';
  isDefault?: boolean;
  websiteId?: string;
  blockWrapper?: boolean;

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
      const configs = await configService.listConfigs(publisherId, status);
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

    // Validate UUID parameter
    try {
      validateUUID(configId, 'Config ID');
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }

    try {
      const config = await configService.getConfigById(publisherId, configId);

      if (!config) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      return reply.send({ data: config });
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
      const configId = await configService.createConfig(publisherId, body);
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

    // Validate UUID parameter
    try {
      validateUUID(configId, 'Config ID');
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }

    try {
      const updated = await configService.updateConfig(publisherId, configId, body);

      if (!updated) {
        return reply.status(404).send({ error: 'Config not found' });
      }

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

    // Validate UUID parameter
    try {
      validateUUID(configId, 'Config ID');
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }

    try {
      const deleted = await configService.deleteConfig(publisherId, configId);

      if (!deleted) {
        return reply.status(404).send({ error: 'Config not found' });
      }

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

    // Validate UUID parameter
    try {
      validateUUID(configId, 'Config ID');
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }

    try {
      const newConfigId = await configService.duplicateConfig(publisherId, configId, name);

      if (!newConfigId) {
        return reply.status(404).send({ error: 'Config not found' });
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

    try {
      const result = await generationService.testConfigMatch(
        publisherId,
        configId,
        request.body
      );

      return reply.send({ data: result });
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
      const updated = await configService.updateConfigStatus(
        publisherId,
        configId,
        'active'
      );

      if (!updated) {
        return reply.status(404).send({ error: 'Config not found' });
      }

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
      const updated = await configService.updateConfigStatus(
        publisherId,
        configId,
        'paused'
      );

      if (!updated) {
        return reply.status(404).send({ error: 'Config not found' });
      }

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
      const analytics = await configService.getConfigAnalytics(
        publisherId,
        configId,
        days
      );

      if (!analytics) {
        return reply.status(404).send({ error: 'Config not found' });
      }

      return reply.send({ data: analytics });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      return reply.status(500).send({ error: 'Failed to fetch analytics' });
    }
  });
}
