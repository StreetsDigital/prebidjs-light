# Test Suite Documentation

This directory contains the comprehensive test suite for the pbjs_engine API.

## Test Structure

```
apps/api/src/
├── __tests__/
│   ├── setup.ts                    # Test database setup and helpers
│   ├── test-helper.ts              # Fastify app builder and utilities
│   ├── integration/                # Integration tests
│   │   ├── authentication.test.ts # Auth flow integration tests (NEW)
│   │   ├── publisher-crud.test.ts # Publisher CRUD operations (NEW)
│   │   ├── complete-workflow.test.ts # Complete workflows (NEW)
│   │   └── health.test.ts         # Health endpoint tests
│   ├── security/                   # Security tests (NEW)
│   │   └── xss-protection.test.ts # XSS and injection protection (NEW)
│   └── README.md                   # This file
├── routes/__tests__/
│   └── auth.test.ts               # Authentication route tests
└── utils/__tests__/
    ├── safe-json.test.ts          # JSON parsing utility tests
    ├── validation.test.ts         # UUID validation tests
    └── error-handler.test.ts      # Error handler tests (placeholder)
```

## Running Tests

```bash
cd apps/api

# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/utils/__tests__/safe-json.test.ts

# Run with coverage (requires @vitest/coverage-v8)
npm test -- --coverage
```

## Test Categories

### 1. Unit Tests

**Utilities** (`src/utils/__tests__/`)
- `safe-json.test.ts`: Tests for safe JSON parsing functions
- `validation.test.ts`: Tests for UUID validation
- `error-handler.test.ts`: Placeholder for error handling tests

Tests individual functions in isolation without dependencies.

### 2. Route Tests

**Authentication** (`src/routes/__tests__/`)
- `auth.test.ts`: Tests for login, logout, refresh, forgot password, reset password

Tests API route handlers using Fastify's inject method for fast, isolated testing.

### 3. Integration Tests

**Workflows** (`src/__tests__/integration/`)
- `authentication.test.ts`: Complete authentication flows (login, logout, /me endpoint, role-based access)
- `publisher-crud.test.ts`: Publisher CRUD operations (create, read, update, delete with soft delete)
- `complete-workflow.test.ts`: End-to-end workflows (publisher onboarding, multi-website setup, modifications, deletion)
- `health.test.ts`: Basic health check endpoint test

Tests complete user flows across multiple endpoints with real database interactions.

### 4. Security Tests

**Protection** (`src/__tests__/security/`)
- `xss-protection.test.ts`: XSS, SQL injection, JSON injection, path traversal, and content-type protection tests

Tests security measures to prevent common vulnerabilities.

## Test Infrastructure

### Setup (`setup.ts`)

- Creates a separate test database file (`pbjs_engine.test.db`) for isolation
- Automatically sets test environment variables (JWT_SECRET, DATABASE_PATH, etc.)
- Provides helper functions:
  - `createTestUser(overrides)`: Creates test users with customizable roles and attributes
  - `createTestPublisher(overrides)`: Creates test publishers with custom data
  - `getTestDb()`: Returns SQLite database instance for direct queries
  - `getTestDrizzle()`: Returns Drizzle ORM instance
- Cleans all test data before each test to ensure isolation
- Automatically deletes test database files after all tests complete

### Test Helper (`test-helper.ts`)

- `buildTestServer()`: Creates a Fastify instance for testing with all necessary plugins and routes
- `extractCookies(response)`: Extracts cookies from response for session testing
- `formatCookies(cookies)`: Formats cookies for subsequent requests

### Example: Writing an Integration Test

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestServer } from '../test-helper';
import { createTestUser } from '../setup';

describe('My Feature Integration Tests', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create test user and login
    const user = await createTestUser({
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: user.email,
        password: user.password,
      },
    });

    authToken = JSON.parse(loginResponse.body).token;
  });

  it('should perform authenticated operation', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/my-route',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('data');
  });
});
```

## Test Coverage

Current coverage:

**Utilities:**
- ✅ safe-json.ts: Full coverage (parsing, arrays, objects)
- ✅ validation.ts: Full coverage (UUID validation)
- ⏳ error-handler.ts: Pending refactoring

**Routes:**
- ✅ auth.ts: Comprehensive coverage
  - Login (success, failures, rate limiting)
  - Logout
  - Refresh tokens
  - Password reset flow
  - Current user endpoint

**Integration:**
- ✅ Authentication flows (14 tests)
  - Login with valid/invalid credentials
  - Disabled account handling
  - Token-based access to protected endpoints
  - Role-based access control (super_admin, admin, publisher)
  - Complete login → access → logout flow
- ✅ Publisher CRUD (21 tests)
  - Create publishers with validation
  - List publishers with pagination, filtering, and search
  - Read single publisher with access control
  - Update publisher fields
  - Soft delete with audit logging
- ✅ Complete workflows (55 tests)
  - Publisher onboarding (create publisher → add websites → create ad units)
  - Multi-website publisher management
  - Publisher modification workflows
  - Deletion workflows with cascade effects
  - Error handling for edge cases
- ✅ Health checks

**Security:**
- ✅ XSS Protection (20 tests)
  - Script injection in wrapper endpoints
  - HTML/JavaScript escaping in API responses
  - JSON serialization safety
  - SQL injection protection via Drizzle ORM
  - CRLF injection prevention
  - Path traversal protection
  - Content-Type validation

## Known Issues

1. **Coverage package**: Install `@vitest/coverage-v8` for coverage reports
2. **Some DELETE tests expect 404 but get 400**: UUID validation returns 400 before checking if resource exists (working as designed)

## Best Practices

1. **Database Isolation**: Each test gets a clean database state
2. **Close Fastify**: Always call `await app.close()` after test
3. **Use Real UUIDs**: Use `uuidv4()` for test IDs, not hardcoded strings
4. **Test Errors**: Test both success and failure paths
5. **Descriptive Names**: Use clear, descriptive test names

## Adding New Tests

### For a new utility function:

1. Create `src/utils/__tests__/my-utility.test.ts`
2. Import function and test framework
3. Write unit tests covering all code paths

### For a new route:

1. Create `src/routes/__tests__/my-route.test.ts`
2. Import test helpers (`build`, `createTestUser`, etc.)
3. Test all endpoints, success and error cases
4. Include authentication tests if protected

### For integration tests:

1. Create `src/__tests__/integration/my-workflow.test.ts`
2. Test complete user flows across multiple endpoints
3. Verify database state changes
4. Test realistic scenarios

## Troubleshooting

### "build is not a function"
- Ensure you're importing from the correct path: `../../__tests__/test-helper`
- Check that the import is using named import: `import { build } from ...`

### "Database locked"
- SQLite only allows one writer at a time
- Make sure all database operations complete before the next test
- Use `beforeEach` hooks to reset state, not `beforeAll`

### "Invalid UUID"
- Use proper UUIDv4 format with correct version (4) and variant (8, 9, a, or b)
- Example: `123e4567-e89b-42d3-a456-426614174000`

## Future Enhancements

- [ ] Install and configure coverage reporting
- [ ] Add tests for remaining route handlers
- [ ] Add tests for database schema
- [ ] Add performance benchmarks
- [ ] Add E2E tests with real HTTP server
- [ ] Add API contract tests
- [ ] Add security vulnerability tests
