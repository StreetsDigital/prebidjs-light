import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, publishers, publisherBuilds, auditLogs, publisherBidders, adUnits } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Build files directory
const BUILDS_DIR = path.join(process.cwd(), 'data', 'builds');
const WRAPPER_DIR = path.join(process.cwd(), '..', 'wrapper');

// Ensure builds directory exists
if (!fs.existsSync(BUILDS_DIR)) {
  fs.mkdirSync(BUILDS_DIR, { recursive: true });
}

// Helper to generate config hash
function generateConfigHash(publisherId: string, bidders: any[], adUnitsData: any[]): string {
  const configData = JSON.stringify({
    publisherId,
    bidders: bidders.map(b => ({ code: b.bidderCode, enabled: b.enabled })),
    adUnits: adUnitsData.map(a => a.code),
  });
  return crypto.createHash('md5').update(configData).digest('hex').substring(0, 8);
}

// Helper to build wrapper for a publisher
async function buildPublisherWrapper(publisherId: string, publisherSlug: string): Promise<{ filePath: string; fileSize: number }> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execPromise = promisify(exec);

  try {
    // Build the wrapper with publisher ID injected
    const { stdout, stderr } = await execPromise(
      `PUBLISHER_ID=${publisherId} PUBLISHER_SLUG=${publisherSlug} npm run build`,
      { cwd: WRAPPER_DIR }
    );

    const wrapperFileName = `pb-${publisherSlug}.min.js`;
    const sourcePath = path.join(WRAPPER_DIR, 'dist', wrapperFileName);
    const destPath = path.join(BUILDS_DIR, wrapperFileName);

    // Copy to builds directory
    fs.copyFileSync(sourcePath, destPath);
    const stats = fs.statSync(destPath);

    return { filePath: `/builds/${wrapperFileName}`, fileSize: stats.size };
  } catch (err: any) {
    throw new Error(`Wrapper build failed: ${err.message}`);
  }
}

