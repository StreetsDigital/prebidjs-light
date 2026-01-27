# pbjs_engine Publisher Wrapper

Lightweight JavaScript wrapper that publishers embed on their sites to load Prebid.js with server-managed configurations.

## Overview

The wrapper provides a simple `window.pb` API that:
- Fetches publisher-specific configuration from the pbjs_engine server
- Automatically loads and configures Prebid.js
- Handles ad unit management
- Sends analytics events back to the server

## Building

```bash
# Install dependencies
npm install

# Build minified production version
npm run build

# Build development version with readable output
npm run build:dev

# Watch mode for development
npm run dev

# Analyze bundle size
npm run analyze
```

## Output

- **Production:** `dist/pb.min.js` (~5-10 KB gzipped)
- **Source Map:** `dist/pb.min.js.map` (for debugging)
- **Development:** Readable, non-minified version

## Publisher Integration

Publishers include the wrapper on their pages:

### Option 1: Publisher-Specific Build (Recommended)
```html
<!-- Replace {PUBLISHER_API_KEY} with actual API key -->
<script src="https://cdn.pbjs-engine.com/pb/{PUBLISHER_API_KEY}.js" async></script>
<script>
  window.pb = window.pb || { que: [] };
  window.pb.que.push(function() {
    pb.init().then(function() {
      console.log('Prebid configured and ready!');
    });
  });
</script>
```

### Option 2: Generic Wrapper with Manual Config
```html
<script src="https://cdn.pbjs-engine.com/pb.min.js" async></script>
<script>
  window.pb = window.pb || { que: [] };
  window.pb._config = {
    publisherId: 'YOUR_PUBLISHER_ID',
    apiEndpoint: 'https://api.pbjs-engine.com'
  };

  window.pb.que.push(function() {
    pb.init().then(function() {
      console.log('Prebid ready!');
    });
  });
</script>
```

## API Reference

### `pb.init()`
Initializes Prebid.js with server-fetched configuration.

**Returns:** `Promise<void>`

**Example:**
```javascript
pb.init().then(() => {
  console.log('Ready!');
}).catch((err) => {
  console.error('Init failed:', err);
});
```

### `pb.refresh([adUnitCodes])`
Refreshes ad units and triggers a new auction.

**Parameters:**
- `adUnitCodes` (optional): Array of ad unit codes to refresh. If omitted, refreshes all.

**Example:**
```javascript
// Refresh all ad units
pb.refresh();

// Refresh specific units
pb.refresh(['header-banner', 'sidebar-ad']);
```

### `pb.getConfig()`
Returns the current Prebid configuration.

**Returns:** `Object`

**Example:**
```javascript
const config = pb.getConfig();
console.log('Bidder timeout:', config.prebidConfig.bidderTimeout);
```

### `pb.setConfig(config)`
Updates Prebid configuration at runtime.

**Parameters:**
- `config`: Partial configuration object

**Example:**
```javascript
pb.setConfig({
  bidderTimeout: 2000,
  debugMode: true
});
```

### `pb.on(event, callback)`
Subscribes to Prebid events.

**Parameters:**
- `event`: Event name (e.g., 'auctionEnd', 'bidWon')
- `callback`: Function to call when event fires

**Example:**
```javascript
pb.on('bidWon', (data) => {
  console.log('Bid won:', data);
});
```

### `pb.off(event, [callback])`
Unsubscribes from Prebid events.

**Parameters:**
- `event`: Event name
- `callback` (optional): Specific callback to remove. If omitted, removes all callbacks for the event.

**Example:**
```javascript
pb.off('bidWon', myCallback); // Remove specific callback
pb.off('bidWon'); // Remove all callbacks for bidWon
```

## Events

The wrapper automatically tracks and sends these events to the analytics server:

- `auctionInit` - Auction started
- `auctionEnd` - Auction completed
- `bidRequested` - Bid request sent to bidder
- `bidResponse` - Bid response received
- `bidWon` - Winning bid selected
- `bidTimeout` - Bidder timed out
- `noBid` - No bid from bidder
- `adRenderSucceeded` - Ad rendered successfully
- `adRenderFailed` - Ad render failed

## Configuration Caching

The wrapper caches server configuration in localStorage with a 5-minute TTL to reduce server requests.

**Cache Key:** `pb_config_cache_{publisherId}`

**TTL:** 5 minutes

To clear cache:
```javascript
localStorage.removeItem('pb_config_cache_' + pb.publisherId);
```

## Advanced Usage

### Custom Event Handling
```javascript
pb.on('auctionEnd', (auction) => {
  // Custom analytics
  console.log('Auction took:', auction.auctionEnd - auction.auctionStart, 'ms');
});
```

### Conditional Refresh
```javascript
// Refresh only if user is active
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    pb.refresh();
  }
});
```

### Debug Mode
```javascript
// Enable Prebid debug mode
pb.setConfig({ debug: true });
```

## Server Configuration Format

The wrapper expects this JSON format from `/c/{publisherId}` endpoint:

```json
{
  "publisherId": "pub_123",
  "websites": [
    {
      "id": "web_456",
      "domain": "example.com",
      "adUnits": [
        {
          "code": "header-banner",
          "mediaTypes": {
            "banner": {
              "sizes": [[728, 90], [970, 250]]
            }
          },
          "bids": [
            {
              "bidder": "appnexus",
              "params": { "placementId": "12345" }
            }
          ]
        }
      ]
    }
  ],
  "prebidConfig": {
    "bidderTimeout": 1500,
    "priceGranularity": "medium",
    "enableSendAllBids": true
  }
}
```

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

Uses modern JavaScript (ES2015) - transpile if older browser support needed.

## File Size

- **Uncompressed:** ~8 KB
- **Minified:** ~4 KB
- **Gzipped:** ~1.5 KB

## Development

### Watch Mode
```bash
npm run dev
```

### Analyze Bundle
```bash
npm run analyze
```

This generates `stats.json` and opens webpack-bundle-analyzer in your browser.

## Deployment

1. Build production bundle:
   ```bash
   npm run build
   ```

2. Upload `dist/pb.min.js` to CDN:
   ```bash
   aws s3 cp dist/pb.min.js s3://cdn.pbjs-engine.com/pb.min.js --acl public-read
   ```

3. Optionally upload source map for debugging:
   ```bash
   aws s3 cp dist/pb.min.js.map s3://cdn.pbjs-engine.com/pb.min.js.map --acl public-read
   ```

## Security Considerations

- HTTPS only for CDN delivery
- CORS headers properly configured on API server
- No sensitive data in wrapper (API key used only for config fetch)
- Content Security Policy compatible

## Troubleshooting

### Wrapper doesn't load
- Check script URL is correct
- Verify CORS headers on CDN
- Check browser console for errors

### Config not loading
- Verify publisher ID is correct
- Check API endpoint is accessible
- Clear localStorage cache

### Ads not showing
- Check ad unit codes match server config
- Verify GPT library is loaded
- Enable debug mode to see auction details

## License

Proprietary - pbjs_engine Platform
