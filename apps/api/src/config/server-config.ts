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
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable must be set');
  }
  if (!process.env.COOKIE_SECRET) {
    throw new Error('COOKIE_SECRET environment variable must be set');
  }
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

  // Rate limiting
  await app.register(rateLimit, {
    max: TIMEOUTS.RATE_LIMIT_MAX_REQUESTS,
    timeWindow: TIMEOUTS.RATE_LIMIT_WINDOW,
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
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
