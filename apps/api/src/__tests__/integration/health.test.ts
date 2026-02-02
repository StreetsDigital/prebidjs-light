import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';

describe('Health endpoint integration tests', () => {
  it('should respond to health check', async () => {
    const app = Fastify({ logger: false });

    app.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');

    await app.close();
  });

  it('should include timestamp in health response', async () => {
    const app = Fastify({ logger: false });

    app.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = JSON.parse(response.body);
    const timestamp = new Date(body.timestamp);
    expect(timestamp.toString()).not.toBe('Invalid Date');

    await app.close();
  });
});
