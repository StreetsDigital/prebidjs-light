# Prebid.js Integration Guide
**Complete guide for integrating Display, Video, Native, and other ad formats**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Display Ads](#display-ads)
3. [Video Ads](#video-ads)
4. [Native Ads](#native-ads)
5. [Multi-Format Implementation](#multi-format-implementation)
6. [Advanced Configuration](#advanced-configuration)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Basic Wrapper Integration

```html
<!-- Add the pbjs_engine wrapper to your site -->
<script src="https://your-cdn.com/pb.min.js" async></script>
<script>
  window.pb = window.pb || { que: [] };
  window.pb.que.push(function() {
    pb.init().then(() => {
      console.log('Prebid wrapper ready!');
    });
  });
</script>
```

### Configuration

All ad unit configuration is managed through the pbjs_engine admin panel:
1. Login to admin panel
2. Navigate to your publisher
3. Go to "Ad Units" tab
4. Create ad units for each placement

---

## Display Ads

### Standard Display Banner

**Admin Panel Configuration:**
```
Ad Unit Name: Header Banner
Code: header-banner-728x90
Sizes: 728x90, 970x90
Media Types: banner
```

**HTML Implementation:**
```html
<div id="header-banner-728x90">
  <!-- Ad will render here -->
</div>

<script>
  window.pb = window.pb || { que: [] };
  window.pb.que.push(function() {
    pb.init().then(() => {
      // Request bids for this ad unit
      pb.refresh(['header-banner-728x90']);
    });
  });
</script>
```

### Responsive Display

**Admin Panel Configuration:**
```
Ad Unit Name: Responsive Sidebar
Code: sidebar-responsive
Sizes: 300x250, 300x600, 160x600
Media Types: banner
Size Mapping:
  - Viewport 0x0: 300x250
  - Viewport 768x0: 300x250, 300x600
  - Viewport 1024x0: 300x250, 300x600, 160x600
```

**HTML Implementation:**
```html
<div id="sidebar-responsive">
  <!-- Responsive ad -->
</div>

<script>
  window.pb.que.push(function() {
    pb.refresh(['sidebar-responsive']);
  });
</script>
```

### Multi-Size Ad Units

**Admin Panel Configuration:**
```
Code: multisize-ad
Sizes:
  - 300x250
  - 336x280
  - 300x600
Media Types: banner
```

**Implementation:**
```html
<div id="multisize-ad">
  <!-- Ad server will choose best size -->
</div>

<script>
  window.pb.que.push(function() {
    pb.refresh(['multisize-ad']);
  });
</script>
```

---

## Video Ads

### Instream Video

**Admin Panel Configuration:**
```
Ad Unit Name: Pre-Roll Video
Code: preroll-video
Media Types: video
Video Config:
  - Player Size: 640x480
  - Context: instream
  - MIME Types: video/mp4, video/webm
  - Protocols: 2, 3, 5, 6
  - Playback Methods: 1, 2
  - Min Duration: 5
  - Max Duration: 30
```

**HTML Implementation:**
```html
<div id="video-player-container">
  <video id="video-player" controls width="640" height="480">
    <source src="your-content.mp4" type="video/mp4">
  </video>
</div>

<script>
  window.pb.que.push(function() {
    pb.init().then(() => {
      // Request bids for video ad unit
      pb.refresh(['preroll-video']).then(() => {
        // Integrate with your video player
        // Example: Google IMA, Video.js, JW Player
        loadVideoAd('preroll-video');
      });
    });
  });

  function loadVideoAd(adUnitCode) {
    // Your video player integration logic
    const adTagUrl = pb.getAdTagUrl(adUnitCode);
    videoPlayer.loadAd(adTagUrl);
  }
</script>
```

### Outstream Video

**Admin Panel Configuration:**
```
Code: outstream-video
Media Types: video
Video Config:
  - Player Size: 640x480
  - Context: outstream
  - MIME Types: video/mp4
  - Protocols: 2, 3, 5, 6
  - Playback Methods: 1, 2
```

**Implementation:**
```html
<div id="outstream-video">
  <!-- Video player will be inserted here -->
</div>

<script>
  window.pb.que.push(function() {
    pb.refresh(['outstream-video']).then(() => {
      // Outstream player renders automatically
    });
  });
</script>
```

### Video Ad Pods (Long-Form)

**Admin Panel Configuration:**
```
Code: adpod-midroll
Media Types: video
Video Config:
  - Context: adpod
  - Player Size: 1920x1080
  - Ad Pod Duration: 90 (seconds)
  - Max Ads: 3
```

---

## Native Ads

### Standard Native

**Admin Panel Configuration:**
```
Ad Unit Name: In-Feed Native
Code: infeed-native
Media Types: native
Native Config:
  Title:
    - Required: true
    - Max Length: 25
  Image:
    - Required: true
    - Sizes: 1200x627
  Icon:
    - Sizes: 50x50
  Body:
    - Max Length: 140
  Sponsored By:
    - Required: true
    - Max Length: 25
  CTA:
    - Required: true
```

**HTML Implementation:**
```html
<div id="infeed-native">
  <!-- Native ad template -->
</div>

<script>
  window.pb.que.push(function() {
    pb.refresh(['infeed-native']).then(() => {
      renderNativeAd('infeed-native');
    });
  });

  function renderNativeAd(adUnitCode) {
    const nativeAd = pb.getNativeAd(adUnitCode);

    if (nativeAd) {
      const template = `
        <div class="native-ad">
          <div class="native-ad__image">
            <img src="${nativeAd.image.url}" alt="${nativeAd.title}">
          </div>
          <div class="native-ad__content">
            <h3>${nativeAd.title}</h3>
            <p>${nativeAd.body}</p>
            <div class="native-ad__footer">
              <span class="native-ad__sponsor">${nativeAd.sponsoredBy}</span>
              <a href="${nativeAd.clickUrl}" class="native-ad__cta">
                ${nativeAd.cta}
              </a>
            </div>
          </div>
        </div>
      `;

      document.getElementById(adUnitCode).innerHTML = template;

      // Track impressions
      if (nativeAd.impressionTrackers) {
        nativeAd.impressionTrackers.forEach(url => {
          new Image().src = url;
        });
      }
    }
  }
</script>

<style>
  .native-ad {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    font-family: Arial, sans-serif;
  }

  .native-ad__image img {
    width: 100%;
    border-radius: 4px;
  }

  .native-ad__content h3 {
    margin: 12px 0 8px;
    font-size: 18px;
  }

  .native-ad__sponsor {
    font-size: 12px;
    color: #666;
  }

  .native-ad__cta {
    background: #007bff;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    text-decoration: none;
    float: right;
  }
</style>
```

### Native with Video

**Admin Panel Configuration:**
```
Code: native-video
Media Types: native
Native Config:
  Title: Required
  Main Image: Required (1200x627)
  Video:
    - Required: true
    - Min Duration: 5
    - Max Duration: 30
    - MIME Types: video/mp4
  Sponsored By: Required
```

---

## Multi-Format Implementation

### Display + Native

**Admin Panel Configuration:**
```
Code: multiformat-sidebar
Media Types: banner, native
Sizes: 300x250, 300x600
Native Config: (as above)
```

**Implementation:**
```html
<div id="multiformat-sidebar">
  <!-- Renders either banner or native -->
</div>

<script>
  window.pb.que.push(function() {
    pb.refresh(['multiformat-sidebar']).then(response => {
      const adUnit = response['multiformat-sidebar'];

      if (adUnit.mediaType === 'native') {
        renderNativeAd('multiformat-sidebar');
      } else {
        // Banner renders automatically
      }
    });
  });
</script>
```

### Display + Video + Native (All Formats)

**Admin Panel Configuration:**
```
Code: universal-ad-slot
Media Types: banner, video, native
Banner Sizes: 300x250, 728x90
Video Config: outstream
Native Config: standard
```

---

## Advanced Configuration

### Lazy Loading

```javascript
// Load ads only when they come into view
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const adUnitCode = entry.target.id;
      window.pb.que.push(function() {
        pb.refresh([adUnitCode]);
      });
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

// Observe all ad slots
document.querySelectorAll('.ad-slot').forEach(el => {
  observer.observe(el);
});
```

### Refresh on User Interaction

```javascript
// Refresh ads every 30 seconds when tab is active
let refreshInterval;

function startAutoRefresh() {
  refreshInterval = setInterval(() => {
    if (!document.hidden) {
      window.pb.refresh(); // Refresh all ad units
    }
  }, 30000);
}

function stopAutoRefresh() {
  clearInterval(refreshInterval);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAutoRefresh();
  } else {
    startAutoRefresh();
  }
});

startAutoRefresh();
```

### Custom Targeting

```javascript
window.pb.que.push(function() {
  // Set page-level targeting
  pb.setConfig({
    targeting: {
      content_category: 'sports',
      page_type: 'article',
      article_id: '12345'
    }
  });

  // Set user-level targeting
  pb.setUserConfig({
    age_range: '25-34',
    gender: 'f',
    interests: ['sports', 'technology']
  });

  pb.init().then(() => {
    pb.refresh();
  });
});
```

### Floor Prices

**Admin Panel Configuration:**
```
Ad Unit: premium-banner
Floor Price: 2.50 (USD)

Or use dynamic floors:
Floor Rules:
  - Device: desktop, Floor: 3.00
  - Device: mobile, Floor: 1.50
  - Geo: US, Floor: 4.00
  - Geo: GB, Floor: 3.50
```

### A/B Testing

```javascript
// A/B test different timeout values
window.pb.que.push(function() {
  const variant = Math.random() < 0.5 ? 'A' : 'B';

  const config = {
    timeout: variant === 'A' ? 1000 : 1500
  };

  pb.setConfig(config);

  // Track variant for analytics
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'ab_test',
    test_name: 'timeout_test',
    variant: variant
  });

  pb.init().then(() => {
    pb.refresh();
  });
});
```

---

## Troubleshooting

### Debug Mode

```javascript
// Enable debug mode to see detailed logs
window.pb.que.push(function() {
  pb.setConfig({
    debug: true
  });

  pb.init();
});
```

### Check Bid Responses

```javascript
window.pb.que.push(function() {
  pb.refresh(['ad-unit-code']).then(response => {
    console.log('Bid response:', response);

    // Check if bids were received
    if (response['ad-unit-code'].bids.length > 0) {
      console.log('Winning bid:', response['ad-unit-code'].winner);
    } else {
      console.log('No bids received');
    }
  });
});
```

### Common Issues

#### 1. Ads Not Showing
- **Check:** Ad unit code matches exactly between admin panel and HTML
- **Check:** Bidders are configured for the publisher
- **Check:** Floor prices aren't too high
- **Check:** Browser console for errors

#### 2. Slow Loading
- **Solution:** Adjust timeout in wrapper config (default: 1500ms)
- **Solution:** Enable lazy loading for below-fold ads
- **Solution:** Reduce number of bidders

#### 3. Low Fill Rate
- **Check:** Increase number of bidders
- **Check:** Lower floor prices
- **Check:** Verify ad unit sizes are standard IAB sizes
- **Check:** Geographic targeting isn't too restrictive

#### 4. Video Not Playing
- **Check:** Video player is properly initialized
- **Check:** MIME types match your video player
- **Check:** Protocols are correct for your setup
- **Check:** Ad tag URL is being passed correctly

#### 5. Native Rendering Issues
- **Check:** All required native assets are configured
- **Check:** Impression trackers are being fired
- **Check:** Click tracking is implemented
- **Check:** CSS styles don't conflict with native ad layout

---

## Analytics & Monitoring

### Track Performance

```javascript
// Listen for bid events
window.pb.on('bidResponse', function(bid) {
  console.log('Bid received:', {
    bidder: bid.bidder,
    cpm: bid.cpm,
    adUnitCode: bid.adUnitCode,
    currency: bid.currency
  });

  // Send to your analytics
  analytics.track('bid_response', {
    bidder: bid.bidder,
    cpm: bid.cpm,
    ad_unit: bid.adUnitCode
  });
});

window.pb.on('bidWon', function(bid) {
  console.log('Bid won:', bid);

  analytics.track('bid_won', {
    bidder: bid.bidder,
    cpm: bid.cpm,
    ad_unit: bid.adUnitCode
  });
});

window.pb.on('bidTimeout', function(timedOutBids) {
  console.log('Bids timed out:', timedOutBids);

  analytics.track('bid_timeout', {
    bidders: timedOutBids.map(b => b.bidder),
    count: timedOutBids.length
  });
});
```

### Admin Panel Analytics

The pbjs_engine admin panel provides comprehensive analytics:
- **Revenue Dashboard**: Track CPM, revenue, impressions
- **Bidder Performance**: See which bidders perform best
- **Ad Unit Analysis**: Identify top-performing placements
- **Fill Rate Monitoring**: Track fill rates by bidder/ad unit
- **Latency Analysis**: Monitor bidder response times

---

## Best Practices

### Performance
- ✅ Use lazy loading for below-fold ads
- ✅ Set appropriate timeouts (1000-2000ms)
- ✅ Limit bidders to 8-10 per ad unit
- ✅ Use size mapping for responsive ads
- ✅ Implement refresh limits (max 5-10 per session)

### Revenue
- ✅ Use multiple bidders for competition
- ✅ Set floor prices based on historical data
- ✅ Test different timeout values
- ✅ Implement A/B testing
- ✅ Monitor and optimize regularly

### User Experience
- ✅ Use native ads for content feeds
- ✅ Limit ad refresh frequency
- ✅ Ensure ads are clearly labeled
- ✅ Don't oversaturate pages with ads
- ✅ Use appropriate ad sizes for device

### Compliance
- ✅ Implement GDPR/CCPA consent management
- ✅ Follow Google Ad Manager policies
- ✅ Use brand safety controls
- ✅ Implement proper cookie consent
- ✅ Include privacy policy links

---

## Support

For additional help:
- **Admin Panel**: Built-in help tooltips and guides
- **Auction Inspector**: Real-time debugging tool in admin panel
- **Yield Advisor**: AI-powered optimization recommendations
- **Documentation**: See other guides in the docs/ folder

---

**Version:** 1.0
**Last Updated:** 2026-02-02
