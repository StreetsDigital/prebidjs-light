import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import {
  bulkOperations,
  publisherModules,
  publisherAnalytics,
  websites,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface BulkAddBody {
  componentType: 'bidder' | 'module' | 'analytics';
  componentCodes: string[];
  targetSites: string[] | 'all';
  parameters?: Record<string, any>;
}

interface BulkRemoveBody {
  componentType: 'bidder' | 'module' | 'analytics';
  componentCodes: string[];
  targetSites: string[] | 'all';
}

interface BulkUpdateBody {
  componentType: 'bidder' | 'module' | 'analytics';
  componentCodes: string[];
  targetSites: string[] | 'all';
  parameters: Record<string, any>;
}

interface ExportQuery {
  websiteId?: string;
  format?: string;
  scope?: string;
}

interface ImportBody {
  config: any;
  mergeStrategy: 'replace' | 'append';
}

/**
 * Bulk Operations Routes
 * Handles bulk component operations and import/export
 */
export default async function bulkOperationsRoutes(fastify: FastifyInstance) {

  // Bulk add components
  fastify.post('/publishers/:publisherId/bulk/add', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { componentType, componentCodes, targetSites, parameters } = request.body as BulkAddBody;

    if (!componentType || !componentCodes || componentCodes.length === 0) {
      return reply.code(400).send({ error: 'Component type and codes are required' });
    }

    try {
      const now = new Date().toISOString();
      const operationId = uuidv4();

      // Create bulk operation record
      db.insert(bulkOperations)
        .values({
          id: operationId,
          publisherId,
          operationType: 'add',
          componentType,
          componentCodes: JSON.stringify(componentCodes),
          targetSites: typeof targetSites === 'string' ? targetSites : JSON.stringify(targetSites),
          parameters: parameters ? JSON.stringify(parameters) : null,
          status: 'processing',
          totalCount: componentCodes.length,
          completedCount: 0,
          createdAt: now,
        })
        .run();

      // Process bulk add
      let completedCount = 0;
      let errorMessage = null;

      try {
        for (const code of componentCodes) {
          if (componentType === 'module') {
            // Check if already exists
            const existing = db
              .select()
              .from(publisherModules)
              .where(
                and(
                  eq(publisherModules.publisherId, publisherId),
                  eq(publisherModules.moduleCode, code)
                )
              )
              .get();

            if (!existing) {
              db.insert(publisherModules)
                .values({
                  id: uuidv4(),
                  publisherId,
                  moduleCode: code,
                  moduleName: code, // Would need to look up from prebid data
                  category: 'general',
                  params: parameters ? JSON.stringify(parameters) : null,
                  enabled: true,
                  createdAt: now,
                  updatedAt: now,
                })
                .run();
            }
          } else if (componentType === 'analytics') {
            const existing = db
              .select()
              .from(publisherAnalytics)
              .where(
                and(
                  eq(publisherAnalytics.publisherId, publisherId),
                  eq(publisherAnalytics.analyticsCode, code)
                )
              )
              .get();

            if (!existing) {
              db.insert(publisherAnalytics)
                .values({
                  id: uuidv4(),
                  publisherId,
                  analyticsCode: code,
                  analyticsName: code,
                  params: parameters ? JSON.stringify(parameters) : null,
                  enabled: true,
                  createdAt: now,
                  updatedAt: now,
                })
                .run();
            }
          }

          completedCount++;
        }

        // Update operation status
        db.update(bulkOperations)
          .set({
            status: 'completed',
            completedCount,
            completedAt: now,
          })
          .where(eq(bulkOperations.id, operationId))
          .run();

        return reply.send({
          data: {
            operationId,
            status: 'completed',
            completedCount,
            totalCount: componentCodes.length,
          },
          message: `Successfully added ${completedCount} components`,
        });
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);

        // Update operation status to failed
        db.update(bulkOperations)
          .set({
            status: 'failed',
            completedCount,
            errorMessage,
            completedAt: now,
          })
          .where(eq(bulkOperations.id, operationId))
          .run();

        throw err;
      }
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Bulk add operation failed',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Bulk remove components
  fastify.post('/publishers/:publisherId/bulk/remove', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { componentType, componentCodes, targetSites } = request.body as BulkRemoveBody;

    if (!componentType || !componentCodes || componentCodes.length === 0) {
      return reply.code(400).send({ error: 'Component type and codes are required' });
    }

    try {
      const now = new Date().toISOString();
      let deletedCount = 0;

      for (const code of componentCodes) {
        if (componentType === 'module') {
          const result = db
            .delete(publisherModules)
            .where(
              and(
                eq(publisherModules.publisherId, publisherId),
                eq(publisherModules.moduleCode, code)
              )
            )
            .run();
          deletedCount += result.changes || 0;
        } else if (componentType === 'analytics') {
          const result = db
            .delete(publisherAnalytics)
            .where(
              and(
                eq(publisherAnalytics.publisherId, publisherId),
                eq(publisherAnalytics.analyticsCode, code)
              )
            )
            .run();
          deletedCount += result.changes || 0;
        }
      }

      return reply.send({
        data: {
          status: 'completed',
          deletedCount,
          totalCount: componentCodes.length,
        },
        message: `Successfully removed ${deletedCount} components`,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Bulk remove operation failed',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Export configuration
  fastify.get('/publishers/:publisherId/export', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { websiteId, format = 'json', scope = 'full' } = request.query as ExportQuery;

    try {
      // Get modules
      const modules = db
        .select()
        .from(publisherModules)
        .where(eq(publisherModules.publisherId, publisherId))
        .all();

      // Get analytics
      const analytics = db
        .select()
        .from(publisherAnalytics)
        .where(eq(publisherAnalytics.publisherId, publisherId))
        .all();

      // Build export configuration
      const exportConfig = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        publisherId,
        websiteId: websiteId || null,
        scope,
        configuration: {
          modules: modules.map((m) => ({
            code: m.moduleCode,
            name: m.moduleName,
            category: m.category,
            params: m.params ? JSON.parse(m.params) : null,
            enabled: Boolean(m.enabled),
          })),
          analytics: analytics.map((a) => ({
            code: a.analyticsCode,
            name: a.analyticsName,
            params: a.params ? JSON.parse(a.params) : null,
            enabled: Boolean(a.enabled),
          })),
        },
      };

      // Set headers for download
      reply.header('Content-Type', 'application/json');
      reply.header(
        'Content-Disposition',
        `attachment; filename="prebid-config-${publisherId}-${Date.now()}.json"`
      );

      return exportConfig;
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Export failed',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Import configuration
  fastify.post('/publishers/:publisherId/import', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { config, mergeStrategy } = request.body as ImportBody;

    if (!config || !config.configuration) {
      return reply.code(400).send({ error: 'Invalid configuration file' });
    }

    try {
      const now = new Date().toISOString();

      // If replace strategy, delete existing
      if (mergeStrategy === 'replace') {
        db.delete(publisherModules)
          .where(eq(publisherModules.publisherId, publisherId))
          .run();

        db.delete(publisherAnalytics)
          .where(eq(publisherAnalytics.publisherId, publisherId))
          .run();
      }

      let importedCount = 0;

      // Import modules
      if (config.configuration.modules) {
        for (const module of config.configuration.modules) {
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
                category: module.category || 'general',
                params: module.params ? JSON.stringify(module.params) : null,
                enabled: module.enabled !== false,
                createdAt: now,
                updatedAt: now,
              })
              .run();
            importedCount++;
          }
        }
      }

      // Import analytics
      if (config.configuration.analytics) {
        for (const analytics of config.configuration.analytics) {
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
                enabled: analytics.enabled !== false,
                createdAt: now,
                updatedAt: now,
              })
              .run();
            importedCount++;
          }
        }
      }

      return reply.send({
        data: {
          success: true,
          importedCount,
          mergeStrategy,
        },
        message: `Successfully imported ${importedCount} components`,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Import failed',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Get bulk operation status
  fastify.get('/publishers/:publisherId/bulk/operations/:operationId', async (request, reply) => {
    const { publisherId, operationId } = request.params as {
      publisherId: string;
      operationId: string;
    };

    try {
      const operation = db
        .select()
        .from(bulkOperations)
        .where(
          and(
            eq(bulkOperations.id, operationId),
            eq(bulkOperations.publisherId, publisherId)
          )
        )
        .get();

      if (!operation) {
        return reply.code(404).send({ error: 'Operation not found' });
      }

      return reply.send({
        data: {
          id: operation.id,
          operationType: operation.operationType,
          componentType: operation.componentType,
          status: operation.status,
          totalCount: operation.totalCount,
          completedCount: operation.completedCount,
          errorMessage: operation.errorMessage,
          createdAt: operation.createdAt,
          completedAt: operation.completedAt,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to fetch operation status',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
