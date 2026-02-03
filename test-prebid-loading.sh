#!/bin/bash
# Test Prebid.js Dynamic Loading Implementation
# Run this after starting the dev server

API_URL="http://localhost:3001"
PUBLISHER_ID="" # Will be populated dynamically

echo "🧪 Testing Prebid.js Dynamic Loading Implementation"
echo "=================================================="
echo ""

# Get first publisher
echo "1️⃣  Getting publisher ID..."
PUBLISHER_ID=$(curl -s "$API_URL/api/publishers" | jq -r '.data[0].id')

if [ -z "$PUBLISHER_ID" ] || [ "$PUBLISHER_ID" = "null" ]; then
    echo "❌ No publishers found. Create one first."
    exit 1
fi

echo "✅ Found publisher: $PUBLISHER_ID"
echo ""

# Test build serving endpoint
echo "2️⃣  Testing build serving endpoint..."
BUILD_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/builds/$PUBLISHER_ID/prebid.js")
HTTP_CODE=$(echo "$BUILD_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
CONTENT=$(echo "$BUILD_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "404" ]; then
    echo "⚠️  No build available yet (expected)"
    echo "   Creating a build..."

    # Trigger a build via adding a module
    echo ""
    echo "3️⃣  Adding module to trigger build..."
    curl -s -X POST "$API_URL/api/publishers/$PUBLISHER_ID/modules" \
        -H "Content-Type: application/json" \
        -d '{"moduleCode": "consentManagement", "moduleName": "Consent Management"}' \
        > /dev/null

    echo "✅ Module added - build should be queued"
    echo "   Waiting 3 seconds for build to process..."
    sleep 3

    # Try again
    BUILD_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/builds/$PUBLISHER_ID/prebid.js")
    HTTP_CODE=$(echo "$BUILD_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    CONTENT=$(echo "$BUILD_RESPONSE" | sed '/HTTP_CODE/d')
fi

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Build endpoint working (HTTP 200)"

    # Check if content looks like JavaScript
    if echo "$CONTENT" | grep -q "function\|var\|const"; then
        echo "✅ Content appears to be JavaScript"

        # Get file size
        SIZE=$(echo -n "$CONTENT" | wc -c | tr -d ' ')
        SIZE_KB=$((SIZE / 1024))
        echo "   Bundle size: ${SIZE_KB}KB"
    else
        echo "⚠️  Content doesn't look like JavaScript"
    fi
else
    echo "❌ Build endpoint failed (HTTP $HTTP_CODE)"
    echo "   Response: $CONTENT"
fi

echo ""

# Test wrapper with embedded loader
echo "4️⃣  Testing wrapper with embedded Prebid.js loader..."
WRAPPER_CONTENT=$(curl -s "$API_URL/pb/$PUBLISHER_ID.js")

if echo "$WRAPPER_CONTENT" | grep -q "createElement.*script"; then
    echo "✅ Wrapper contains Prebid.js loader"
else
    echo "❌ Wrapper missing Prebid.js loader"
fi

if echo "$WRAPPER_CONTENT" | grep -q "window.__PB_CONFIG__"; then
    echo "✅ Wrapper contains embedded config"
else
    echo "❌ Wrapper missing embedded config"
fi

if echo "$WRAPPER_CONTENT" | grep -q "/builds/$PUBLISHER_ID/prebid.js"; then
    echo "✅ Wrapper loads custom build URL"
else
    echo "❌ Wrapper doesn't reference custom build"
fi

echo ""

# Test build info endpoint
echo "5️⃣  Testing build info endpoint..."
BUILD_INFO=$(curl -s "$API_URL/builds/$PUBLISHER_ID/info")
BUILD_AVAILABLE=$(echo "$BUILD_INFO" | jq -r '.available')

if [ "$BUILD_AVAILABLE" = "true" ]; then
    echo "✅ Build info available"
    VERSION=$(echo "$BUILD_INFO" | jq -r '.version')
    FILE_SIZE=$(echo "$BUILD_INFO" | jq -r '.fileSizeFormatted')
    echo "   Version: $VERSION"
    echo "   File size: $FILE_SIZE"
else
    echo "⚠️  No build info available"
fi

echo ""
echo "=================================================="
echo "✅ Prebid.js Dynamic Loading Tests Complete!"
echo ""
echo "Next steps:"
echo "  1. Open test-wrapper-embedded.html in browser"
echo "  2. Enter publisher ID: $PUBLISHER_ID"
echo "  3. Watch Network tab for Prebid.js load"
echo "  4. Verify auction initialization works"
