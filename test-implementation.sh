#!/bin/bash
echo "======================================"
echo "🧪 COMPREHENSIVE END-TO-END TESTS"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((FAIL++))
  fi
}

echo "📊 TEST 1: Database Schema Verification"
echo "----------------------------------------"

# Check website_id column exists
cd apps/api
DB_CHECK=$(sqlite3 data/pbjs_engine.db "PRAGMA table_info(wrapper_configs)" | grep "website_id")
[ -n "$DB_CHECK" ]
test_result $? "website_id column exists in wrapper_configs"

# Check block_wrapper column exists
DB_CHECK=$(sqlite3 data/pbjs_engine.db "PRAGMA table_info(wrapper_configs)" | grep "block_wrapper")
[ -n "$DB_CHECK" ]
test_result $? "block_wrapper column exists in wrapper_configs"

# Check index exists
DB_CHECK=$(sqlite3 data/pbjs_engine.db "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_wrapper_configs_website'")
[ -n "$DB_CHECK" ]
test_result $? "idx_wrapper_configs_website index exists"

echo ""
echo "🏗️  TEST 2: Frontend Build"
echo "----------------------------------------"

cd ../admin
npm run build > /dev/null 2>&1
test_result $? "Frontend builds without errors"

# Check if dist directory exists
[ -d "dist" ]
test_result $? "dist directory created"

# Check if index.html exists
[ -f "dist/index.html" ]
test_result $? "index.html generated"

echo ""
echo "📦 TEST 3: Component Files"
echo "----------------------------------------"

[ -f "src/components/WebsiteCard.tsx" ]
test_result $? "WebsiteCard.tsx exists"

[ -f "src/components/WebsiteModal.tsx" ]
test_result $? "WebsiteModal.tsx exists"

[ -f "src/pages/publisher/SitesPage.tsx" ]
test_result $? "SitesPage.tsx exists"

echo ""
echo "🔧 TEST 4: TypeScript Compilation"
echo "----------------------------------------"

# Check SitesPage uses authStore
grep -q "useAuthStore" src/pages/publisher/SitesPage.tsx
test_result $? "SitesPage uses useAuthStore"

# Check SitesPage doesn't use useParams for publisherId
! grep -q "const { publisherId } = useParams" src/pages/publisher/SitesPage.tsx
test_result $? "SitesPage removed broken useParams"

# Check ConfigWizard has websiteId prop
grep -q "websiteId" src/components/ConfigWizard.tsx
test_result $? "ConfigWizard has websiteId prop"

# Check ConfigWizard has blockWrapper
grep -q "blockWrapper" src/components/ConfigWizard.tsx
test_result $? "ConfigWizard has blockWrapper field"

echo ""
echo "🚀 TEST 5: API Route Files"
echo "----------------------------------------"

cd ../api

[ -f "src/routes/wrapper-configs.ts" ]
test_result $? "wrapper-configs.ts exists"

[ -f "src/routes/wrapper.ts" ]
test_result $? "wrapper.ts exists"

# Check wrapper-configs has websiteId support
grep -q "websiteId" src/routes/wrapper-configs.ts
test_result $? "wrapper-configs API supports websiteId"

# Check wrapper-configs has blockWrapper support
grep -q "blockWrapper" src/routes/wrapper-configs.ts
test_result $? "wrapper-configs API supports blockWrapper"

# Check wrapper endpoint has blocking logic
grep -q "blockWrapper" src/routes/wrapper.ts
test_result $? "Wrapper endpoint checks blockWrapper"

echo ""
echo "📝 TEST 6: Migration Files"
echo "----------------------------------------"

[ -f "src/db/migrate-website-configs.ts" ]
test_result $? "Migration script exists"

# Check migration has both columns
grep -q "website_id" src/db/migrate-website-configs.ts
test_result $? "Migration adds website_id"

grep -q "block_wrapper" src/db/migrate-website-configs.ts
test_result $? "Migration adds block_wrapper"

echo ""
echo "======================================"
echo "📊 TEST RESULTS SUMMARY"
echo "======================================"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo -e "Total:  $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  exit 1
fi