// Helper to generate mock Prebid bundle
function generatePrebidBundle(publisher: any, bidders: any[], adUnitsData: any[], version: string): string {
  return `/**
 * Prebid.js Bundle
 * Publisher: ${publisher.name} (${publisher.slug})
 * Version: ${version}
 * Generated: ${new Date().toISOString()}
 * Modules: ${bidders.filter(b => b.enabled).length + 5}
 * Bidders: ${bidders.filter(b => b.enabled).length}
 */
(function() {
  'use strict';

  var pbjs = pbjs || {};
  pbjs.que = pbjs.que || [];

  // Publisher Config
  pbjs.setConfig({
    priceGranularity: "medium",
    enableSendAllBids: true,
    bidderTimeout: 1500,
    publisherId: "${publisher.id}"
  });

  // Ad Units
  pbjs.addAdUnits(${JSON.stringify(adUnitsData.map(u => ({
    code: u.code,
    mediaTypes: u.mediaTypes ? JSON.parse(u.mediaTypes) : { banner: { sizes: [[300, 250]] } }
  })), null, 2)});

  // Bidder Adapters
  ${bidders.filter(b => b.enabled).map(b => `// ${b.bidderCode} adapter loaded`).join('\n  ')}

  // GPT Integration
  pbjs.que.push(function() {
    pbjs.requestBids({
      bidsBackHandler: function() {
        pbjs.setTargetingForGPTAsync();
      }
    });
  });

  console.log("[pbjs_engine] Prebid.js bundle loaded for ${publisher.slug}");
})();
`;
}

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

    // Get builds
    const buildsList = db.select()
      .from(publisherBuilds)
      .where(eq(publisherBuilds.publisherId, publisherId))
      .orderBy(desc(publisherBuilds.createdAt))
      .all();

    return buildsList.map(build => ({
      id: build.id,
      version: build.prebidVersion || '1.0.0',
      status: build.status === 'ready' ? 'success' : build.status,
      startedAt: build.createdAt,
      completedAt: build.status !== 'building' ? build.createdAt : null,
      duration: build.status === 'ready' ? Math.floor(Math.random() * 60 + 60) : null,
      triggeredBy: 'Super Admin',
      commitHash: build.configHash,
      fileSize: build.fileSize ? `${Math.round(build.fileSize / 1024)} KB` : null,
      modules: build.modulesIncluded ? JSON.parse(build.modulesIncluded).length : 0,
      bidders: build.modulesIncluded ? JSON.parse(build.modulesIncluded).filter((m: string) => m.startsWith('bidder:')).length : 0,
      scriptUrl: build.buildPath || null,
    }));
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

    // Get bidders and ad units for this publisher
    const bidders = db.select().from(publisherBidders).where(eq(publisherBidders.publisherId, publisherId)).all();
    // TODO: Fix after website migration
    const adUnitsData: any[] = []; // db.select().from(adUnits)...

    // Generate config hash
    const configHash = generateConfigHash(publisherId, bidders, adUnitsData);

    // Check for existing build with same config
    const existingBuild = db.select()
      .from(publisherBuilds)
      .where(and(
        eq(publisherBuilds.publisherId, publisherId),
        eq(publisherBuilds.configHash, configHash),
        eq(publisherBuilds.status, 'ready')
      ))
      .get();

    if (existingBuild) {
      return reply.code(200).send({
        id: existingBuild.id,
        message: 'Build with same config already exists',
        cached: true,
      });
    }

    // Determine version
    const latestBuild = db.select()
      .from(publisherBuilds)
      .where(eq(publisherBuilds.publisherId, publisherId))
      .orderBy(desc(publisherBuilds.createdAt))
      .limit(1)
      .get();

    let version = '1.0.0';
    if (latestBuild?.prebidVersion) {
      const parts = latestBuild.prebidVersion.split('.').map(Number);
      parts[1] = (parts[1] || 0) + 1;
      version = parts.join('.');
    }

    // Create build record
    const buildId = uuidv4();
    const now = new Date().toISOString();
    const modules = [
      ...bidders.filter(b => b.enabled).map(b => `bidder:${b.bidderCode}`),
      'core:prebidjs',
      'core:gdpr',
      'core:currency',
      'core:priceFloors',
      'core:userSync',
    ];

    db.insert(publisherBuilds).values({
      id: buildId,
      publisherId,
      configHash,
      prebidVersion: version,
      modulesIncluded: JSON.stringify(modules),
      status: 'building',
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    // Simulate build process (in real implementation, this would be async)
    setTimeout(() => {
      const bundleContent = generatePrebidBundle(publisher, bidders, adUnitsData, version);
      const buildFileName = `prebid-${publisher.slug}-v${version}-${configHash}.min.js`;
      const buildFilePath = path.join(BUILDS_DIR, buildFileName);

      try {
        fs.writeFileSync(buildFilePath, bundleContent, 'utf-8');
        const stats = fs.statSync(buildFilePath);

        db.update(publisherBuilds)
          .set({
            status: 'ready',
            buildPath: `/builds/${buildFileName}`,
            fileSize: stats.size,
          })
          .where(eq(publisherBuilds.id, buildId))
          ;
      } catch (err) {
        db.update(publisherBuilds)
          .set({ status: 'failed' })
          .where(eq(publisherBuilds.id, buildId))
          ;
      }
    }, 2000); // Simulate 2 second build time

    // Audit log
    db.insert(auditLogs).values({
      id: uuidv4(),
      userId: user?.id || null,
      action: 'TRIGGER_BUILD',
      entityType: 'build',
      entityId: buildId,
      newValues: JSON.stringify({ publisherId, version, configHash }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      createdAt: now,
    });

    return reply.code(201).send({
      id: buildId,
      version,
      status: 'building',
      configHash,
      message: 'Build started',
    });
  });

  // Get build status
  fastify.get<{
    Params: { publisherId: string; buildId: string };
  }>('/publishers/:publisherId/builds/:buildId', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
    const { publisherId, buildId } = request.params;

    const build = db.select()
      .from(publisherBuilds)
      .where(and(
        eq(publisherBuilds.id, buildId),
        eq(publisherBuilds.publisherId, publisherId)
      ))
      .get();

    if (!build) {
      return reply.code(404).send({ error: 'Build not found' });
    }

    return {
      id: build.id,
      version: build.prebidVersion || '1.0.0',
      status: build.status === 'ready' ? 'success' : build.status,
      startedAt: build.createdAt,
      completedAt: build.status !== 'building' ? build.createdAt : null,
      fileSize: build.fileSize ? `${Math.round(build.fileSize / 1024)} KB` : null,
      modules: build.modulesIncluded ? JSON.parse(build.modulesIncluded).length : 0,
      scriptUrl: build.buildPath || null,
    };
  });

  // Delete a build
  fastify.delete<{
    Params: { publisherId: string; buildId: string };
  }>('/publishers/:publisherId/builds/:buildId', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
    const { publisherId, buildId } = request.params;
    const user = (request as any).user;

    // Get build
    const build = db.select()
      .from(publisherBuilds)
      .where(and(
        eq(publisherBuilds.id, buildId),
        eq(publisherBuilds.publisherId, publisherId)
      ))
      .get();

    if (!build) {
      return reply.code(404).send({ error: 'Build not found' });
    }

    // Delete the build file if it exists
    if (build.buildPath) {
      const fileName = path.basename(build.buildPath);
      const filePath = path.join(BUILDS_DIR, fileName);

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted build file: ${filePath}`);
        }
      } catch (err) {
        console.error(`Failed to delete build file: ${filePath}`, err);
      }
    }

    // Delete database record
    db.delete(publisherBuilds).where(eq(publisherBuilds.id, buildId));

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
    });

    return { message: 'Build deleted successfully', fileDeleted: !!build.buildPath };
  });

  // Download a build
  fastify.get<{
    Params: { publisherId: string; buildId: string };
  }>('/publishers/:publisherId/builds/:buildId/download', {
    preHandler: verifyAuth,
  }, async (request, reply) => {
    const { publisherId, buildId } = request.params;

    const build = db.select()
      .from(publisherBuilds)
      .where(and(
        eq(publisherBuilds.id, buildId),
        eq(publisherBuilds.publisherId, publisherId),
        eq(publisherBuilds.status, 'ready')
      ))
      .get();

    if (!build || !build.buildPath) {
      return reply.code(404).send({ error: 'Build not found or not ready' });
    }

    const fileName = path.basename(build.buildPath);
    const filePath = path.join(BUILDS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ error: 'Build file not found' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    reply.header('Content-Type', 'application/javascript');
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);

    return content;
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
      const buildId = uuidv4();
      const now = new Date().toISOString();

      // Create build record
      db.insert(publisherBuilds).values({
        id: buildId,
        publisherId,
        configHash: 'wrapper',
        prebidVersion: '1.0.0',
        modulesIncluded: JSON.stringify(['wrapper']),
        status: 'building',
        createdAt: now,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      });

      // Build wrapper asynchronously
      buildPublisherWrapper(publisherId, publisher.slug)
        .then(({ filePath, fileSize }) => {
          db.update(publisherBuilds)
            .set({
              status: 'ready',
              buildPath: filePath,
              fileSize,
            })
            .where(eq(publisherBuilds.id, buildId))
            ;
        })
        .catch((err) => {
          console.error('Wrapper build failed:', err);
          db.update(publisherBuilds)
            .set({ status: 'failed' })
            .where(eq(publisherBuilds.id, buildId))
            ;
        });

      // Audit log
      db.insert(auditLogs).values({
        id: uuidv4(),
        userId: user?.id || null,
        action: 'BUILD_WRAPPER',
        entityType: 'build',
        entityId: buildId,
        newValues: JSON.stringify({ publisherId, type: 'wrapper' }),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        createdAt: now,
      });

      return reply.code(201).send({
        id: buildId,
        type: 'wrapper',
        status: 'building',
        message: 'Wrapper build started',
        scriptUrl: `/builds/pb-${publisher.slug}.min.js`,
      });
    } catch (err: any) {
      return reply.code(500).send({ error: 'Build failed', message: err.message });
    }
  });

  // Serve publisher wrapper at /pb/{slug}.min.js
  fastify.get<{
    Params: { slug: string };
  }>('/pb/:slug.min.js', async (request, reply) => {
    const { slug } = request.params;
    const filename = `pb-${slug}.min.js`;
    const filePath = path.join(BUILDS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({
        error: 'Wrapper not found',
        message: `No wrapper built for publisher: ${slug}. Build one at POST /api/publishers/{id}/builds/wrapper`
      });
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    reply.header('Content-Type', 'application/javascript');
    reply.header('Cache-Control', 'public, max-age=3600, s-maxage=86400'); // 1 hour client, 24 hour CDN
    reply.header('Access-Control-Allow-Origin', '*');

    return content;
  });

  // Serve build files statically
  fastify.get<{
    Params: { filename: string };
  }>('/builds/:filename', async (request, reply) => {
    const { filename } = request.params;
    const filePath = path.join(BUILDS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ error: 'File not found' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    reply.header('Content-Type', 'application/javascript');
    reply.header('Cache-Control', 'public, max-age=86400'); // 24 hour cache

    return content;
  });
}
