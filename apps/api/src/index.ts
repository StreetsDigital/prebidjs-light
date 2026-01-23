import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { initializeDatabase } from './db';
import authRoutes from './routes/auth';
import publisherRoutes from './routes/publishers';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register plugins
app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register API routes
app.register(authRoutes, { prefix: '/api/auth' });
app.register(publisherRoutes, { prefix: '/api/publishers' });

// Placeholder for other routes
// app.register(userRoutes, { prefix: '/api/users' });
// app.register(configRoutes, { prefix: '/api/config' });
// app.register(analyticsRoutes, { prefix: '/api/analytics' });

// Public config endpoint (high performance)
app.get('/c/:apiKey', async (request, reply) => {
  const { apiKey } = request.params as { apiKey: string };
  // TODO: Implement config fetch with Redis caching
  return reply.code(501).send({ error: 'Not implemented' });
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
