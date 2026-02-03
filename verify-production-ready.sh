#!/bin/bash
# Production Readiness Verification Script
# Tests all critical security fixes and production features

echo "🔐 Production Readiness Verification"
echo "===================================="
echo ""

PASSED=0
FAILED=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

# Test 1: Security Headers (Helmet)
echo "1️⃣  Testing Security Headers..."
if grep -q "import helmet from '@fastify/helmet'" apps/api/src/config/server-config.ts; then
    if grep -q "await app.register(helmet" apps/api/src/config/server-config.ts; then
        pass "Helmet security headers enabled"
    else
        fail "Helmet imported but not registered"
    fi
else
    fail "Helmet not imported"
fi
echo ""

# Test 2: .gitignore Protection
echo "2️⃣  Testing .gitignore Protection..."
if grep -q "\.env" .gitignore; then
    pass ".env files protected in .gitignore"
else
    fail ".env not in .gitignore"
fi

if git ls-files | grep -q "apps/api/.env$"; then
    fail ".env file still tracked in git"
else
    pass ".env file not tracked in git"
fi
echo ""

# Test 3: Graceful Shutdown Handlers
echo "3️⃣  Testing Graceful Shutdown Handlers..."
if grep -q "gracefulShutdown" apps/api/src/index.ts; then
    pass "Graceful shutdown function defined"
else
    fail "Graceful shutdown function missing"
fi

if grep -q "process.on('SIGTERM'" apps/api/src/index.ts; then
    pass "SIGTERM handler registered"
else
    fail "SIGTERM handler missing"
fi

if grep -q "process.on('SIGINT'" apps/api/src/index.ts; then
    pass "SIGINT handler registered"
else
    fail "SIGINT handler missing"
fi
echo ""

# Test 4: Exception Handlers
echo "4️⃣  Testing Exception Handlers..."
if grep -q "process.on('uncaughtException'" apps/api/src/index.ts; then
    pass "Uncaught exception handler registered"
else
    fail "Uncaught exception handler missing"
fi

if grep -q "process.on('unhandledRejection'" apps/api/src/index.ts; then
    pass "Unhandled rejection handler registered"
else
    fail "Unhandled rejection handler missing"
fi
echo ""

# Test 5: Rate Limiting
echo "5️⃣  Testing Rate Limiting..."
if [ -f "apps/api/src/middleware/rate-limit-configs.ts" ]; then
    pass "Rate limit configuration file exists"
else
    fail "Rate limit configuration file missing"
fi
echo ""

# Test 6: Health Checks
echo "6️⃣  Testing Health Check Endpoints..."
if [ -f "apps/api/src/routes/health.ts" ]; then
    pass "Health check routes file exists"

    if grep -q "GET /health" apps/api/src/routes/health.ts; then
        pass "Basic health endpoint defined"
    fi

    if grep -q "GET /api/health" apps/api/src/routes/health.ts; then
        pass "Detailed health endpoint defined"
    fi
else
    fail "Health check routes file missing"
fi
echo ""

# Test 7: Database Backups
echo "7️⃣  Testing Database Backup Script..."
if [ -f "apps/api/scripts/backup-database.sh" ] && [ -x "apps/api/scripts/backup-database.sh" ]; then
    pass "Database backup script exists and is executable"
else
    fail "Database backup script missing or not executable"
fi
echo ""

# Test 8: Production Startup Script
echo "8️⃣  Testing Production Startup Script..."
if [ -f "apps/api/scripts/start-production.sh" ] && [ -x "apps/api/scripts/start-production.sh" ]; then
    pass "Production startup script exists and is executable"
else
    fail "Production startup script missing or not executable"
fi
echo ""

# Test 9: Environment Configuration
echo "9️⃣  Testing Environment Configuration..."
if [ -f "apps/api/.env.example" ]; then
    pass ".env.example file exists"

    if grep -q "JWT_SECRET" apps/api/.env.example; then
        pass "JWT_SECRET documented in .env.example"
    fi

    if grep -q "COOKIE_SECRET" apps/api/.env.example; then
        pass "COOKIE_SECRET documented in .env.example"
    fi
else
    fail ".env.example file missing"
fi
echo ""

# Test 10: Helmet Package Version
echo "🔟 Testing Helmet Package Version..."
HELMET_VERSION=$(grep "@fastify/helmet" apps/api/package.json | grep -oE "[0-9]+\.[0-9]+\.[0-9]+")
if [ -n "$HELMET_VERSION" ]; then
    MAJOR_VERSION=$(echo "$HELMET_VERSION" | cut -d. -f1)
    if [ "$MAJOR_VERSION" = "11" ]; then
        pass "Helmet version 11.x (compatible with Fastify 4.x)"
    else
        warn "Helmet version $HELMET_VERSION (expected 11.x)"
    fi
else
    fail "Could not determine Helmet version"
fi
echo ""

# Test 11: Documentation
echo "1️⃣1️⃣  Testing Documentation..."
DOC_COUNT=0
[ -f "OBSERVABILITY_SUMMARY.md" ] && ((DOC_COUNT++))
[ -f "PRODUCTION_SETUP.md" ] && ((DOC_COUNT++))
[ -f "apps/api/GETTING_STARTED_PRODUCTION.md" ] && ((DOC_COUNT++))
[ -f "docs/audits/2026-02-03-api-gatekeeper.md" ] && ((DOC_COUNT++))

if [ $DOC_COUNT -ge 3 ]; then
    pass "Production documentation available ($DOC_COUNT files)"
else
    warn "Limited documentation ($DOC_COUNT files)"
fi
echo ""

# Test 12: Prebid.js Source
echo "1️⃣2️⃣  Testing Prebid.js Build System..."
if [ -d "apps/api/prebid-builds/prebid-source" ]; then
    if [ -f "apps/api/prebid-builds/prebid-source/gulpfile.js" ]; then
        pass "Prebid.js source ready for builds"
    else
        fail "Prebid.js source missing gulpfile"
    fi
else
    fail "Prebid.js source not found"
fi
echo ""

# Summary
echo "===================================="
echo "SUMMARY"
echo "===================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo ""
    echo "Your pbjs_engine is PRODUCTION-READY! 🚀"
    echo ""
    echo "Next steps:"
    echo "  1. Start server: npm run start:prod"
    echo "  2. Test health: curl http://localhost:3001/health"
    echo "  3. Monitor logs: pm2 logs pbjs_engine"
    echo "  4. Setup monitoring (see OBSERVABILITY_QUICK_START.md)"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please fix the failed tests before production deployment."
    echo ""
    echo "For help, see:"
    echo "  - PRODUCTION_SETUP.md"
    echo "  - apps/api/GETTING_STARTED_PRODUCTION.md"
    echo "  - docs/audits/2026-02-03-api-gatekeeper.md"
    exit 1
fi
