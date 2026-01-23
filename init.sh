#!/bin/bash

# pbjs_engine - Prebid.js Wrapper Platform
# Development Environment Setup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  pbjs_engine - Development Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check for required tools
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed. Please install Node.js 20 LTS${NC}"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo -e "${RED}Node.js version 20+ required. Current: $(node -v)${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}npm is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ npm $(npm -v)${NC}"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Please install Docker${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker $(docker -v | cut -d' ' -f3 | tr -d ',')${NC}"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}Docker Compose is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker Compose available${NC}"

    echo ""
}

# Create project structure
create_structure() {
    echo -e "${YELLOW}Creating project structure...${NC}"

    # Root directories
    mkdir -p apps/admin/src/{components,pages,hooks,stores,utils,styles}
    mkdir -p apps/api/src/{routes,services,db,middleware,utils}
    mkdir -p apps/wrapper/src
    mkdir -p packages/shared/src
    mkdir -p docker
    mkdir -p scripts

    echo -e "${GREEN}✓ Project structure created${NC}"
    echo ""
}

# Setup Docker services
setup_docker() {
    echo -e "${YELLOW}Setting up Docker services...${NC}"

    # Create docker-compose.yml if it doesn't exist
    if [ ! -f "docker-compose.yml" ]; then
        cat > docker-compose.yml << 'DOCKER_COMPOSE'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: pbjs_postgres
    environment:
      POSTGRES_USER: pbjs
      POSTGRES_PASSWORD: pbjs_dev_password
      POSTGRES_DB: pbjs_engine
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pbjs"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: pbjs_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  clickhouse:
    image: clickhouse/clickhouse-server:latest
    container_name: pbjs_clickhouse
    environment:
      CLICKHOUSE_USER: pbjs
      CLICKHOUSE_PASSWORD: pbjs_dev_password
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: 1
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    healthcheck:
      test: ["CMD", "clickhouse-client", "--query", "SELECT 1"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
  clickhouse_data:
DOCKER_COMPOSE
        echo -e "${GREEN}✓ docker-compose.yml created${NC}"
    else
        echo -e "${GREEN}✓ docker-compose.yml already exists${NC}"
    fi

    echo ""
}

# Setup environment variables
setup_env() {
    echo -e "${YELLOW}Setting up environment variables...${NC}"

    if [ ! -f ".env" ]; then
        cat > .env << 'ENV_FILE'
# Database Configuration
DATABASE_URL=postgresql://pbjs:pbjs_dev_password@localhost:5432/pbjs_engine
REDIS_URL=redis://localhost:6379
CLICKHOUSE_URL=http://localhost:8123

# Authentication
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# API Configuration
API_PORT=3001
API_HOST=0.0.0.0

# Frontend Configuration
VITE_API_URL=http://localhost:3001

# Build Service
BUILD_OUTPUT_DIR=./builds
PREBID_VERSION=latest

# Analytics
ANALYTICS_BATCH_SIZE=100
ANALYTICS_FLUSH_INTERVAL=5000
ENV_FILE
        echo -e "${GREEN}✓ .env file created${NC}"
    else
        echo -e "${GREEN}✓ .env file already exists${NC}"
    fi

    echo ""
}

# Install dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"

    # Create root package.json if it doesn't exist
    if [ ! -f "package.json" ]; then
        cat > package.json << 'PACKAGE_JSON'
{
  "name": "pbjs-engine",
  "version": "1.0.0",
  "private": true,
  "description": "Prebid.js Wrapper Platform with Server-Managed Configurations",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev:docker && concurrently \"npm run dev:api\" \"npm run dev:admin\"",
    "dev:api": "npm -w apps/api run dev",
    "dev:admin": "npm -w apps/admin run dev",
    "dev:docker": "docker compose up -d",
    "build": "npm run build:api && npm run build:admin",
    "build:api": "npm -w apps/api run build",
    "build:admin": "npm -w apps/admin run build",
    "lint": "eslint . --ext .ts,.tsx",
    "test": "npm run test --workspaces --if-present",
    "db:migrate": "npm -w apps/api run db:migrate",
    "db:seed": "npm -w apps/api run db:seed",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "eslint": "^8.56.0",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
PACKAGE_JSON
        echo -e "${GREEN}✓ Root package.json created${NC}"
    fi

    # Create API package.json
    if [ ! -f "apps/api/package.json" ]; then
        cat > apps/api/package.json << 'API_PACKAGE'
{
  "name": "@pbjs-engine/api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "drizzle-kit migrate",
    "db:generate": "drizzle-kit generate",
    "db:seed": "tsx src/db/seed.ts",
    "test": "vitest"
  },
  "dependencies": {
    "@fastify/cors": "^9.0.1",
    "@fastify/jwt": "^8.0.0",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/cookie": "^9.3.1",
    "fastify": "^4.26.0",
    "drizzle-orm": "^0.29.3",
    "postgres": "^3.4.3",
    "ioredis": "^5.3.2",
    "@clickhouse/client": "^0.2.7",
    "zod": "^3.22.4",
    "bcryptjs": "^2.4.3",
    "nanoid": "^5.0.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20.11.5",
    "drizzle-kit": "^0.20.13",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.1"
  }
}
API_PACKAGE
        echo -e "${GREEN}✓ API package.json created${NC}"
    fi

    # Create Admin (Frontend) package.json
    if [ ! -f "apps/admin/package.json" ]; then
        cat > apps/admin/package.json << 'ADMIN_PACKAGE'
{
  "name": "@pbjs-engine/admin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.3",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.49.3",
    "@hookform/resolvers": "^3.3.4",
    "zod": "^3.22.4",
    "recharts": "^2.10.4",
    "@headlessui/react": "^1.7.18",
    "@heroicons/react": "^2.1.1",
    "clsx": "^2.1.0",
    "date-fns": "^3.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.12",
    "vitest": "^1.2.1"
  }
}
ADMIN_PACKAGE
        echo -e "${GREEN}✓ Admin package.json created${NC}"
    fi

    # Create Wrapper package.json
    if [ ! -f "apps/wrapper/package.json" ]; then
        cat > apps/wrapper/package.json << 'WRAPPER_PACKAGE'
{
  "name": "@pbjs-engine/wrapper",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "test": "vitest"
  },
  "dependencies": {},
  "devDependencies": {
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "terser-webpack-plugin": "^5.3.10",
    "typescript": "^5.3.3"
  }
}
WRAPPER_PACKAGE
        echo -e "${GREEN}✓ Wrapper package.json created${NC}"
    fi

    # Create shared package
    if [ ! -f "packages/shared/package.json" ]; then
        cat > packages/shared/package.json << 'SHARED_PACKAGE'
{
  "name": "@pbjs-engine/shared",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
SHARED_PACKAGE
        echo -e "${GREEN}✓ Shared package.json created${NC}"
    fi

    # Run npm install
    npm install

    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
}

