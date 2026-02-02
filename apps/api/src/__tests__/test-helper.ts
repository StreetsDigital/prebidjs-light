import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { initializeDatabase } from '../db';
import authRoutes from '../routes/auth';
import publisherRoutes from '../routes/publishers';
import websiteRoutes from '../routes/websites';
import userRoutes from '../routes/users';
import adUnitsRoutes from '../routes/ad-units';

/**
 * Build a Fastify test server instance
 *
 * Creates a lightweight server for testing with only essential plugins
 * and routes. Logging is disabled to keep test output clean.
 */
export async function buildTestServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Disable logging in tests
  });

  // Ensure database is initialized
  initializeDatabase();

  // Register essential plugins
  await app.register(cors, {
    origin: true, // Allow all origins in tests
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
  });

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'test-cookie-secret-key-for-testing-only',
  });

  // Skip helmet in tests to avoid CSP issues
  // await app.register(helmet);

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(publisherRoutes, { prefix: '/api/publishers' });
  await app.register(websiteRoutes, { prefix: '/api' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(adUnitsRoutes, { prefix: '/api' });

  return app;
}

/**
 * Helper to extract cookies from response
 */
export function extractCookies(response: any): Record<string, string> {
  const cookies: Record<string, string> = {};
  const setCookieHeader = response.headers['set-cookie'];

  if (!setCookieHeader) return cookies;

  const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

  for (const cookie of cookieArray) {
    const [nameValue] = cookie.split(';');
    const [name, value] = nameValue.split('=');
    cookies[name.trim()] = value;
  }

  return cookies;
}

/**
 * Helper to format cookies for request
 */
export function formatCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}
