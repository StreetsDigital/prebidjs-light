import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { initializeDatabase } from './db';
import authRoutes from './routes/auth';
import publisherRoutes from './routes/publishers';
import userRoutes from './routes/users';
import dashboardRoutes from './routes/dashboard';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register plugins - CORS with dynamic origin checking
app.register(cors, {
  origin: true, // Reflect the request origin - for development
  credentials: true,
});

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
});

app.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production',
});

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Health check endpoint
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString(), version: 'v2-cors-fixed' };
});

// Register API routes
app.register(authRoutes, { prefix: '/api/auth' });
app.register(publisherRoutes, { prefix: '/api/publishers' });

app.register(userRoutes, { prefix: '/api/users' });
app.register(dashboardRoutes, { prefix: '/api/dashboard' });

// Placeholder for other routes
// app.register(configRoutes, { prefix: '/api/config' });
// app.register(analyticsRoutes, { prefix: '/api/analytics' });

// Public config endpoint (high performance)
app.get('/c/:apiKey', async (request, reply) => {
  const { apiKey } = request.params as { apiKey: string };

  // Import db and schema
  const { db, publishers, publisherConfig, adUnits, publisherBidders } = await import('./db');
  const { eq } = await import('drizzle-orm');

  // Find publisher by API key
  const publisher = db.select().from(publishers).where(eq(publishers.apiKey, apiKey)).get();

  if (!publisher) {
    return reply.code(404).send({ error: 'Publisher not found' });
  }

  if (publisher.status !== 'active') {
    return reply.code(403).send({ error: 'Publisher is not active' });
  }

  // Get publisher config
  const config = db.select().from(publisherConfig).where(eq(publisherConfig.publisherId, publisher.id)).get();

  // Get ad units
  const units = db.select().from(adUnits).where(eq(adUnits.publisherId, publisher.id)).all();

  // Get bidders
  const bidders = db.select().from(publisherBidders).where(eq(publisherBidders.publisherId, publisher.id)).all();

  // Build Prebid-compatible config
  const prebidConfig = {
    publisherId: publisher.id,
    publisherName: publisher.name,
    domains: publisher.domains ? JSON.parse(publisher.domains) : [],
    config: {
      bidderTimeout: config?.bidderTimeout || 1500,
      priceGranularity: config?.priceGranularity || 'medium',
      enableSendAllBids: config?.enableSendAllBids ?? true,
      bidderSequence: config?.bidderSequence || 'random',
      debug: config?.debugMode || false,
    },
    adUnits: units.map(u => ({
      code: u.code,
      name: u.name,
      mediaTypes: u.mediaTypes ? JSON.parse(u.mediaTypes) : {},
      floorPrice: u.floorPrice,
      status: u.status,
    })),
    bidders: bidders.filter(b => b.enabled).map(b => ({
      bidderCode: b.bidderCode,
      params: b.params ? JSON.parse(b.params) : {},
      timeoutOverride: b.timeoutOverride,
      priority: b.priority,
    })),
    version: config?.version || 1,
    generatedAt: new Date().toISOString(),
  };

  // Set cache headers
  reply.header('Cache-Control', 'public, max-age=300'); // 5 minute cache

  return prebidConfig;
});

// Analytics beacon endpoint (high throughput)
app.post('/b', async (request, reply) => {
  // TODO: Implement analytics beacon with Redis Streams
  return reply.code(204).send();
});

// Start server
const start = async () => {
  try {
    // Initialize database
    console.log('Initializing database...');
    initializeDatabase();
    console.log('Database initialized');

    const host = process.env.API_HOST || '0.0.0.0';
    const port = parseInt(process.env.API_PORT || '3001', 10);

    await app.listen({ port, host });
    app.log.info(`Server running at http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export default app;
