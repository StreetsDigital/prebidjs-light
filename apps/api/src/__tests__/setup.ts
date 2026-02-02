import { beforeAll, afterAll, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

/**
 * Test database setup
 *
 * Uses a separate test database file for isolation.
 * Each test gets a fresh database state to ensure isolation.
 */

// Test database path
const TEST_DB_PATH = path.join(process.cwd(), 'data', 'pbjs_engine.test.db');

beforeAll(() => {
  console.log('Setting up test database...');

  // Set environment variables for test
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = TEST_DB_PATH;
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.COOKIE_SECRET = 'test-cookie-secret-key-for-testing-only';
  process.env.AUTO_SEED_ADMIN = 'false';

  // Delete existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  const walPath = `${TEST_DB_PATH}-wal`;
  const shmPath = `${TEST_DB_PATH}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
});

afterAll(async () => {
  console.log('Closing test database...');

  // Clean up test database files
  try {
    // Import and close the database connection
    const dbModule = await import('../db');
    dbModule.sqlite.close();

    // Delete test database files
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    const walPath = `${TEST_DB_PATH}-wal`;
    const shmPath = `${TEST_DB_PATH}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  } catch (err) {
    console.error('Error cleaning up test database:', err);
  }
});

beforeEach(async () => {
  // Clean all tables before each test
  await cleanDatabase();
});

// No need to initialize tables - initializeDatabase() from db/index.ts handles it

/**
 * Clean all test data from database
 */
async function cleanDatabase() {
  const dbModule = await import('../db/index.js');
  const { db, sqlite } = dbModule;

  // Disable foreign keys temporarily
  sqlite.exec('PRAGMA foreign_keys = OFF');

  const tables = [
    'analytics_events',
    'publisher_bidders',
    'ad_units',
    'websites',
    'password_reset_tokens',
    'sessions',
    'ab_test_variants',
    'ab_tests',
    'publishers',
    'users',
  ];

  for (const table of tables) {
    try {
      sqlite.exec(`DELETE FROM ${table}`);
    } catch (err) {
      // Table might not exist, that's okay
    }
  }

  // Re-enable foreign keys
  sqlite.exec('PRAGMA foreign_keys = ON');
}

/**
 * Create a test user
 */
export async function createTestUser(overrides: {
  email?: string;
  password?: string;
  role?: 'super_admin' | 'admin' | 'publisher';
  publisherId?: string | null;
  status?: 'active' | 'disabled';
} = {}) {
  const dbModule = await import('../db/index.js');
  const { db, users } = dbModule;

  const id = uuidv4();
  const email = overrides.email || 'test@example.com';
  const password = overrides.password || 'password123';
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const userData = {
    id,
    email,
    passwordHash,
    name: 'Test User',
    role: overrides.role || 'publisher',
    publisherId: overrides.publisherId === undefined ? null : overrides.publisherId,
    status: overrides.status || 'active',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  db.insert(users).values(userData).run();

  return { ...userData, password };
}

/**
 * Create a test publisher
 */
export async function createTestPublisher(overrides: {
  name?: string;
  slug?: string;
  status?: 'active' | 'paused' | 'disabled';
} = {}) {
  const dbModule = await import('../db/index.js');
  const { db, publishers } = dbModule;

  const id = uuidv4();
  const now = new Date().toISOString();

  const publisherData = {
    id,
    name: overrides.name || 'Test Publisher',
    slug: overrides.slug || 'test-publisher',
    apiKey: uuidv4(),
    domains: null,
    status: overrides.status || 'active',
    notes: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
  };

  db.insert(publishers).values(publisherData).run();

  return publisherData;
}

/**
 * Get test database instance for direct queries
 */
export async function getTestDb() {
  const dbModule = await import('../db/index.js');
  return dbModule.sqlite;
}

/**
 * Get test Drizzle instance
 */
export async function getTestDrizzle() {
  const dbModule = await import('../db/index.js');
  return dbModule.db;
}