# Start Docker services
start_services() {
    echo -e "${YELLOW}Starting Docker services...${NC}"

    docker compose up -d

    # Wait for services to be healthy
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    sleep 5

    # Check PostgreSQL
    until docker exec pbjs_postgres pg_isready -U pbjs > /dev/null 2>&1; do
        echo "Waiting for PostgreSQL..."
        sleep 2
    done
    echo -e "${GREEN}✓ PostgreSQL is ready${NC}"

    # Check Redis
    until docker exec pbjs_redis redis-cli ping > /dev/null 2>&1; do
        echo "Waiting for Redis..."
        sleep 2
    done
    echo -e "${GREEN}✓ Redis is ready${NC}"

    # Check ClickHouse
    until docker exec pbjs_clickhouse clickhouse-client --query "SELECT 1" > /dev/null 2>&1; do
        echo "Waiting for ClickHouse..."
        sleep 2
    done
    echo -e "${GREEN}✓ ClickHouse is ready${NC}"

    echo ""
}

# Create TypeScript configuration
setup_typescript() {
    echo -e "${YELLOW}Setting up TypeScript...${NC}"

    # Root tsconfig
    if [ ! -f "tsconfig.json" ]; then
        cat > tsconfig.json << 'TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
TSCONFIG
        echo -e "${GREEN}✓ Root tsconfig.json created${NC}"
    fi

    # API tsconfig
    if [ ! -f "apps/api/tsconfig.json" ]; then
        cat > apps/api/tsconfig.json << 'API_TSCONFIG'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
API_TSCONFIG
        echo -e "${GREEN}✓ API tsconfig.json created${NC}"
    fi

    # Admin tsconfig
    if [ ! -f "apps/admin/tsconfig.json" ]; then
        cat > apps/admin/tsconfig.json << 'ADMIN_TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
ADMIN_TSCONFIG
        echo -e "${GREEN}✓ Admin tsconfig.json created${NC}"
    fi

    # Admin tsconfig.node.json
    if [ ! -f "apps/admin/tsconfig.node.json" ]; then
        cat > apps/admin/tsconfig.node.json << 'ADMIN_TSCONFIG_NODE'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
ADMIN_TSCONFIG_NODE
        echo -e "${GREEN}✓ Admin tsconfig.node.json created${NC}"
    fi

    echo ""
}

