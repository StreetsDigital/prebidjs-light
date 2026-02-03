#!/bin/bash

echo "🐛 BUG HUNTING - Code & Database Analysis"
echo "=========================================="
echo ""

cd /Users/andrewstreets/prebidjs-light

echo "✅ VERIFYING IMPLEMENTATION"
echo "---------------------------"

# 1. Check all new files exist
echo -n "1. WebsiteCard component exists... "
[ -f "apps/admin/src/components/WebsiteCard.tsx" ] && echo "✓" || echo "❌"

echo -n "2. WebsiteModal component exists... "
[ -f "apps/admin/src/components/WebsiteModal.tsx" ] && echo "✓" || echo "❌"

echo -n "3. Migration script exists... "
[ -f "apps/api/src/db/migrate-website-configs.ts" ] && echo "✓" || echo "❌"

# 2. Check database schema
echo ""
echo -n "4. Database has website_id column... "
RESULT=$(cd apps/api && sqlite3 data/pbjs_engine.db "PRAGMA table_info(wrapper_configs)" | grep "website_id")
[ -n "$RESULT" ] && echo "✓" || echo "❌"

echo -n "5. Database has block_wrapper column... "
RESULT=$(cd apps/api && sqlite3 data/pbjs_engine.db "PRAGMA table_info(wrapper_configs)" | grep "block_wrapper")
[ -n "$RESULT" ] && echo "✓" || echo "❌"

# 3. Check code integration
echo ""
echo "🔍 CHECKING CODE INTEGRATION"
echo "-----------------------------"

echo -n "6. SitesPage imports WebsiteCard... "
grep -q "WebsiteCard" apps/admin/src/pages/publisher/SitesPage.tsx && echo "✓" || echo "❌"

echo -n "7. SitesPage imports WebsiteModal... "
grep -q "WebsiteModal" apps/admin/src/pages/publisher/SitesPage.tsx && echo "✓" || echo "❌"

echo -n "8. SitesPage uses authStore... "
grep -q "useAuthStore" apps/admin/src/pages/publisher/SitesPage.tsx && echo "✓" || echo "❌"

echo -n "9. ConfigWizard has websiteId prop... "
grep -q "websiteId" apps/admin/src/components/ConfigWizard.tsx && echo "✓" || echo "❌"

echo -n "10. ConfigWizard has blockWrapper field... "
grep -q "blockWrapper" apps/admin/src/components/ConfigWizard.tsx && echo "✓" || echo "❌"

# 4. Check API routes
echo ""
echo "🔌 CHECKING API INTEGRATION"
echo "----------------------------"

echo -n "11. wrapper-configs supports websiteId... "
grep -q "websiteId" apps/api/src/routes/wrapper-configs.ts && echo "✓" || echo "❌"

echo -n "12. wrapper-configs supports blockWrapper... "
grep -q "blockWrapper" apps/api/src/routes/wrapper-configs.ts && echo "✓" || echo "❌"

echo -n "13. Wrapper endpoint checks blocking... "
grep -q "blockWrapper" apps/api/src/routes/wrapper.ts && echo "✓" || echo "❌"

# 5. Check for potential bugs
echo ""
echo "🐞 POTENTIAL BUG DETECTION"
echo "--------------------------"

# Check for TODO/FIXME/BUG comments in new code
echo -n "14. Checking for TODO/FIXME in WebsiteCard... "
TODOS=$(grep -i "todo\|fixme\|bug\|hack" apps/admin/src/components/WebsiteCard.tsx | wc -l)
if [ "$TODOS" -gt 0 ]; then
  echo "⚠️  Found $TODOS comments"
  grep -n -i "todo\|fixme\|bug\|hack" apps/admin/src/components/WebsiteCard.tsx
else
  echo "✓"
fi

# Check for console.log (should use proper logging)
echo -n "15. Checking for console.log in new components... "
LOGS=$(grep "console\." apps/admin/src/components/Website*.tsx 2>/dev/null | wc -l)
if [ "$LOGS" -gt 0 ]; then
  echo "⚠️  Found $LOGS console statements"
else
  echo "✓"
fi

# Check for any 'any' types in new code
echo -n "16. Checking for 'any' types in new files... "
ANYS=$(grep ": any" apps/admin/src/components/Website*.tsx apps/api/src/db/migrate*.ts 2>/dev/null | wc -l)
if [ "$ANYS" -gt 0 ]; then
  echo "⚠️  Found $ANYS 'any' types"
else
  echo "✓"
fi

# Check for error handling
echo -n "17. WebsiteCard has error handling... "
grep -q "catch\|try" apps/admin/src/components/WebsiteCard.tsx && echo "✓" || echo "❌ No error handling"

echo -n "18. WebsiteModal has error handling... "
grep -q "catch\|try" apps/admin/src/components/WebsiteModal.tsx && echo "✓" || echo "❌ No error handling"

# Check TypeScript compilation
echo ""
echo "📦 BUILD VERIFICATION"
echo "---------------------"

echo "19. Checking if frontend builds..."
cd apps/admin
npm run build > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
  echo "✓ Frontend builds successfully"
else
  echo "❌ Frontend build failed"
  tail -20 /tmp/build.log
fi

echo ""
echo "🏁 Bug Hunting Summary"
echo "======================"
echo "All structural checks complete!"
echo "Review warnings above for potential improvements."
