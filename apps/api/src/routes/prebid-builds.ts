import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import {
  prebidBuilds,
  publisherModules,
  publisherAnalytics,
} from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface TriggerBuildBody {
  force?: boolean;
}

/**
 * Prebid.js Build System Routes
 * Handles custom Prebid.js bundle generation
 */
export default async function prebidBuildsRoutes(fastify: FastifyInstance) {

  // Trigger new build
  fastify.post('/publishers/:publisherId/builds', async (request, reply) => {
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

      // Create component hash for cache invalidation
      const componentsList = [
        ...modules.map((m) => m.moduleCode),
        ...analytics.map((a) => a.analyticsCode),
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
          biddersIncluded: JSON.stringify([]), // Would populate from bidders table
          modulesIncluded: JSON.stringify(modules.map((m) => m.moduleCode)),
          analyticsIncluded: JSON.stringify(analytics.map((a) => a.analyticsCode)),
          createdAt: now,
          isActive: 0,
        })
        .run();

      // In a real implementation, this would trigger an async build process
      // For now, we'll simulate it by immediately marking as success
      setTimeout(() => {
        const buildStartTime = Date.now();

        // Simulate build process
        const mockCdnUrl = `https://cdn.example.com/builds/${publisherId}/prebid-${version}.js`;
        const mockFileSize = 120000 + Math.floor(Math.random() * 50000); // 120-170KB

        db.update(prebidBuilds)
          .set({
            buildStatus: 'success',
            cdnUrl: mockCdnUrl,
            fileSize: mockFileSize,
            buildDurationMs: Date.now() - buildStartTime,
            completedAt: new Date().toISOString(),
          })
          .where(eq(prebidBuilds.id, buildId))
          .run();
      }, 100); // Simulate async build

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
  fastify.get('/publishers/:publisherId/builds/:buildId', async (request, reply) => {
    const { publisherId, buildId } = request.params as {
      publisherId: string;
      buildId: string;
    };

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
          biddersIncluded: build.biddersIncluded ? JSON.parse(build.biddersIncluded) : [],
          modulesIncluded: build.modulesIncluded ? JSON.parse(build.modulesIncluded) : [],
          analyticsIncluded: build.analyticsIncluded ? JSON.parse(build.analyticsIncluded) : [],
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
  fastify.get('/publishers/:publisherId/builds', async (request, reply) => {
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
  fastify.get('/publishers/:publisherId/builds/current', async (request, reply) => {
    const { publisherId } = request.params as { publisherId: string };

    try {
      const activeBuild = db
        .select()
        .from(prebidBuilds)
        .where(
          and(
            eq(prebidBuilds.publisherId, publisherId),
            eq(prebidBuilds.isActive, 1)
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
  fastify.post('/publishers/:publisherId/builds/:buildId/activate', async (request, reply) => {
    const { publisherId, buildId } = request.params as {
      publisherId: string;
      buildId: string;
    };

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
        .set({ isActive: 0 })
        .where(eq(prebidBuilds.publisherId, publisherId))
        .run();

      // Activate this build
      db.update(prebidBuilds)
        .set({
          isActive: 1,
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
}
