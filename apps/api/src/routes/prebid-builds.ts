import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import {
  prebidBuilds,
  publisherModules,
  publisherAnalytics,
  publisherRemovedBidders,
} from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { buildPrebidJs, getBuildFile } from '../services/prebid-build-service.js';
import { requireAdmin } from '../middleware/auth';
import { validateUUID } from '../utils/validation';
import { safeJsonParse, safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

interface TriggerBuildBody {
  force?: boolean;
}

/**
 * Prebid.js Build System Routes
 * Handles custom Prebid.js bundle generation
 */
export default async function prebidBuildsRoutes(fastify: FastifyInstance) {

  // Trigger new build
  fastify.post('/publishers/:publisherId/builds', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { force = false } = request.body as TriggerBuildBody;

    try {
      const now = new Date().toISOString();

      // Get enabled components
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

      const removedBidders = db
        .select()
        .from(publisherRemovedBidders)
        .where(eq(publisherRemovedBidders.publisherId, publisherId))
        .all();

      // Create component hash for cache invalidation
      const componentsList = [
        ...modules.map((m) => m.moduleCode),
        ...analytics.map((a) => a.analyticsCode),
        ...removedBidders.map((b) => `!${b.bidderCode}`), // Include removed bidders in hash
      ].sort();

      const componentsHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(componentsList))
        .digest('hex')
        .substring(0, 16);

      // Check if we already have a build with this hash
      if (!force) {
        const existingBuild = db
          .select()
          .from(prebidBuilds)
          .where(
            and(
              eq(prebidBuilds.publisherId, publisherId),
              eq(prebidBuilds.componentsHash, componentsHash),
              eq(prebidBuilds.buildStatus, 'success')
            )
          )
          .get();

        if (existingBuild) {
          return reply.send({
            data: {
              buildId: existingBuild.id,
              status: 'success',
              message: 'Using existing build with same components',
              cdnUrl: existingBuild.cdnUrl,
            },
          });
        }
      }

      // Create new build record
      const buildId = uuidv4();
      const version = `1.0.${Date.now()}`;

      db.insert(prebidBuilds)
        .values({
          id: buildId,
          publisherId,
          version,
          buildStatus: 'pending',
          componentsHash,
          biddersIncluded: JSON.stringify(removedBidders.map((b) => `!${b.bidderCode}`)),
          modulesIncluded: JSON.stringify(modules.map((m) => m.moduleCode)),
          analyticsIncluded: JSON.stringify(analytics.map((a) => a.analyticsCode)),
          createdAt: now,
          isActive: false,
        })
        .run();

      // Trigger async build process in the background
      const buildStartTime = Date.now();

      // Start the real build asynchronously (don't await here)
      buildPrebidJs({
        publisherId,
        buildId,
        onProgress: (progress, message) => {
          fastify.log.info(`Build ${buildId}: ${progress}% - ${message}`);
        },
      }).then((result) => {
        const buildDurationMs = Date.now() - buildStartTime;

        if (result.success) {
          db.update(prebidBuilds)
            .set({
              buildStatus: 'success',
              cdnUrl: result.cdnUrl,
              fileSize: result.fileSize,
              buildDurationMs,
              completedAt: new Date().toISOString(),
            })
            .where(eq(prebidBuilds.id, buildId))
            .run();

          fastify.log.info(`Build ${buildId} completed successfully in ${buildDurationMs}ms`);
        } else {
          db.update(prebidBuilds)
            .set({
              buildStatus: 'failed',
              errorMessage: result.errorMessage,
              buildDurationMs,
              completedAt: new Date().toISOString(),
            })
            .where(eq(prebidBuilds.id, buildId))
            .run();

          fastify.log.error(`Build ${buildId} failed: ${result.errorMessage}`);
        }
      }).catch((err) => {
        db.update(prebidBuilds)
          .set({
            buildStatus: 'failed',
            errorMessage: err.message,
            buildDurationMs: Date.now() - buildStartTime,
            completedAt: new Date().toISOString(),
          })
          .where(eq(prebidBuilds.id, buildId))
          .run();

        fastify.log.error(`Build ${buildId} error:`, err);
      });

      return reply.code(201).send({
        data: {
          buildId,
          status: 'pending',
          estimatedTime: 30, // seconds
        },
        message: 'Build initiated successfully',
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to trigger build',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Get build status
  fastify.get('/publishers/:publisherId/builds/:buildId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, buildId } = request.params as {
      publisherId: string;
      buildId: string;
    };

    // Validate UUID parameter
    try {
      validateUUID(buildId, 'Build ID');
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }

    try {
      const build = db
        .select()
        .from(prebidBuilds)
        .where(
          and(
            eq(prebidBuilds.id, buildId),
            eq(prebidBuilds.publisherId, publisherId)
          )
        )
        .get();

      if (!build) {
        return reply.code(404).send({ error: 'Build not found' });
      }

      return reply.send({
        data: {
          id: build.id,
          version: build.version,
          status: build.buildStatus,
          cdnUrl: build.cdnUrl,
          fileSize: build.fileSize,
          componentsHash: build.componentsHash,
          biddersIncluded: safeJsonParseArray(build.biddersIncluded, []),
          modulesIncluded: safeJsonParseArray(build.modulesIncluded, []),
          analyticsIncluded: safeJsonParseArray(build.analyticsIncluded, []),
          buildDurationMs: build.buildDurationMs,
          errorMessage: build.errorMessage,
          isActive: Boolean(build.isActive),
          createdAt: build.createdAt,
          completedAt: build.completedAt,
          activatedAt: build.activatedAt,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to fetch build status',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // List builds
  fastify.get('/publishers/:publisherId/builds', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };
    const { limit = 20, status } = request.query as { limit?: number; status?: string };

    try {
      let query = db
        .select()
        .from(prebidBuilds)
        .where(eq(prebidBuilds.publisherId, publisherId));

      if (status) {
        query = query.where(
          and(
            eq(prebidBuilds.publisherId, publisherId),
            eq(prebidBuilds.buildStatus, status as any)
          )
        );
      }

      const builds = query
        .orderBy(desc(prebidBuilds.createdAt))
        .limit(Number(limit))
        .all();

      const transformedBuilds = builds.map((build) => ({
        id: build.id,
        version: build.version,
        status: build.buildStatus,
        cdnUrl: build.cdnUrl,
        fileSize: build.fileSize,
        isActive: Boolean(build.isActive),
        createdAt: build.createdAt,
        completedAt: build.completedAt,
      }));

      return reply.send({
        data: transformedBuilds,
        total: builds.length,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to fetch builds',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Get current active build
  fastify.get('/publishers/:publisherId/builds/current', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    try {
      const activeBuild = db
        .select()
        .from(prebidBuilds)
        .where(
          and(
            eq(prebidBuilds.publisherId, publisherId),
            eq(prebidBuilds.isActive, true)
          )
        )
        .get();

      if (!activeBuild) {
        return reply.code(404).send({ error: 'No active build found' });
      }

      return reply.send({
        data: {
          id: activeBuild.id,
          version: activeBuild.version,
          cdnUrl: activeBuild.cdnUrl,
          fileSize: activeBuild.fileSize,
          activatedAt: activeBuild.activatedAt,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to fetch current build',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Set active build (activate/rollback)
  fastify.post('/publishers/:publisherId/builds/:buildId/activate', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, buildId } = request.params as {
      publisherId: string;
      buildId: string;
    };

    // Validate UUID parameter
    try {
      validateUUID(buildId, 'Build ID');
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }

    try {
      // Verify build exists and belongs to publisher
      const build = db
        .select()
        .from(prebidBuilds)
        .where(
          and(
            eq(prebidBuilds.id, buildId),
            eq(prebidBuilds.publisherId, publisherId)
          )
        )
        .get();

      if (!build) {
        return reply.code(404).send({ error: 'Build not found' });
      }

      if (build.buildStatus !== 'success') {
        return reply.code(400).send({
          error: 'Cannot activate a build that is not successful',
        });
      }

      const now = new Date().toISOString();

      // Deactivate all other builds
      db.update(prebidBuilds)
        .set({ isActive: false })
        .where(eq(prebidBuilds.publisherId, publisherId))
        .run();

      // Activate this build
      db.update(prebidBuilds)
        .set({
          isActive: true,
          activatedAt: now,
        })
        .where(eq(prebidBuilds.id, buildId))
        .run();

      return reply.send({
        data: { success: true, buildId, activatedAt: now },
        message: 'Build activated successfully',
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to activate build',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Serve build files
  // This endpoint serves build files and should remain public (no auth)
  fastify.get('/builds/:filename', {
    config: {
      rateLimit: {
        max: 100, // 100 requests per minute for public build downloads
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const { filename } = request.params as { filename: string };

    try {
      // Security: Use basename to prevent path traversal and validate format
      const safeFilename = filename.split('/').pop() || '';

      // Validate filename format: must end with .js and match expected pattern
      if (!safeFilename.endsWith('.js') || !/^prebid-[a-f0-9-]+-\d+\.js$/.test(safeFilename)) {
        return reply.code(400).send({ error: 'Invalid filename' });
      }

      const fileContent = await getBuildFile(safeFilename);

      return reply
        .type('application/javascript')
        .header('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
        .send(fileContent);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(404).send({ error: 'Build file not found' });
    }
  });
}
