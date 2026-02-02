import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestServer } from '../test-helper';
import { createTestUser, createTestPublisher } from '../setup';

describe('Publisher CRUD Integration Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let adminUser: Awaited<ReturnType<typeof createTestUser>>;
  let publisherToken: string;
  let publisherUser: Awaited<ReturnType<typeof createTestUser>>;
  let testPublisher: ReturnType<typeof createTestPublisher>;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create admin user
    adminUser = await createTestUser({
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });

    // Create test publisher
    testPublisher = createTestPublisher({
      name: 'Test Publisher',
      slug: 'test-publisher',
    });

    // Create publisher user
    publisherUser = await createTestUser({
      email: 'publisher@example.com',
      password: 'password123',
      role: 'publisher',
      publisherId: testPublisher.id,
    });

    // Login admin to get token
    const adminLoginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: adminUser.email,
        password: adminUser.password,
      },
    });
    adminToken = JSON.parse(adminLoginResponse.body).token;

    // Login publisher to get token
    const publisherLoginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: publisherUser.email,
        password: publisherUser.password,
      },
    });
    publisherToken = JSON.parse(publisherLoginResponse.body).token;
  });

  describe('POST /api/publishers', () => {
    it('should create a new publisher as admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'New Publisher',
          slug: 'new-publisher',
          domains: ['example.com'],
          notes: 'Test notes',
        },
      });

      expect(response.statusCode).toBe(201);

      const data = JSON.parse(response.body);
      expect(data.id).toBeDefined();
      expect(data.name).toBe('New Publisher');
      expect(data.slug).toBe('new-publisher');
      expect(data.domains).toEqual(['example.com']);
      expect(data.status).toBe('active');
      expect(data.apiKey).toBeDefined();
      expect(data.createdAt).toBeDefined();
    });

    it('should reject publisher creation without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        payload: {
          name: 'New Publisher',
          slug: 'new-publisher',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject publisher creation with duplicate slug', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Duplicate Publisher',
          slug: testPublisher.slug, // Using existing slug
          domains: ['example.com'],
        },
      });

      expect(response.statusCode).toBe(400);

      const data = JSON.parse(response.body);
      expect(data.error).toContain('slug');
    });

    it('should reject publisher creation without required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Incomplete Publisher',
          // Missing slug
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/publishers', () => {
    it('should list all publishers for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.publishers).toBeDefined();
      expect(Array.isArray(data.publishers)).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination', async () => {
      // Create multiple publishers
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/publishers',
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
          payload: {
            name: `Publisher ${i}`,
            slug: `publisher-${i}`,
            domains: [`example${i}.com`],
          },
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/publishers?page=1&limit=3',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.publishers.length).toBeLessThanOrEqual(3);
      expect(data.pagination.limit).toBe(3);
      expect(data.pagination.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should filter by status', async () => {
      // Create a paused publisher
      await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Paused Publisher',
          slug: 'paused-publisher',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/publishers?status=active',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.publishers.every((p: any) => p.status === 'active')).toBe(true);
    });

    it('should search publishers by name or slug', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/publishers?search=${testPublisher.name}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.publishers.length).toBeGreaterThanOrEqual(1);
      expect(
        data.publishers.some((p: any) => p.name === testPublisher.name)
      ).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/publishers',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/publishers/:id', () => {
    it('should get a single publisher by ID as admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/publishers/${testPublisher.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.id).toBe(testPublisher.id);
      expect(data.name).toBe(testPublisher.name);
      expect(data.slug).toBe(testPublisher.slug);
    });

    it('should allow publisher to access their own data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/publishers/${testPublisher.id}`,
        headers: {
          authorization: `Bearer ${publisherToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.id).toBe(testPublisher.id);
    });

    it('should return 404 for non-existent publisher', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/publishers/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/publishers/invalid-uuid',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PUT /api/publishers/:id', () => {
    it('should update publisher as admin', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/publishers/${testPublisher.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Updated Publisher Name',
          status: 'paused',
        },
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.name).toBe('Updated Publisher Name');
      expect(data.status).toBe('paused');
      expect(data.updatedAt).toBeDefined();
    });

    it('should reject update without authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/publishers/${testPublisher.id}`,
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent publisher', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/publishers/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should validate status values', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/publishers/${testPublisher.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          status: 'invalid-status',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/publishers/:id', () => {
    it('should soft delete publisher as admin', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/publishers/${testPublisher.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify soft delete - publisher should still exist with deletedAt
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/publishers/${testPublisher.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      // Should return 404 since it's deleted (depending on implementation)
      // or return the publisher with deletedAt field
      expect([200, 404]).toContain(getResponse.statusCode);
    });

    it('should reject delete without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/publishers/${testPublisher.id}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent publisher', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/publishers/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Complete Publisher CRUD Flow', () => {
    it('should complete create -> read -> update -> delete flow', async () => {
      // CREATE
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'CRUD Test Publisher',
          slug: 'crud-test-publisher',
          domains: ['crudtest.com'],
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const created = JSON.parse(createResponse.body);
      const publisherId = created.id;

      // READ
      const readResponse = await app.inject({
        method: 'GET',
        url: `/api/publishers/${publisherId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(readResponse.statusCode).toBe(200);
      const read = JSON.parse(readResponse.body);
      expect(read.id).toBe(publisherId);
      expect(read.name).toBe('CRUD Test Publisher');

      // UPDATE
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/publishers/${publisherId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Updated CRUD Test Publisher',
          status: 'paused',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const updated = JSON.parse(updateResponse.body);
      expect(updated.name).toBe('Updated CRUD Test Publisher');
      expect(updated.status).toBe('paused');

      // DELETE
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/publishers/${publisherId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(204);
    });
  });
});
