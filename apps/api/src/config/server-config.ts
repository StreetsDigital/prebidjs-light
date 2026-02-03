/**
 * Server configuration and validation
 */

import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { TIMEOUTS } from '../constants/timeouts';

/**
 * Validate required environment variables
 */
export function validateEnvironment() {
  const errors: string[] = [];

  // Required variables
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required (generate with: openssl rand -base64 32)');
  }
  if (!process.env.COOKIE_SECRET) {
    errors.push('COOKIE_SECRET is required (generate with: openssl rand -base64 32)');
  }

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    // Check for weak default secrets
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
      errors.push('JWT_SECRET must be changed from default value in production');
    }
    if (process.env.COOKIE_SECRET === 'your-super-secret-cookie-key-change-this-in-production') {
      errors.push('COOKIE_SECRET must be changed from default value in production');
    }

    // Warn about default admin password
    if (process.env.SUPER_ADMIN_PASSWORD === 'ChangeMe123!') {
      console.warn(
        '\x1b[33m[WARN]\x1b[0m Default super admin password detected. Change it immediately after first login!'
      );
    }

    // Warn about missing optional but recommended services
    if (!process.env.REDIS_HOST) {
      console.warn(
        '\x1b[33m[WARN]\x1b[0m REDIS_HOST not configured. In-memory caching will be used (not recommended for production)'
      );
    }
  }

  // Security check: Ensure secrets are strong enough
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }
  if (process.env.COOKIE_SECRET && process.env.COOKIE_SECRET.length < 32) {
    errors.push('COOKIE_SECRET must be at least 32 characters long');
  }

  // Throw error if any validation failed
  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}\n\nPlease check your .env file. See .env.example for reference.`
    );
  }

  // Log successful validation
  console.log('\x1b[32m[INFO]\x1b[0m Environment validation passed');
}

/**
 * Get allowed CORS origins from environment
 */
export function getAllowedOrigins(): string[] {
  return process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];
}

/**
 * Register all Fastify plugins (middleware)
 */
export async function registerPlugins(app: FastifyInstance) {
  // CORS - restrict origins in production
  await app.register(cors, {
    origin: getAllowedOrigins(),
    credentials: true,
  });

  // JWT authentication
  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
  });

  // Cookie parsing
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET!,
  });

  // Rate limiting - global default (will be overridden per route)
  await app.register(rateLimit, {
    global: false, // Disable global, configure per-route
  });

  // Security headers - Now enabled with compatible Helmet version
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disable CSP for now (wrapper needs to be embedded on any domain)
    crossOriginEmbedderPolicy: false, // Allow embedding
    crossOriginResourcePolicy: false, // Allow cross-origin resources
    // Keep these security headers enabled:
    // - X-Frame-Options: SAMEORIGIN
    // - X-Content-Type-Options: nosniff
    // - X-XSS-Protection: 1; mode=block
    // - Strict-Transport-Security (HSTS)
  });
}

/**
 * Create Fastify instance with default configuration
 */
export function createFastifyInstance() {
  return require('fastify').default({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });
}

/**
 * Get server host and port from environment
 */
export function getServerConfig() {
  return {
    host: process.env.API_HOST || '0.0.0.0',
    port: parseInt(process.env.API_PORT || '3001', 10),
  };
}
