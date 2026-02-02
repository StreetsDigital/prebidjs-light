# Naming Conventions

This document outlines the naming conventions used throughout the pbjs_engine codebase. Following these conventions ensures consistency, readability, and maintainability.

## Table of Contents

- [Variables](#variables)
- [Functions](#functions)
- [Classes and Interfaces](#classes-and-interfaces)
- [Files and Directories](#files-and-directories)
- [Constants](#constants)
- [Database Tables and Columns](#database-tables-and-columns)
- [React Components](#react-components)
- [API Routes](#api-routes)
- [Examples](#examples)

## Variables

### Standard Variables
Use **camelCase** for standard variables:

```typescript
// ✅ Good
const userId = '123';
const apiEndpoint = '/api/publishers';
const hasPermission = true;
const publisherData = fetchPublisherData();

// ❌ Bad
const user_id = '123';                    // snake_case
const APIEndpoint = '/api/publishers';   // PascalCase
const has_permission = true;             // snake_case
```

### Boolean Variables
Prefix boolean variables with `is`, `has`, `should`, or `can`:

```typescript
// ✅ Good
const isActive = true;
const hasAccess = checkAccess();
const shouldRefresh = false;
const canEdit = user.role === 'admin';
const isLoading = true;
const hasError = false;

// ❌ Bad
const active = true;                    // Not clear it's a boolean
const access = checkAccess();           // Ambiguous
const refresh = false;                  // Could be a function
```

### Private Variables
Use a leading underscore for private class members (only when necessary):

```typescript
class DataService {
  private _cache: Map<string, any>;
  private _config: Config;

  // Public members without underscore
  public apiUrl: string;
}
```

## Functions

### Standard Functions
Use **camelCase** and verb-based names:

```typescript
// ✅ Good
function fetchPublishers(): Publisher[] { }
function validateInput(data: FormData): boolean { }
function calculateRevenue(bids: Bid[]): number { }
function transformData(raw: RawData): ProcessedData { }

// ❌ Bad
function get_publishers(): Publisher[] { }      // snake_case
function Publishers(): Publisher[] { }           // Noun instead of verb
function Data(raw: RawData): ProcessedData { }  // Too generic
```

### Async Functions
Prefix async functions with action verbs like `fetch`, `load`, `save`, `update`:

```typescript
// ✅ Good
async function fetchUserData(id: string): Promise<User> { }
async function loadConfiguration(): Promise<Config> { }
async function savePublisher(data: PublisherData): Promise<void> { }
async function updateBidder(id: string, params: BidderParams): Promise<void> { }

// ❌ Bad
async function getUserData(id: string): Promise<User> { }  // Use 'fetch' for async
async function getConfig(): Promise<Config> { }             // Use 'load' for async
async function publisher(data: PublisherData): Promise<void> { }  // Missing verb
```

### Boolean-Returning Functions
Prefix with `is`, `has`, `should`, or `can`:

```typescript
// ✅ Good
function isValidUUID(value: string): boolean { }
function hasPermission(user: User, action: string): boolean { }
function shouldRefresh(config: Config): boolean { }
function canEdit(user: User, resource: Resource): boolean { }

// ❌ Bad
function validateUUID(value: string): boolean { }       // Doesn't indicate boolean return
function checkPermission(user: User): boolean { }       // Ambiguous
function refresh(config: Config): boolean { }           // Not clear it's a check
```

### Event Handlers
Prefix with `handle` or `on`:

```typescript
// ✅ Good - React components
function handleClick(event: MouseEvent): void { }
function handleSubmit(event: FormEvent): void { }
function onSave(data: FormData): void { }
function onDelete(id: string): void { }

// ❌ Bad
function click(event: MouseEvent): void { }           // Missing prefix
function submitForm(event: FormEvent): void { }       // Not clear it's a handler
```

### Utility Functions
Use descriptive verb-based names:

```typescript
// ✅ Good
function formatCurrency(amount: number): string { }
function parseJSON<T>(jsonString: string): T { }
function sanitizeInput(raw: string): string { }
function debounce<T>(fn: Function, delay: number): Function { }

// ❌ Bad
function currency(amount: number): string { }         // Too generic
function json<T>(jsonString: string): T { }          // Unclear
function clean(raw: string): string { }              // Ambiguous
```

## Classes and Interfaces

### Classes
Use **PascalCase**:

```typescript
// ✅ Good
class UserService { }
class DataRepository { }
class AuthenticationManager { }
class ConfigValidator { }

// ❌ Bad
class userService { }              // camelCase
class data_repository { }          // snake_case
class authentication_manager { }   // snake_case
```

### Interfaces
Use **PascalCase** without `I` prefix:

```typescript
// ✅ Good
interface User { }
interface PublisherConfig { }
interface ApiResponse { }
interface RequestHandler { }

// ❌ Bad
interface IUser { }                // Hungarian notation (avoid I prefix)
interface userInterface { }        // camelCase
interface user_config { }          // snake_case
```

### Type Aliases
Use **PascalCase**:

```typescript
// ✅ Good
type UserId = string;
type PublisherStatus = 'active' | 'paused' | 'disabled';
type ErrorHandler = (error: Error) => void;

// ❌ Bad
type userId = string;              // camelCase
type publisher_status = 'active' | 'paused';  // snake_case
```

## Files and Directories

### TypeScript/JavaScript Files
Use **kebab-case** for utility and module files:

```
✅ Good
safe-json.ts
prebid-data-fetcher.ts
error-handler.ts
wrapper-generator.ts
type-helpers.ts

❌ Bad
safeJson.ts                    // camelCase
PrebidDataFetcher.ts          // PascalCase
error_handler.ts              // snake_case
```

### React Component Files
Use **PascalCase** matching the component name:

```
✅ Good
PublisherCard.tsx
WebsiteModal.tsx
DynamicParameterForm.tsx
ErrorBoundary.tsx

❌ Bad
publisher-card.tsx            // kebab-case
websiteModal.tsx              // camelCase
dynamic_parameter_form.tsx   // snake_case
```

### Route Files
Use **kebab-case** or singular names:

```
✅ Good
auth.ts
publishers.ts
ad-units.ts
wrapper-configs.ts

❌ Bad
Auth.ts                       // PascalCase
PublisherRoutes.ts           // PascalCase
ad_units.ts                  // snake_case
```

### Directories
Use **kebab-case**:

```
✅ Good
/apps/api/
/apps/admin/
/src/components/
/src/utils/
/src/api-client/

❌ Bad
/apps/API/                    // UPPERCASE
/apps/adminPanel/            // camelCase
/src/ui_components/          // snake_case
```

## Constants

### Global Constants
Use **SCREAMING_SNAKE_CASE**:

```typescript
// ✅ Good
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT = 5000;
const CACHE_TTL_MINUTES = 60;

// ❌ Bad
const apiBaseUrl = 'https://api.example.com';     // camelCase
const maxRetryAttempts = 3;                       // camelCase
const DefaultTimeout = 5000;                      // PascalCase
```

### Enum Values
Use **SCREAMING_SNAKE_CASE** for enum keys:

```typescript
// ✅ Good
enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  PUBLISHER = 'publisher',
}

// ❌ Bad
enum HttpStatus {
  ok = 200,                          // lowercase
  BadRequest = 400,                  // PascalCase
  unauthorized = 401,                // lowercase
}
```

## Database Tables and Columns

### Table Names
Use **snake_case** and plural nouns:

```sql
-- ✅ Good
publishers
ad_units
wrapper_configs
audit_logs
password_reset_tokens

-- ❌ Bad
Publishers                    -- PascalCase
adUnits                       -- camelCase
WrapperConfig                 -- PascalCase (and singular)
```

### Column Names
Use **snake_case**:

```sql
-- ✅ Good
user_id
created_at
updated_at
deleted_at
bidder_timeout
price_granularity

-- ❌ Bad
userId                        -- camelCase
CreatedAt                     -- PascalCase
updatedAt                     -- camelCase
```

## React Components

### Component Names
Use **PascalCase**:

```typescript
// ✅ Good
export function PublisherCard() { }
export function WebsiteModal() { }
export function DynamicParameterForm() { }

// ❌ Bad
export function publisherCard() { }      // camelCase
export function website_modal() { }      // snake_case
```

### Component Props Interfaces
Suffix with `Props`:

```typescript
// ✅ Good
interface PublisherCardProps {
  publisher: Publisher;
  onEdit: (id: string) => void;
}

interface WebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ❌ Bad
interface PublisherCard {              // Missing Props suffix
  publisher: Publisher;
}

interface IWebsiteModalProps {         // Hungarian notation
  isOpen: boolean;
}
```

### Custom Hooks
Prefix with `use`:

```typescript
// ✅ Good
function useAuth() { }
function usePublishers() { }
function useDebounce(value: string, delay: number) { }
function useLocalStorage(key: string) { }

// ❌ Bad
function auth() { }                    // Missing use prefix
function getPublishers() { }           // Not following hook convention
function Debounce(value: string) { }   // PascalCase
```

## API Routes

### Route Paths
Use **kebab-case** and plural nouns for resources:

```typescript
// ✅ Good
/api/publishers
/api/ad-units
/api/wrapper-configs
/api/audit-logs
/api/password-reset

// ❌ Bad
/api/Publishers                // PascalCase
/api/adUnits                   // camelCase
/api/WrapperConfig             // PascalCase
/api/auditLogs                 // camelCase
```

### Query Parameters
Use **camelCase**:

```typescript
// ✅ Good
?page=1&limit=10
?sortBy=name&sortOrder=asc
?includeDeleted=true

// ❌ Bad
?Page=1&Limit=10              // PascalCase
?sort_by=name                 // snake_case
?include-deleted=true         // kebab-case
```

## Examples

### Complete File Example (Utility)

```typescript
// ✅ Good: apps/api/src/utils/safe-json.ts
/**
 * Safely parse JSON with fallback value
 */
export function safeJsonParse<T = any>(
  jsonString: string | null | undefined,
  defaultValue: T = null as T
): T {
  if (!jsonString) {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
}

/**
 * Safely parse JSON array
 */
export function safeJsonParseArray<T = any>(
  jsonString: string | null | undefined,
  defaultValue: T[] = []
): T[] {
  return safeJsonParse<T[]>(jsonString, defaultValue);
}

const MAX_JSON_SIZE = 1024 * 1024; // 1MB
const DEFAULT_ENCODING = 'utf-8';
```

### Complete File Example (React Component)

```typescript
// ✅ Good: apps/admin/src/components/PublisherCard.tsx
import React from 'react';

interface PublisherCardProps {
  publisher: Publisher;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PublisherCard({ publisher, onEdit, onDelete }: PublisherCardProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const hasActiveStatus = publisher.status === 'active';

  const handleEdit = () => {
    onEdit(publisher.id);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    await onDelete(publisher.id);
    setIsLoading(false);
  };

  return (
    <div className="publisher-card">
      <h3>{publisher.name}</h3>
      {hasActiveStatus && <span className="badge">Active</span>}
      <button onClick={handleEdit}>Edit</button>
      <button onClick={handleDelete} disabled={isLoading}>
        {isLoading ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
```

### Complete File Example (API Route)

```typescript
// ✅ Good: apps/api/src/routes/publishers.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, publishers } from '../db';
import { eq } from 'drizzle-orm';
import { validateUUID } from '../utils/validation';

interface CreatePublisherBody {
  name: string;
  slug: string;
  domains?: string[];
}

interface ListPublishersQuery {
  page?: string;
  limit?: string;
  status?: 'active' | 'paused' | 'disabled';
}

export default async function publisherRoutes(fastify: FastifyInstance): Promise<void> {
  // List publishers
  fastify.get<{ Querystring: ListPublishersQuery }>(
    '/',
    async (request: FastifyRequest<{ Querystring: ListPublishersQuery }>, reply: FastifyReply) => {
      const { page = '1', limit = '10', status } = request.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      const allPublishers = db.select().from(publishers).all();

      return {
        publishers: allPublishers,
        total: allPublishers.length,
      };
    }
  );

  // Get single publisher
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      validateUUID(id, 'Publisher ID');

      const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();

      if (!publisher) {
        return reply.code(404).send({ error: 'Publisher not found' });
      }

      return publisher;
    }
  );
}
```

## Best Practices

1. **Be Consistent**: Follow the conventions consistently across the entire codebase
2. **Be Descriptive**: Use clear, descriptive names that indicate purpose and type
3. **Avoid Abbreviations**: Use full words unless the abbreviation is universally understood (e.g., `id`, `url`, `api`)
4. **Use TypeScript**: Leverage TypeScript's type system to enforce naming conventions
5. **Document Exceptions**: If you need to deviate from conventions, document why

## Common Anti-Patterns to Avoid

```typescript
// ❌ Bad: Hungarian notation
const strName = 'John';
const arrUsers = [];
const objConfig = {};

// ✅ Good: Descriptive names with proper types
const name: string = 'John';
const users: User[] = [];
const config: Config = {};

// ❌ Bad: Single-letter variables (except in loops)
const d = new Date();
const u = getUser();

// ✅ Good: Descriptive names
const currentDate = new Date();
const user = getUser();

// ❌ Bad: Ambiguous abbreviations
const pub = getPublisher();
const cfg = loadConfig();

// ✅ Good: Full words
const publisher = getPublisher();
const config = loadConfig();

// ❌ Bad: Mixing conventions
const user_name = 'John';
const UserAge = 25;
const IS_ACTIVE = true;

// ✅ Good: Consistent camelCase for variables
const userName = 'John';
const userAge = 25;
const isActive = true;
```

## References

- [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

**Last Updated**: 2026-02-01
**Version**: 1.0.0
