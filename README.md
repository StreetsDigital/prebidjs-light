# pbjs_engine

A lightweight Prebid.js wrapper platform that enables publishers to run header bidding with server-managed configurations.

## Overview

pbjs_engine provides:

- **Minified JS Wrapper**: Publishers receive a minified JS file with a unique identifier that fetches their config from your server
- **Admin Dashboard**: Full admin dashboard for managing publisher configs
- **Publisher Portal**: Self-service publisher portal for configuration management
- **Dynamic Bundling**: Dynamic Prebid module bundling based on publisher needs
- **Analytics Pipeline**: Real-time analytics capable of handling 1B+ impressions

The wrapper exposes a clean `pb` namespace for publishers while providing access to the underlying `pbjs` object for advanced users.

## Technology Stack

### Frontend
- React 18 with Vite
- Tailwind CSS
- Zustand (state management)
- Recharts (analytics dashboards)
- React Hook Form with Zod validation
- Headless UI components

### Backend
- Node.js 20 LTS
- Fastify framework
- SQLite (config, users, publishers)
- Drizzle ORM

### Build Service
- Webpack 5 for dynamic Prebid.js compilation
- Per-publisher optimized builds

## Prerequisites

- Node.js 20 LTS or higher
- Docker and Docker Compose
- Git

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pbjs_engine
   ```

2. Install dependencies:
   ```bash
   npm install
   cd apps/api && npm install
   cd ../admin && npm install
   ```

3. Create super admin user:
   ```bash
   cd apps/api
   npm run db:seed-admin
   ```

4. Start development servers:
   ```bash
   npm run dev
   ```

The database is created automatically on first run. No separate database setup required.

## Project Structure

```
pbjs_engine/
├── apps/
│   ├── admin/          # React admin dashboard
│   ├── api/            # Fastify API server
│   └── wrapper/        # Publisher JS wrapper
├── packages/
│   └── shared/         # Shared types and utilities
├── docker/             # Docker configuration files
├── scripts/            # Build and deployment scripts
├── docker-compose.yml  # Docker Compose configuration
└── init.sh             # Development setup script
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all development servers |
| `npm run dev:api` | Start API server only |
| `npm run dev:admin` | Start Admin UI only |
| `npm run build` | Build all packages for production |
| `npm run db:seed-admin` | Create/verify super admin user |
| `npm run test` | Run all tests |
| `npm run lint` | Run linting |

## Services

When running in development mode:

| Service | URL |
|---------|-----|
| Admin Dashboard | http://localhost:5173 |
| API Server | http://localhost:3001 |
| Database | SQLite (apps/api/data/pbjs_engine.db) |

## User Roles

- **Super Admin**: Full platform access - manage all publishers, users, system settings
- **Admin**: Staff access - manage assigned publishers only
- **Publisher**: Self-service access - manage own configuration and view analytics

## pb Namespace API

Publishers interact with the wrapper through the `pb` namespace:

```javascript
// Initialize and run auction
pb.init();

// Refresh specific ad slots
pb.refresh(['ad-unit-1', 'ad-unit-2']);

// Get current configuration
const config = pb.getConfig();

// Update configuration
pb.setConfig({ bidderTimeout: 2000 });

// Event listeners
pb.on('auctionEnd', (data) => console.log(data));

// Access underlying Prebid.js instance
const pbjs = pb.pbjs;

// Get version and publisher ID
console.log(pb.version, pb.publisherId);
```

## Environment Variables

Create a `.env` file in `apps/api/` (see `.env.example` for template):

```env
# Server Configuration
NODE_ENV=development
API_PORT=3001

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
COOKIE_SECRET=your-super-secret-cookie-key-change-this-in-production

# Super Admin Credentials
SUPER_ADMIN_EMAIL=admin@thenexusengine.com
SUPER_ADMIN_PASSWORD=ChangeMe123!
SUPER_ADMIN_NAME=Super Admin

# Database
DATABASE_PATH=./data/pbjs_engine.db

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

For frontend, create `.env` in `apps/admin/`:

```env
VITE_API_URL=http://localhost:3001
```

## Database Management

**IMPORTANT**: Database files are NOT tracked in git. See detailed documentation:

- [Database Management Guide](./docs/DATABASE_MANAGEMENT.md) - Complete database guide
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment procedures

### Quick Database Commands

```bash
# Create super admin user
cd apps/api && npm run db:seed-admin

# View database
cd apps/api/data
sqlite3 pbjs_engine.db

# Backup database
cp apps/api/data/pbjs_engine.db apps/api/data/pbjs_engine.db.backup-$(date +%Y%m%d-%H%M%S)
```

## Testing

The project includes comprehensive test suites:

```bash
# Run all tests
npm run test

# Run specific package tests
npm -w apps/api run test
npm -w apps/admin run test
```

## Documentation

- [Development Guidelines](./CLAUDE.md) - Complete development guide
- [Database Management](./docs/DATABASE_MANAGEMENT.md) - Database guide
- [Deployment Procedures](./docs/DEPLOYMENT.md) - Production deployment
- [Immediate Recovery](./docs/IMMEDIATE_RECOVERY.md) - Emergency recovery steps

## License

Proprietary - All rights reserved
