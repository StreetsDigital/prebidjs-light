/**
 * Health Check Routes
 * Provides detailed system health information for monitoring and alerting
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthCheckResult;
    prebidSource: HealthCheckResult;
    buildDirectory: HealthCheckResult;
    diskSpace: HealthCheckResult;
  };
  version: string;
  environment: string;
}

interface HealthCheckResult {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
}

/**
 * Check database connectivity and basic query
 */
function checkDatabase(): HealthCheckResult {
  try {
    // Import sqlite directly for low-level queries
    const { sqlite } = require('../db');

    // Try a simple query
    const result = sqlite.prepare('SELECT 1 as test').get() as { test: number } | undefined;

    if (result && result.test === 1) {
      return {
        status: 'pass',
        message: 'Database connection successful',
      };
    } else {
      return {
        status: 'fail',
        message: 'Database query returned unexpected result',
      };
    }
  } catch (err) {
    return {
      status: 'fail',
      message: 'Database connection failed',
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Check if Prebid.js source exists
 */
function checkPrebidSource(): HealthCheckResult {
  try {
    const prebidDir = path.join(process.cwd(), 'prebid-source', 'Prebid.js');
    const packageJsonPath = path.join(prebidDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return {
        status: 'pass',
        message: 'Prebid.js source found',
        details: {
          version: packageJson.version,
          path: prebidDir,
        },
      };
    } else {
      return {
        status: 'warn',
        message: 'Prebid.js source not found',
        details: {
          path: prebidDir,
          note: 'Build functionality may be limited',
        },
      };
    }
  } catch (err) {
    return {
      status: 'warn',
      message: 'Error checking Prebid.js source',
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Check if build directory exists and is writable
 */
function checkBuildDirectory(): HealthCheckResult {
  try {
    const buildDir = path.join(process.cwd(), 'prebid-builds');

    // Check if directory exists
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }

    // Check if writable by creating a test file
    const testFile = path.join(buildDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);

    // Get directory stats
    const stats = fs.statSync(buildDir);
    const files = fs.readdirSync(buildDir).filter((f) => f.endsWith('.js'));

    return {
      status: 'pass',
      message: 'Build directory is writable',
      details: {
        path: buildDir,
        buildCount: files.length,
        created: stats.birthtime,
      },
    };
  } catch (err) {
    return {
      status: 'fail',
      message: 'Build directory is not writable',
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Check available disk space
 */
function checkDiskSpace(): HealthCheckResult {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const stats = fs.statSync(dataDir);

    // Simple check - just verify we can access the directory
    // For production, consider using a library like 'check-disk-space'
    return {
      status: 'pass',
      message: 'Data directory accessible',
      details: {
        path: dataDir,
        note: 'Install check-disk-space npm package for detailed disk metrics',
      },
    };
  } catch (err) {
    return {
      status: 'warn',
      message: 'Could not check disk space',
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Determine overall health status based on individual checks
 */
function determineOverallStatus(checks: HealthCheckResponse['checks']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map((check) => check.status);

  if (statuses.includes('fail')) {
    return 'unhealthy';
  } else if (statuses.includes('warn')) {
    return 'degraded';
  } else {
    return 'healthy';
  }
}

/**
 * Health check routes
 */
export default async function healthRoutes(fastify: FastifyInstance) {
  /**
   * Basic health check - fast endpoint for load balancers
   * @route GET /health
   * @access Public
   */
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Detailed health check - comprehensive system status
   * @route GET /api/health
   * @access Public (but can be restricted in production)
   */
  fastify.get('/api/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const checks = {
      database: checkDatabase(),
      prebidSource: checkPrebidSource(),
      buildDirectory: checkBuildDirectory(),
      diskSpace: checkDiskSpace(),
    };

    const overallStatus = determineOverallStatus(checks);

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    // Return appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    return reply.code(httpStatus).send(response);
  });

  /**
   * Readiness check - indicates if service is ready to accept traffic
   * @route GET /api/health/ready
   * @access Public
   */
  fastify.get('/api/health/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const dbCheck = checkDatabase();
    const buildDirCheck = checkBuildDirectory();

    // Service is ready if database is accessible and build directory is writable
    const isReady = dbCheck.status === 'pass' && buildDirCheck.status === 'pass';

    return reply.code(isReady ? 200 : 503).send({
      ready: isReady,
      checks: {
        database: dbCheck,
        buildDirectory: buildDirCheck,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Liveness check - indicates if service is alive (for Kubernetes)
   * @route GET /api/health/live
   * @access Public
   */
  fastify.get('/api/health/live', async (request: FastifyRequest, reply: FastifyReply) => {
    // Service is alive if it can respond to requests
    return reply.send({
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
}
