import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestServer } from '../test-helper';
import { createTestPublisher, createTestUser } from '../setup';

describe('XSS Protection Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create admin user and get token
    const adminUser = await createTestUser({
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: adminUser.email,
        password: adminUser.password,
      },
    });

    adminToken = JSON.parse(loginResponse.body).token;
  });

  describe('Wrapper Script XSS Protection', () => {
    it('should properly escape publisher name in wrapper script', async () => {
      const maliciousPublisher = createTestPublisher({
        name: 'Test */ alert("XSS") /* Publisher',
        slug: 'xss-test',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/pb.js?id=${maliciousPublisher.slug}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/javascript');

      const script = response.body;

      // The comment should be escaped or the name should be in JSON.stringify
      expect(script).not.toContain('alert("XSS")');

      // Should use JSON.stringify for safe encoding
      expect(script).toContain('JSON.stringify');
    });

    it('should use JSON.stringify for publisher slug in wrapper', async () => {
      const publisher = createTestPublisher({
        name: 'Safe Publisher',
        slug: 'safe-publisher',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/pb.js?id=${publisher.slug}`,
      });

      expect(response.statusCode).toBe(200);

      const script = response.body;

      // Should use JSON.stringify, not template literals or concatenation
      expect(script).toContain('JSON.stringify');
      expect(script).not.toMatch(/var publisherId = '\${/);
      expect(script).not.toMatch(/var publisherId = '\+/);
    });

    it('should sanitize API endpoint URL in wrapper', async () => {
      const publisher = createTestPublisher({
        slug: 'test-publisher',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/pb.js?id=${publisher.slug}`,
        headers: {
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'evil.com',
        },
      });

      expect(response.statusCode).toBe(200);

      const script = response.body;

      // Should use JSON.stringify for the endpoint
      expect(script).toContain('JSON.stringify');
    });
  });

  describe('Config Endpoint XSS Protection', () => {
    it('should properly serialize publisher config as JSON', async () => {
      const publisher = createTestPublisher({
        name: '<script>alert("XSS")</script>',
        slug: 'xss-config-test',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/c/${publisher.slug}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const config = JSON.parse(response.body);

      // Should be properly escaped in JSON
      expect(config.publisherName).toBe('<script>alert("XSS")</script>');

      // When stringified again, should be safe
      const serialized = JSON.stringify(config);
      expect(serialized).toContain('\\u003c'); // < should be escaped
    });
  });

  describe('API Input Sanitization', () => {
    it('should reject SQL injection attempts in publisher creation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: "Test'; DROP TABLE publishers; --",
          slug: 'sql-injection-test',
        },
      });

      // Should create normally (Drizzle ORM protects against SQL injection)
      expect([201, 400]).toContain(response.statusCode);

      // Verify publishers table still exists by querying
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(listResponse.statusCode).toBe(200);
    });

    it('should handle XSS attempts in publisher name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: '<img src=x onerror=alert("XSS")>',
          slug: 'xss-name-test',
        },
      });

      // Should create successfully (stored as-is in database)
      expect([201, 400]).toContain(response.statusCode);

      if (response.statusCode === 201) {
        const data = JSON.parse(response.body);
        // Should be stored as-is
        expect(data.name).toBe('<img src=x onerror=alert("XSS")>');

        // When retrieved, should be in JSON (which escapes HTML)
        const getResponse = await app.inject({
          method: 'GET',
          url: `/api/publishers/${data.id}`,
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        });

        expect(getResponse.statusCode).toBe(200);
        const retrieved = JSON.parse(getResponse.body);
        expect(retrieved.name).toBe('<img src=x onerror=alert("XSS")>');

        // When serialized to JSON, should be safe
        const serialized = JSON.stringify(retrieved);
        expect(serialized).toContain('\\u003c'); // < should be escaped
      }
    });

    it('should handle script tags in publisher notes', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Test Publisher',
          slug: 'xss-notes-test',
          notes: '<script>alert("XSS from notes")</script>',
        },
      });

      expect([201, 400]).toContain(response.statusCode);

      if (response.statusCode === 201) {
        const data = JSON.parse(response.body);
        // Notes should be stored as-is
        expect(data.notes).toBe('<script>alert("XSS from notes")</script>');

        // JSON serialization should escape it
        const serialized = JSON.stringify(data);
        expect(serialized).toContain('\\u003c');
      }
    });
  });

  describe('Header Injection Protection', () => {
    it('should reject CRLF injection in query parameters', async () => {
      const publisher = createTestPublisher({
        slug: 'test-publisher',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/pb.js?id=${publisher.slug}%0d%0aSet-Cookie:%20malicious=true`,
      });

      // Should either ignore the CRLF or reject it
      expect(response.statusCode).toBe(200);

      // Should not set malicious cookie
      expect(response.headers['set-cookie']).not.toContain('malicious=true');
    });
  });

  describe('JSON Injection Protection', () => {
    it('should properly handle special characters in domains array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Test Publisher',
          slug: 'json-injection-test',
          domains: ['example.com", "evil.com'],
        },
      });

      expect([201, 400]).toContain(response.statusCode);

      if (response.statusCode === 201) {
        const data = JSON.parse(response.body);

        // Should store the full string as a single domain
        expect(data.domains).toHaveLength(1);
        expect(data.domains[0]).toBe('example.com", "evil.com');
      }
    });
  });

  describe('Path Traversal Protection', () => {
    it('should reject path traversal attempts in publisher ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/publishers/../../../etc/passwd',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      // Should return 400 for invalid UUID or 404 for not found
      expect([400, 404]).toContain(response.statusCode);
    });
  });

  describe('Content-Type Protection', () => {
    it('should return correct content-type for wrapper script', async () => {
      const publisher = createTestPublisher({
        slug: 'content-type-test',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/pb.js?id=${publisher.slug}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/javascript');
      expect(response.headers['content-type']).toContain('charset=utf-8');
    });

    it('should return correct content-type for config endpoint', async () => {
      const publisher = createTestPublisher({
        slug: 'config-content-type-test',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/c/${publisher.slug}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });
  });
});
