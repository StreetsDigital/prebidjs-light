#!/bin/bash
# Test Real Prebid.js Build System
# This triggers a real Gulp build

API_URL="http://localhost:3001"

echo "🔨 Testing Real Prebid.js Build System"
echo "======================================"
echo ""

# Get first publisher
echo "1️⃣  Getting test publisher..."
PUBLISHER_INFO=$(curl -s "$API_URL/api/publishers")
PUBLISHER_ID=$(echo "$PUBLISHER_INFO" | jq -r '.data[0].id')
PUBLISHER_NAME=$(echo "$PUBLISHER_INFO" | jq -r '.data[0].name')

if [ -z "$PUBLISHER_ID" ] || [ "$PUBLISHER_ID" = "null" ]; then
    echo "❌ No publishers found"
    exit 1
fi

echo "✅ Found: $PUBLISHER_NAME ($PUBLISHER_ID)"
echo ""

# Add a module to trigger build
echo "2️⃣  Adding module to trigger real build..."
ADD_RESULT=$(curl -s -X POST "$API_URL/api/publishers/$PUBLISHER_ID/modules" \
    -H "Content-Type: application/json" \
    -d '{"moduleCode": "consentManagement", "moduleName": "Consent Management"}' 2>/dev/null)

if echo "$ADD_RESULT" | jq -e '.data' > /dev/null 2>&1; then
    echo "✅ Module added - real build queued"
else
    echo "⚠️  Module may already exist, checking builds..."
fi

echo ""

# Wait for build
echo "3️⃣  Waiting for build to complete (this takes 30-60 seconds for real Gulp build)..."
echo "   Progress indicators:"

for i in {1..60}; do
    BUILD_INFO=$(curl -s "$API_URL/builds/$PUBLISHER_ID/info")
    BUILD_STATUS=$(echo "$BUILD_INFO" | jq -r '.available')

    if [ "$BUILD_STATUS" = "true" ]; then
        echo ""
        echo "✅ Build completed!"

        VERSION=$(echo "$BUILD_INFO" | jq -r '.version')
        FILE_SIZE=$(echo "$BUILD_INFO" | jq -r '.fileSizeFormatted')

        echo "   Version: $VERSION"
        echo "   File size: $FILE_SIZE"

        # Verify it's a real build (should be >100KB for real Prebid.js)
        SIZE_BYTES=$(echo "$BUILD_INFO" | jq -r '.fileSize')
        if [ "$SIZE_BYTES" -gt 100000 ]; then
            echo "   ✅ Size indicates real Prebid.js build (>100KB)"
        else
            echo "   ⚠️  Size seems small (<100KB) - may still be mock build"
        fi

        break
    fi

    echo -n "."
    sleep 1
done

if [ "$i" -eq 60 ]; then
    echo ""
    echo "❌ Build timeout after 60 seconds"
    echo "   Check server logs for build errors"
    exit 1
fi

echo ""

# Test the build content
echo "4️⃣  Verifying build content..."
BUILD_CONTENT=$(curl -s "$API_URL/builds/$PUBLISHER_ID/prebid.js" | head -20)

if echo "$BUILD_CONTENT" | grep -q "Prebid.js"; then
    echo "✅ Build contains 'Prebid.js' signature"
else
    echo "⚠️  Build may not be real Prebid.js"
fi

if echo "$BUILD_CONTENT" | grep -q "pbjs"; then
    echo "✅ Build contains pbjs object"
else
    echo "❌ Build doesn't contain pbjs object"
fi

# Check if it has adapter code
if echo "$BUILD_CONTENT" | grep -q "registerBidder\|BidAdapter"; then
    echo "✅ Build contains bidder adapter code"
else
    echo "⚠️  Build may not have bidder adapters"
fi

echo ""

# Check actual build file on disk
echo "5️⃣  Checking build output directory..."
BUILD_FILES=$(ls apps/api/prebid-builds/output/ 2>/dev/null | wc -l | tr -d ' ')

if [ "$BUILD_FILES" -gt 0 ]; then
    echo "✅ Found $BUILD_FILES build file(s) in output directory"
    echo ""
    echo "   Recent builds:"
    ls -lht apps/api/prebid-builds/output/ | head -5 | tail -4
else
    echo "❌ No build files found in output directory"
fi

echo ""
echo "======================================"
echo "✅ Real Build Test Complete!"
echo ""
echo "To verify in browser:"
echo "  1. Open test-wrapper-embedded.html"
echo "  2. Enter publisher ID: $PUBLISHER_ID"
echo "  3. Check Network tab for Prebid.js size"
echo "  4. Look for 'window.pbjs' object in console"
