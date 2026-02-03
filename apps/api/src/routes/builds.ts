import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, publishers, auditLogs, publisherBuilds } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { BuildManagementService } from '../services/build-management-service';
import * as fs from 'fs';
import * as path from 'path';

// Use the same output directory as PrebidBuildService
const BUILDS_DIR = path.join(process.cwd(), 'prebid-builds', 'output');

// Auth middleware
async function verifyAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = await request.jwtVerify();
    (request as any).user = decoded;
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid token' });
  }
}

export default async function buildsRoutes(fastify: FastifyInstance) {
  // List builds for a publisher
  fastify.get<{
    Params: { publisherId: string };
  }>('/publishers/:publisherId/builds', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
    const { publisherId } = request.params;

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    return BuildManagementService.listBuilds(publisherId);
  });

  // Trigger a new build
  fastify.post<{
    Params: { publisherId: string };
  }>('/publishers/:publisherId/builds', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
    const { publisherId } = request.params;
    const user = (request as any).user;

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const result = BuildManagementService.createBuild(publisherId);

    // If not cached, start async build process
    if (!result.cached) {
      setTimeout(() => {
        BuildManagementService.processBuild(result.id, publisherId, result.version!);
      }, 2000); // Simulate 2 second build time
    }

    // Audit log
    const now = new Date().toISOString();
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user?.id || null,
      action: 'TRIGGER_BUILD',
      entityType: 'build',
      entityId: result.id,
      newValues: JSON.stringify({ publisherId, version: result.version, configHash: result.configHash }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    }).run();

    return reply.code(result.cached ? 200 : 201).send(result);
  });

  // Get build status
  fastify.get<{
    Params: { publisherId: string; buildId: string };
  }>('/publishers/:publisherId/builds/:buildId', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
    const { publisherId, buildId } = request.params;

    const build = BuildManagementService.getBuild(publisherId, buildId);

    if (!build) {
      return reply.code(404).send({ error: 'Build not found' });
    }

    return build;
  });

  // Delete a build
  fastify.delete<{
    Params: { publisherId: string; buildId: string };
  }>('/publishers/:publisherId/builds/:buildId', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
    const { publisherId, buildId } = request.params;
    const user = (request as any).user;

    // Get build for audit log before deletion
    const build = BuildManagementService.getBuildRecord(buildId);
    if (!build) {
      return reply.code(404).send({ error: 'Build not found' });
    }

    // Delete build
    try {
      const result = BuildManagementService.deleteBuild(publisherId, buildId);

      // Audit log
      const now = new Date().toISOString();
      db.insert(auditLogs).values({
        id: uuidv4(),
        userId: user?.id || null,
        action: 'DELETE_BUILD',
        entityType: 'build',
        entityId: buildId,
        oldValues: JSON.stringify({
          version: build.prebidVersion,
          configHash: build.configHash,
          buildPath: build.buildPath,
        }),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        createdAt: now,
      }).run();

      return { message: 'Build deleted successfully', fileDeleted: result.fileDeleted };
    } catch (err: any) {
      return reply.code(404).send({ error: err.message });
    }
  });

  // Download a build
  fastify.get<{
    Params: { publisherId: string; buildId: string };
  }>('/publishers/:publisherId/builds/:buildId/download', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
    const { publisherId, buildId } = request.params;

    const file = BuildManagementService.getBuildFile(publisherId, buildId);

    if (!file) {
      return reply.code(404).send({ error: 'Build not found or not ready' });
    }

    reply.header('Content-Type', 'application/javascript');
    reply.header('Content-Disposition', `attachment; filename="${file.filename}"`);

    return file.content;
  });

  // Build publisher wrapper
  fastify.post<{
    Params: { publisherId: string };
  }>('/publishers/:publisherId/builds/wrapper', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
    const { publisherId } = request.params;
    const user = (request as any).user;

    // Verify publisher exists
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    try {
      const result = await BuildManagementService.createWrapperBuild(publisherId);

      // Audit log
      const now = new Date().toISOString();
      db.insert(auditLogs).values({
        id: uuidv4(),
        userId: user?.id || null,
        action: 'BUILD_WRAPPER',
        entityType: 'build',
        entityId: result.id,
        newValues: JSON.stringify({ publisherId, type: 'wrapper' }),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        createdAt: now,
      }).run();

      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(500).send({ error: 'Build failed', message: err.message });
    }
  });

  // Serve publisher wrapper at /pb/{publisherId}.min.js
  fastify.get<{
    Params: { publisherId: string };
  }>('/pb/:publisherId.min.js', async (request, reply) => {
    const { publisherId } = request.params;

    const result = BuildManagementService.getWrapperFile(publisherId);

    if (!result.found) {
      return reply.code(404).send({
        error: 'Wrapper not found',
        message: `No wrapper built for publisher ID: ${publisherId}. Build one at POST /api/publishers/${publisherId}/builds/wrapper`
      });
    }

    reply.header('Content-Type', 'application/javascript');
    reply.header('Cache-Control', 'public, max-age=3600, s-maxage=86400'); // 1 hour client, 24 hour CDN
    reply.header('Access-Control-Allow-Origin', '*');

    return result.content;
  });

  // Serve build files statically
  fastify.get<{
    Params: { filename: string };
  }>('/builds/:filename', async (request, reply) => {
    const { filename } = request.params;

    const content = BuildManagementService.getStaticBuildFile(filename);

    if (!content) {
      return reply.code(404).send({ error: 'File not found' });
    }

    reply.header('Content-Type', 'application/javascript');
    reply.header('Cache-Control', 'public, max-age=86400'); // 24 hour cache

    return content;
  });

  // Serve publisher's Prebid.js bundle (PUBLIC - used by wrapper)
  // GET /builds/:publisherId/prebid.js
  fastify.get<{
    Params: { publisherId: string };
  }>('/:publisherId/prebid.js', async (request, reply) => {
    const { publisherId } = request.params;

    try {
      // Verify publisher exists
      const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
      if (!publisher) {
        return reply.code(404).send({ error: 'Publisher not found' });
      }

      // Get latest ready build
      const build = db.select()
        .from(publisherBuilds)
        .where(and(
          eq(publisherBuilds.publisherId, publisherId),
          eq(publisherBuilds.status, 'ready')
        ))
        .orderBy(desc(publisherBuilds.createdAt))
        .limit(1)
        .get();

      if (!build || !build.buildPath) {
        // No build available - return helpful error
        return reply.code(404).send({
          error: 'No Prebid.js build available',
          message: 'This publisher has no completed build. Create one first.',
          publisherId,
        });
      }

      // Read build file
      const fileName = path.basename(build.buildPath);
      const filePath = path.join(BUILDS_DIR, fileName);

      if (!fs.existsSync(filePath)) {
        fastify.log.error({ filePath, buildId: build.id }, 'Build file missing from disk');
        return reply.code(404).send({
          error: 'Build file not found',
          message: 'Build exists in database but file is missing'
        });
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      // Serve with aggressive caching
      reply
        .header('Content-Type', 'application/javascript; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600, immutable') // 1 hour, immutable
        .header('Access-Control-Allow-Origin', '*')
        .header('X-Build-ID', build.id)
        .header('X-Build-Version', build.prebidVersion || '1.0.0')
        .send(content);

    } catch (error: any) {
      fastify.log.error({ err: error, publisherId }, 'Failed to serve Prebid.js build');
      return reply.code(500).send({
        error: 'Failed to load Prebid.js',
        message: error.message
      });
    }
  });
}