# Setup Tailwind CSS
setup_tailwind() {
    echo -e "${YELLOW}Setting up Tailwind CSS...${NC}"

    # Tailwind config
    if [ ! -f "apps/admin/tailwind.config.js" ]; then
        cat > apps/admin/tailwind.config.js << 'TAILWIND_CONFIG'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
TAILWIND_CONFIG
        echo -e "${GREEN}✓ tailwind.config.js created${NC}"
    fi

    # PostCSS config
    if [ ! -f "apps/admin/postcss.config.js" ]; then
        cat > apps/admin/postcss.config.js << 'POSTCSS_CONFIG'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
POSTCSS_CONFIG
        echo -e "${GREEN}✓ postcss.config.js created${NC}"
    fi

    # Create base CSS
    if [ ! -f "apps/admin/src/styles/index.css" ]; then
        cat > apps/admin/src/styles/index.css << 'BASE_CSS'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors;
  }

  .btn-secondary {
    @apply bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200;
  }

  .input {
    @apply border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600;
  }
}
BASE_CSS
        echo -e "${GREEN}✓ Base CSS created${NC}"
    fi

    echo ""
}

# Setup Vite
setup_vite() {
    echo -e "${YELLOW}Setting up Vite...${NC}"

    if [ ! -f "apps/admin/vite.config.ts" ]; then
        cat > apps/admin/vite.config.ts << 'VITE_CONFIG'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
VITE_CONFIG
        echo -e "${GREEN}✓ vite.config.ts created${NC}"
    fi

    # Create index.html
    if [ ! -f "apps/admin/index.html" ]; then
        cat > apps/admin/index.html << 'INDEX_HTML'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>pbjs_engine - Admin Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
INDEX_HTML
        echo -e "${GREEN}✓ index.html created${NC}"
    fi

    echo ""
}

# Print success message and next steps
print_success() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Setup Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}Services running:${NC}"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis:      localhost:6379"
    echo "  - ClickHouse: localhost:8123"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Run database migrations: npm run db:migrate"
    echo "  2. Seed the database:       npm run db:seed"
    echo "  3. Start development:       npm run dev"
    echo ""
    echo -e "${BLUE}Available commands:${NC}"
    echo "  npm run dev          - Start all dev servers"
    echo "  npm run dev:api      - Start API server only"
    echo "  npm run dev:admin    - Start Admin UI only"
    echo "  npm run build        - Build all packages"
    echo "  npm run docker:up    - Start Docker services"
    echo "  npm run docker:down  - Stop Docker services"
    echo "  npm run docker:logs  - View Docker logs"
    echo ""
    echo -e "${BLUE}Access:${NC}"
    echo "  Admin Dashboard: http://localhost:3000"
    echo "  API Server:      http://localhost:3001"
    echo ""
}

# Main execution
main() {
    check_requirements
    create_structure
    setup_docker
    setup_env
    setup_typescript
    setup_tailwind
    setup_vite
    install_dependencies
    start_services
    print_success
}

# Run main function
main
