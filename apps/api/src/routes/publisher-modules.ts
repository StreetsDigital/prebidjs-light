import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, publisherModules } from '../db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getAllModules, getRecommendedModules, getComponentInfo } from '../utils/prebid-data-fetcher';
import { requireAdmin } from '../middleware/auth';
import { safeJsonParse, safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

interface AddModuleRequest {
  moduleCode: string;
  moduleName?: string;
  category?: 'recommended' | 'userId' | 'rtd' | 'general' | 'vendor';
  params?: Record<string, any>;
}

interface DeleteModuleParams {
  publisherId: string;
  moduleCode: string;
}

interface DeleteModuleRequest {
  Params: DeleteModuleParams;
}

export default async function publisherModulesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/publishers/:publisherId/modules
   * List all enabled modules for a publisher
   */
  fastify.get('/:publisherId/modules', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest<{ Params: { publisherId: string } }>, reply: FastifyReply) => {
    const { publisherId } = request.params;

    try {
      // Get enabled modules from database
      const enabledModules = db
        .select()
        .from(publisherModules)
        .where(
          and(
            eq(publisherModules.publisherId, publisherId),
            eq(publisherModules.enabled, true)
          )
        )
        .all();

      // Enrich with latest info from prebid data
      const enrichedModules = enabledModules.map(module => {
        const info = getComponentInfo(module.moduleCode, 'module');
        return {
          id: module.id,
          code: module.moduleCode,
          name: module.moduleName,
          category: module.category,
          params: safeJsonParseObject(module.params, null),
          enabled: module.enabled,
          documentationUrl: info?.documentationUrl || null,
          description: null,
          createdAt: module.createdAt,
          updatedAt: module.updatedAt,
        };
      });

      return reply.send({ data: enrichedModules });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch modules' });
    }
  });

  /**
   * POST /api/publishers/:publisherId/modules
   * Add a module to a publisher's account
   */
  fastify.post('/:publisherId/modules', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest<{ Params: { publisherId: string }; Body: AddModuleRequest }>, reply: FastifyReply) => {
    const { publisherId } = request.params;
    const { moduleCode, moduleName, category, params } = request.body;

    try {
      // Validate module code
      if (!moduleCode) {
        return reply.status(400).send({ error: 'Module code is required' });
      }

      const normalizedCode = moduleCode.toLowerCase().trim();

      // Check if module already exists for this publisher
      const existing = db
        .select()
        .from(publisherModules)
        .where(
          and(
            eq(publisherModules.publisherId, publisherId),
            eq(publisherModules.moduleCode, normalizedCode)
          )
        )
        .get();

      if (existing) {
        return reply.status(400).send({
          error: 'This module has already been added to your account.'
        });
      }

      // Look up module info from prebid data
      const moduleInfo = getComponentInfo(normalizedCode, 'module');

      // Determine category
      let finalCategory: 'recommended' | 'userId' | 'rtd' | 'general' | 'vendor' = category || 'general';
      if (!category && moduleInfo && moduleInfo.type === 'module') {
        finalCategory = moduleInfo.category || 'general';
      }

      // Create module entry
      const newModule = {
        id: uuidv4(),
        publisherId,
        moduleCode: normalizedCode,
        moduleName: moduleName || moduleInfo?.name || normalizedCode,
        category: finalCategory,
        params: params ? JSON.stringify(params) : null,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.insert(publisherModules).values(newModule).run();

      return reply.status(201).send({
        data: {
          id: newModule.id,
          code: newModule.moduleCode,
          name: newModule.moduleName,
          category: newModule.category,
          documentationUrl: moduleInfo?.documentationUrl || null,
          description: null,
        },
        message: `${newModule.moduleName} added successfully`
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to add module' });
    }
  });

  /**
   * DELETE /api/publishers/:publisherId/modules/:moduleCode
   * Remove a module from a publisher's account
   */
  fastify.delete('/:publisherId/modules/:moduleCode', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest<DeleteModuleRequest>, reply: FastifyReply) => {
    const { publisherId, moduleCode } = request.params;

    try {
      // Find and delete the module
      const module = db
        .select()
        .from(publisherModules)
        .where(
          and(
            eq(publisherModules.publisherId, publisherId),
            eq(publisherModules.moduleCode, moduleCode)
          )
        )
        .get();

      if (!module) {
        return reply.status(404).send({ error: 'Module not found' });
      }

      // Delete the module
      db.delete(publisherModules)
        .where(eq(publisherModules.id, module.id))
        .run();

      return reply.send({ message: 'Module removed successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove module' });
    }
  });
}
