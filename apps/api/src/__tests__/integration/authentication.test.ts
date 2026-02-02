import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestServer, extractCookies } from '../test-helper';
import { createTestUser } from '../setup';

describe('Authentication Flow Integration Tests', () => {
  let app: FastifyInstance;
  let testUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create a test user before each test
    testUser = await createTestUser({
      email: 'auth-test@example.com',
      password: 'password123',
      role: 'admin',
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.token).toBeDefined();
      expect(data.token).toBeTypeOf('string');
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.role).toBe('admin');
      expect(data.user.passwordHash).toBeUndefined(); // Should not expose password hash
    });

    it('should reject login with invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(401);

      const data = JSON.parse(response.body);
      expect(data.message).toBe('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testUser.email,
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);

      const data = JSON.parse(response.body);
      expect(data.message).toBe('Invalid email or password');
    });

    it('should reject login with disabled account', async () => {
      const disabledUser = await createTestUser({
        email: 'disabled@example.com',
        password: 'password123',
        status: 'disabled',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: disabledUser.email,
          password: disabledUser.password,
        },
      });

      expect(response.statusCode).toBe(401);

      const data = JSON.parse(response.body);
      expect(data.message).toBe('Account is disabled');
    });

    it('should reject login without email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(400);

      const data = JSON.parse(response.body);
      expect(data.message).toBe('Email and password are required');
    });

    it('should reject login without password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testUser.email,
        },
      });

      expect(response.statusCode).toBe(400);

      const data = JSON.parse(response.body);
      expect(data.message).toBe('Email and password are required');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      // First login to get token
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const { token } = JSON.parse(loginResponse.body);

      // Now get current user
      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(meResponse.statusCode).toBe(200);

      const data = JSON.parse(meResponse.body);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.role).toBe('admin');
      expect(data.user.passwordHash).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout', async () => {
      // First login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const cookies = extractCookies(loginResponse);

      // Then logout
      const logoutResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        cookies,
      });

      expect(logoutResponse.statusCode).toBe(200);

      const data = JSON.parse(logoutResponse.body);
      expect(data.message).toBe('Logged out successfully');
    });
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full login -> access protected route -> logout flow', async () => {
      // Step 1: Login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const loginData = JSON.parse(loginResponse.body);
      expect(loginData.token).toBeDefined();

      const token = loginData.token;

      // Step 2: Access protected route
      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(meResponse.statusCode).toBe(200);
      const meData = JSON.parse(meResponse.body);
      expect(meData.user.email).toBe(testUser.email);

      // Step 3: Logout
      const cookies = extractCookies(loginResponse);
      const logoutResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        cookies,
      });

      expect(logoutResponse.statusCode).toBe(200);
    });
  });

  describe('Role-based Access', () => {
    it('should allow super_admin to access all endpoints', async () => {
      const superAdmin = await createTestUser({
        email: 'superadmin@example.com',
        password: 'password123',
        role: 'super_admin',
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: superAdmin.email,
          password: superAdmin.password,
        },
      });

      const { token } = JSON.parse(loginResponse.body);

      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(meResponse.statusCode).toBe(200);
      const data = JSON.parse(meResponse.body);
      expect(data.user.role).toBe('super_admin');
    });

    it('should allow admin to access protected endpoints', async () => {
      const admin = await createTestUser({
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: admin.email,
          password: admin.password,
        },
      });

      const { token } = JSON.parse(loginResponse.body);

      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(meResponse.statusCode).toBe(200);
      const data = JSON.parse(meResponse.body);
      expect(data.user.role).toBe('admin');
    });

    it('should allow publisher to access their own data', async () => {
      const publisher = await createTestUser({
        email: 'publisher@example.com',
        password: 'password123',
        role: 'publisher',
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: publisher.email,
          password: publisher.password,
        },
      });

      const { token } = JSON.parse(loginResponse.body);

      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(meResponse.statusCode).toBe(200);
      const data = JSON.parse(meResponse.body);
      expect(data.user.role).toBe('publisher');
    });
  });
});
