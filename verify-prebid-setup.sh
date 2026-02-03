#!/bin/bash
# Verify Prebid.js Build System Setup
# Run this to check if everything is ready for real builds

echo "🔍 Verifying Prebid.js Build System Setup"
echo "=========================================="
echo ""

# Check Prebid.js source directory
echo "1️⃣  Checking Prebid.js source..."
if [ -d "apps/api/prebid-builds/prebid-source" ]; then
    echo "✅ Prebid.js source directory exists"

    if [ -f "apps/api/prebid-builds/prebid-source/gulpfile.js" ]; then
        echo "✅ Gulpfile found"
    else
        echo "❌ Gulpfile missing - clone Prebid.js repo"
        exit 1
    fi

    if [ -d "apps/api/prebid-builds/prebid-source/node_modules" ]; then
        echo "✅ Dependencies installed"
    else
        echo "⚠️  Dependencies not installed"
        echo "   Run: cd apps/api/prebid-builds/prebid-source && npm install"
    fi
else
    echo "❌ Prebid.js source not found"
    echo ""
    echo "To fix, run:"
    echo "  cd apps/api/prebid-builds"
    echo "  git clone https://github.com/prebid/Prebid.js.git prebid-source"
    echo "  cd prebid-source"
    echo "  npm install"
    exit 1
fi

echo ""

# Check output directory
echo "2️⃣  Checking output directory..."
if [ -d "apps/api/prebid-builds/output" ]; then
    echo "✅ Output directory exists"

    FILE_COUNT=$(ls apps/api/prebid-builds/output/*.js 2>/dev/null | wc -l | tr -d ' ')
    if [ "$FILE_COUNT" -gt 0 ]; then
        echo "✅ Found $FILE_COUNT existing build(s)"
    else
        echo "⚠️  No builds yet (will be created on demand)"
    fi
else
    echo "⚠️  Output directory doesn't exist (will be created automatically)"
fi

echo ""

# Check if gulp works
echo "3️⃣  Testing Gulp installation..."
cd apps/api/prebid-builds/prebid-source
if npx gulp --version > /dev/null 2>&1; then
    GULP_VERSION=$(npx gulp --version 2>/dev/null | head -1)
    echo "✅ Gulp is working: $GULP_VERSION"
else
    echo "❌ Gulp not working"
    echo "   Try: npm install"
    exit 1
fi

cd ../../../..

echo ""

# Check module availability
echo "4️⃣  Checking available Prebid.js modules..."
BIDDER_COUNT=$(ls apps/api/prebid-builds/prebid-source/modules/*BidAdapter.js 2>/dev/null | wc -l | tr -d ' ')
MODULE_COUNT=$(ls apps/api/prebid-builds/prebid-source/modules/*.js 2>/dev/null | wc -l | tr -d ' ')

if [ "$BIDDER_COUNT" -gt 0 ]; then
    echo "✅ Found $BIDDER_COUNT bidder adapters"
    echo "✅ Found $MODULE_COUNT total modules"
else
    echo "❌ No modules found"
    exit 1
fi

echo ""

# Test a simple build
echo "5️⃣  Testing build system (this takes 30-60 seconds)..."
echo "   Building minimal Prebid.js bundle..."

cd apps/api/prebid-builds/prebid-source

# Try a minimal build to verify it works
if timeout 90 npx gulp build-bundle-prod --modules rubiconBidAdapter > /tmp/prebid-test-build.log 2>&1; then
    if [ -f "build/dist/prebid.js" ]; then
        BUILD_SIZE=$(wc -c < build/dist/prebid.js)
        BUILD_SIZE_KB=$((BUILD_SIZE / 1024))
        echo "✅ Test build successful (${BUILD_SIZE_KB}KB)"

        # Verify it's a real build (should be >100KB)
        if [ "$BUILD_SIZE" -gt 100000 ]; then
            echo "✅ Build size confirms real Prebid.js (>100KB)"
        else
            echo "⚠️  Build seems small - may not be complete"
        fi

        # Clean up test build
        rm -rf build/dist/prebid.js
    else
        echo "❌ Build ran but no output file"
        echo "   Last 20 lines of log:"
        tail -20 /tmp/prebid-test-build.log
        exit 1
    fi
else
    echo "❌ Build failed or timed out after 90 seconds"
    echo "   Last 20 lines of log:"
    tail -20 /tmp/prebid-test-build.log
    exit 1
fi

cd ../../../..

echo ""
echo "=========================================="
echo "✅ All checks passed! Ready for real builds"
echo ""
echo "Next steps:"
echo "  1. Start the API server: npm run dev"
echo "  2. Trigger a build by adding a module to a publisher"
echo "  3. Run: ./test-real-build.sh"
