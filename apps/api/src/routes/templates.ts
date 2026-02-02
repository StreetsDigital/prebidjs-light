import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import {
  configurationTemplates,
  publisherModules,
  publisherAnalytics,
  publishers
} from '../db/schema.js';
import { eq, and, or, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '../middleware/auth';
import { safeJsonParse, safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

interface CreateTemplateBody {
  name: string;
  description?: string;
  sourceWebsiteId?: string;
  isPublic: boolean;
}

interface ApplyTemplateBody {
  templateId: string;
  targetSites: string[] | 'all';
  mergeStrategy: 'replace' | 'append';
}

interface TemplateConfig {
  bidders?: any[];
  modules?: Array<{
    code: string;
    name: string;
    category?: string;
    params?: any;
  }>;
  analytics?: Array<{
    code: string;
    name: string;
    params?: any;
  }>;
}

/**
 * Configuration Templates Routes
 * Handles preset and custom configuration templates
 */
export default async function templatesRoutes(fastify: FastifyInstance) {

  // List all templates (preset + custom)
  fastify.get('/templates', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { type, isPublic } = request.query as { type?: string; isPublic?: string };

    try {
      let query = db.select().from(configurationTemplates);

      const conditions = [];

      if (type) {
        conditions.push(eq(configurationTemplates.templateType, type as any));
      }

      if (isPublic !== undefined) {
        conditions.push(eq(configurationTemplates.isPublic, isPublic === '1' || isPublic === 'true'));
      }

      const templates = conditions.length > 0
        ? query.where(and(...conditions)).all()
        : query.all();

      // Transform for response
      const templatesWithPreview = templates.map((template) => {
        const config = safeJsonParseObject<TemplateConfig>(template.configJson, {});
        return {
          id: template.id,
          name: template.name,
          description: template.description,
          templateType: template.templateType,
          isPublic: Boolean(template.isPublic),
          useCount: template.useCount,
          createdAt: template.createdAt,
          previewConfig: {
            bidders: config.bidders || [],
            modules: config.modules || [],
            analytics: config.analytics || [],
          },
        };
      });

      return reply.send({ data: templatesWithPreview });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to fetch templates',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Get template details
  fastify.get('/templates/:templateId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { templateId } = request.params as { templateId: string };

    try {
      const template = db
        .select()
        .from(configurationTemplates)
        .where(eq(configurationTemplates.id, templateId))
        .get();

      if (!template) {
        return reply.code(404).send({ error: 'Template not found' });
      }

      return reply.send({
        data: {
          id: template.id,
          name: template.name,
          description: template.description,
          templateType: template.templateType,
          isPublic: Boolean(template.isPublic),
          configJson: safeJsonParseObject(template.configJson, {}),
          useCount: template.useCount,
          createdAt: template.createdAt,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to fetch template',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Create custom template from existing configuration
  fastify.post('/publishers/:publisherId/templates', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { name, description, sourceWebsiteId, isPublic } = request.body as CreateTemplateBody;

    if (!name) {
      return reply.code(400).send({ error: 'Template name is required' });
    }

    try {
      const now = new Date().toISOString();

      // Get current configuration to save as template
      // For now, we'll get all enabled modules and analytics for the publisher
      const modules = db
        .select()
        .from(publisherModules)
        .where(
          and(
            eq(publisherModules.publisherId, publisherId),
            eq(publisherModules.enabled, true)
          )
        )
        .all();

      const analytics = db
        .select()
        .from(publisherAnalytics)
        .where(
          and(
            eq(publisherAnalytics.publisherId, publisherId),
            eq(publisherAnalytics.enabled, true)
          )
        )
        .all();

      // Build configuration JSON
      const configJson = {
        bidders: [], // Would need to query publisher_bidders
        modules: modules.map((m) => ({
          code: m.moduleCode,
          name: m.moduleName,
          category: m.category,
          params: m.params ? safeJsonParseObject(m.params, {}) : undefined,
        })),
        analytics: analytics.map((a) => ({
          code: a.analyticsCode,
          name: a.analyticsName,
          params: a.params ? safeJsonParseObject(a.params, {}) : undefined,
        })),
      };

      // Insert template
      const templateId = uuidv4();
      db.insert(configurationTemplates)
        .values({
          id: templateId,
          name,
          description: description || null,
          templateType: 'custom',
          creatorPublisherId: publisherId,
          isPublic: Boolean(isPublic),
          configJson: JSON.stringify(configJson),
          useCount: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      return reply.code(201).send({
        data: { id: templateId, name },
        message: 'Template created successfully',
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to create template',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Apply template to sites
  fastify.post('/publishers/:publisherId/apply-template', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { templateId, targetSites, mergeStrategy } = request.body as ApplyTemplateBody;

    if (!templateId) {
      return reply.code(400).send({ error: 'Template ID is required' });
    }

    try {
      // Get template
      const template = db
        .select()
        .from(configurationTemplates)
        .where(eq(configurationTemplates.id, templateId))
        .get();

      if (!template) {
        return reply.code(404).send({ error: 'Template not found' });
      }

      const config = safeJsonParseObject<TemplateConfig>(template.configJson, {});
      const now = new Date().toISOString();

      // Increment use count
      db.update(configurationTemplates)
        .set({ useCount: template.useCount + 1 })
        .where(eq(configurationTemplates.id, templateId))
        .run();

      // If mergeStrategy is 'replace', delete existing components first
      if (mergeStrategy === 'replace') {
        // Delete existing modules
        db.delete(publisherModules)
          .where(eq(publisherModules.publisherId, publisherId))
          .run();

        // Delete existing analytics
        db.delete(publisherAnalytics)
          .where(eq(publisherAnalytics.publisherId, publisherId))
          .run();
      }

      // Apply modules from template
      if (config.modules && config.modules.length > 0) {
        for (const module of config.modules) {
          // Check if already exists
          const existing = db
            .select()
            .from(publisherModules)
            .where(
              and(
                eq(publisherModules.publisherId, publisherId),
                eq(publisherModules.moduleCode, module.code)
              )
            )
            .get();

          if (!existing) {
            db.insert(publisherModules)
              .values({
                id: uuidv4(),
                publisherId,
                moduleCode: module.code,
                moduleName: module.name,
                category: (module.category || 'general') as 'general' | 'userId' | 'rtd' | 'vendor' | 'recommended',
                params: module.params ? JSON.stringify(module.params) : null,
                enabled: true,
                createdAt: now,
                updatedAt: now,
              })
              .run();
          }
        }
      }

      // Apply analytics from template
      if (config.analytics && config.analytics.length > 0) {
        for (const analytics of config.analytics) {
          const existing = db
            .select()
            .from(publisherAnalytics)
            .where(
              and(
                eq(publisherAnalytics.publisherId, publisherId),
                eq(publisherAnalytics.analyticsCode, analytics.code)
              )
            )
            .get();

          if (!existing) {
            db.insert(publisherAnalytics)
              .values({
                id: uuidv4(),
                publisherId,
                analyticsCode: analytics.code,
                analyticsName: analytics.name,
                params: analytics.params ? JSON.stringify(analytics.params) : null,
                enabled: true,
                createdAt: now,
                updatedAt: now,
              })
              .run();
          }
        }
      }

      return reply.send({
        data: { success: true },
        message: 'Template applied successfully',
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to apply template',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Delete custom template
  fastify.delete('/publishers/:publisherId/templates/:templateId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, templateId } = request.params as {
      publisherId: string;
      templateId: string;
    };

    try {
      // Verify template belongs to publisher
      const template = db
        .select()
        .from(configurationTemplates)
        .where(
          and(
            eq(configurationTemplates.id, templateId),
            eq(configurationTemplates.creatorPublisherId, publisherId)
          )
        )
        .get();

      if (!template) {
        return reply.code(404).send({
          error: 'Template not found or you do not have permission to delete it'
        });
      }

      // Delete template
      db.delete(configurationTemplates)
        .where(eq(configurationTemplates.id, templateId))
        .run();

      return reply.send({
        data: { success: true },
        message: 'Template deleted successfully',
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to delete template',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
