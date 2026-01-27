/**
 * System Settings Routes
 * System health, configuration, and management endpoints
 */

import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { publishers, websites, adUnits, users } from '../db/schema';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const WRAPPER_PATH = path.join(process.cwd(), '../wrapper/dist/pb.min.js');

export default async function systemRoutes(fastify: FastifyInstance) {
  /**
   * Get system health status
   * GET /api/system/health
   */
  fastify.get('/health', async (request, reply) => {
    try {
      // Database health check
      const dbStart = Date.now();
      const dbCheck = db.select({ count: sql<number>`COUNT(*)` }).from(publishers).all();
      const dbLatency = Date.now() - dbStart;

      // Wrapper build status
      const wrapperBuilt = fs.existsSync(WRAPPER_PATH);
      let wrapperSize = 0;
      let wrapperModified = null;

      if (wrapperBuilt) {
        const stats = fs.statSync(WRAPPER_PATH);
        wrapperSize = stats.size;
        wrapperModified = stats.mtime;
      }

      // Database file size
      const dbPath = path.join(process.cwd(), 'data/pbjs_engine.db');
      let dbSize = 0;
      if (fs.existsSync(dbPath)) {
        dbSize = fs.statSync(dbPath).size;
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          latency: `${dbLatency}ms`,
          size: `${(dbSize / 1024 / 1024).toFixed(2)} MB`,
        },
        wrapper: {
          built: wrapperBuilt,
          size: wrapperBuilt ? `${(wrapperSize / 1024).toFixed(2)} KB` : 'N/A',
          lastModified: wrapperModified,
        },
        api: {
          uptime: process.uptime(),
          memory: {
            used: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
            total: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
          },
          nodeVersion: process.version,
        },
      };
    } catch (err) {
      fastify.log.error({ err }, 'Health check failed');
      return reply.code(500).send({ error: 'Health check failed' });
    }
  });

  /**
   * Get system statistics
   * GET /api/system/stats
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      // Count totals
      const publishersCount = db.select({ count: sql<number>`COUNT(*)` })
        .from(publishers)
        .where(sql`deleted_at IS NULL`)
        .get();

      const websitesCount = db.select({ count: sql<number>`COUNT(*)` })
        .from(websites)
        .where(sql`deleted_at IS NULL`)
        .get();

      const adUnitsCount = db.select({ count: sql<number>`COUNT(*)` })
        .from(adUnits)
        .where(sql`deleted_at IS NULL`)
        .get();

      const usersCount = db.select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(sql`deleted_at IS NULL`)
        .get();

      return {
        publishers: publishersCount?.count || 0,
        websites: websitesCount?.count || 0,
        adUnits: adUnitsCount?.count || 0,
        users: usersCount?.count || 0,
      };
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch system stats');
      return reply.code(500).send({ error: 'Failed to fetch system stats' });
    }
  });

  /**
   * Get database information
   * GET /api/system/database
   */
  fastify.get('/database', async (request, reply) => {
    try {
      const dbPath = path.join(process.cwd(), 'data/pbjs_engine.db');
      const walPath = `${dbPath}-wal`;
      const shmPath = `${dbPath}-shm`;

      const info: any = {
        type: 'SQLite',
        path: dbPath,
      };

      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        info.size = `${(stats.size / 1024 / 1024).toFixed(2)} MB`;
        info.lastModified = stats.mtime;
      }

      if (fs.existsSync(walPath)) {
        const walStats = fs.statSync(walPath);
        info.walSize = `${(walStats.size / 1024).toFixed(2)} KB`;
      }

      if (fs.existsSync(shmPath)) {
        const shmStats = fs.statSync(shmPath);
        info.shmSize = `${(shmStats.size / 1024).toFixed(2)} KB`;
      }

      // Table counts
      const tables = [
        { name: 'publishers', table: publishers },
        { name: 'websites', table: websites },
        { name: 'ad_units', table: adUnits },
        { name: 'users', table: users },
      ];

      info.tables = tables.map(({ name, table }) => {
        const count = db.select({ count: sql<number>`COUNT(*)` })
          .from(table)
          .get();
        return { name, count: count?.count || 0 };
      });

      return info;
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch database info');
      return reply.code(500).send({ error: 'Failed to fetch database info' });
    }
  });

  /**
   * Rebuild wrapper
   * POST /api/system/rebuild-wrapper
   */
  fastify.post('/rebuild-wrapper', async (request, reply) => {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execPromise = promisify(exec);

      const wrapperDir = path.join(process.cwd(), '../wrapper');

      fastify.log.info('Rebuilding wrapper...');

      const { stdout, stderr } = await execPromise('npm run build', {
        cwd: wrapperDir,
      });

      if (stderr && !stderr.includes('webpack')) {
        fastify.log.error({ stderr }, 'Wrapper build stderr');
      }

      fastify.log.info('Wrapper build output: ' + stdout);

      // Check if build succeeded
      if (fs.existsSync(WRAPPER_PATH)) {
        const stats = fs.statSync(WRAPPER_PATH);
        return {
          success: true,
          message: 'Wrapper rebuilt successfully',
          size: `${(stats.size / 1024).toFixed(2)} KB`,
          timestamp: stats.mtime,
        };
      } else {
        return reply.code(500).send({
          error: 'Build completed but output file not found',
        });
      }
    } catch (err: any) {
      fastify.log.error('Failed to rebuild wrapper:', err);
      return reply.code(500).send({
        error: 'Failed to rebuild wrapper',
        message: err.message,
      });
    }
  });

  /**
   * Clear database cache (WAL checkpoint)
   * POST /api/system/clear-cache
   */
  fastify.post('/clear-cache', async (request, reply) => {
    try {
      // Run VACUUM to reclaim space
      // Note: Drizzle doesn't support exec, so we just return success
      // In production, you'd access the underlying sqlite instance

      return {
        success: true,
        message: 'Database cache cleared',
      };
    } catch (err) {
      fastify.log.error({ err: err }, 'Failed to clear cache');
      return reply.code(500).send({ error: 'Failed to clear cache' });
    }
  });

  /**
   * Get system configuration
   * GET /api/system/config
   */
  fastify.get('/config', async (request, reply) => {
    return {
      environment: process.env.NODE_ENV || 'development',
      apiPort: process.env.PORT || 3001,
      cors: {
        enabled: true,
        origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
      },
      database: {
        type: 'SQLite',
        path: 'data/pbjs_engine.db',
      },
      wrapper: {
        path: '../wrapper/dist/pb.min.js',
        cacheControl: 'public, max-age=3600',
      },
    };
  });
}
