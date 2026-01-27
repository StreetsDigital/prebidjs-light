import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface Publisher {
  id: string;
  slug: string;
  name: string;
}

export function GetCodePage() {
  const { user, token } = useAuthStore();
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'basic' | 'advanced'>('basic');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPublisher = async () => {
      if (!user?.publisherId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/publishers/${user.publisherId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPublisher(data.publisher);
        }
      } catch (err) {
        console.error('Failed to fetch publisher:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublisher();
  }, [user?.publisherId, token]);

  const publisherSlug = publisher?.slug || 'your-publisher-id';
  const apiEndpoint = window.location.origin;

  // Basic integration - simplest form
  const basicCode = `<!-- pbjs_engine Wrapper Script -->
<script src="${apiEndpoint}/pb.min.js" async></script>
<script>
  window.pb = window.pb || { que: [] };

  // Automatically initializes and loads configuration
  window.pb.que.push(function() {
    pb.init().then(function() {
      console.log('pbjs_engine ready!');
      // Your ad units are now configured and ready
    }).catch(function(err) {
      console.error('pbjs_engine initialization failed:', err);
    });
  });
</script>`;

  // Advanced integration - with event listeners and custom config
  const advancedCode = `<!-- pbjs_engine Wrapper Script -->
<script src="${apiEndpoint}/pb/${publisherSlug}.js" async></script>
<script>
  window.pb = window.pb || { que: [] };

  window.pb.que.push(function() {
    // Subscribe to events
    pb.on('pbReady', function(data) {
      console.log('pbjs_engine ready:', data);
    });

    pb.on('refreshRequested', function(data) {
      console.log('Ad refresh requested:', data);
    });

    pb.on('pbError', function(data) {
      console.error('pbjs_engine error:', data);
    });

    // Initialize
    pb.init().then(function() {
      var config = pb.getConfig();
      console.log('Loaded config:', config);

      // Optional: Override configuration at runtime
      // pb.setConfig({
      //   bidderTimeout: 2000,
      //   debugMode: true
      // });
    });
  });
</script>`;

  // Ad unit refresh example
  const adUnitExample = `<!-- Example: Refresh specific ad units -->
<script>
  window.pb = window.pb || { que: [] };

  window.pb.que.push(function() {
    pb.init().then(function() {
      // Refresh all ad units
      pb.refresh();

      // Or refresh specific ad units by code
      // pb.refresh(['header-banner', 'sidebar-ad']);
    });
  });
</script>`;

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const fullCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>pbjs_engine Integration - ${publisher?.name || publisherSlug}</title>

${basicCode}
</head>
<body>
  <h1>pbjs_engine Integration Example</h1>
  <p>Publisher: ${publisher?.name || publisherSlug}</p>
  <p>Publisher ID: ${publisherSlug}</p>

  <div style="margin: 20px 0; padding: 20px; background: #f0f0f0; border-radius: 8px;">
    <h2>Your ad units are now configured!</h2>
    <p>The wrapper automatically loads your server-managed configuration.</p>
    <p>Check the browser console for initialization logs.</p>
  </div>

  <!-- Ad Unit Containers -->
  <!-- Add your ad unit div containers here -->
  <!-- Example: <div id="header-banner"></div> -->

</body>
</html>`;

    const blob = new Blob([fullCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pbjs-engine-${publisherSlug}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Get Code</h1>
        <p className="mt-1 text-sm text-gray-500">
          Copy the integration code below to add pbjs_engine to your website.
        </p>
      </div>

      {/* Publisher Info */}
      {publisher && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Your Integration Details</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p><strong>Publisher:</strong> {publisher.name}</p>
                <p><strong>Publisher ID:</strong> <code className="bg-blue-100 px-1 rounded">{publisherSlug}</code></p>
                <p className="mt-2">Your configuration is managed on our servers. Just embed the wrapper script!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Start Guide */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-900">Quick Start</h3>
            <ol className="mt-2 text-sm text-gray-700 list-decimal list-inside space-y-1">
              <li>Copy the integration code from the tabs below</li>
              <li>Add the code to your website's &lt;head&gt; section</li>
              <li>The wrapper automatically loads your configuration from our server</li>
              <li>Your ad units will be configured and ready to serve</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Download Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Download Example File</h2>
            <p className="mt-1 text-sm text-gray-500">
              Download a complete HTML example with your publisher configuration.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Example HTML
          </button>
        </div>
      </div>

      {/* Code Tabs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              type="button"
              onClick={() => setSelectedTab('basic')}
              className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                selectedTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Basic Integration
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('advanced')}
              className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                selectedTab === 'advanced'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Advanced Integration
            </button>
          </nav>
        </div>

        <div className="p-4">
          {selectedTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">
                    Add this code to your page's <code className="bg-gray-100 px-1 rounded">&lt;head&gt;</code> section.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopy(basicCode)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 mr-1.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
                  <code>{basicCode}</code>
                </pre>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">What this does:</h4>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Loads the pbjs_engine wrapper script asynchronously</li>
                  <li>Initializes automatically with your server-managed configuration</li>
                  <li>Fetches your ad units, bidders, and settings from our API</li>
                  <li>Caches configuration in localStorage (5-minute TTL)</li>
                </ul>
              </div>
            </div>
          )}

          {selectedTab === 'advanced' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">
                    Advanced integration with event listeners and custom configuration.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopy(advancedCode)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 mr-1.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
                  <code>{advancedCode}</code>
                </pre>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Additional Features:</h4>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Uses publisher-specific URL: <code className="bg-white px-1 rounded">/pb/{publisherSlug}.js</code></li>
                  <li>Subscribe to lifecycle events (pbReady, refreshRequested, pbError)</li>
                  <li>Access current configuration with <code className="bg-white px-1 rounded">pb.getConfig()</code></li>
                  <li>Override settings at runtime with <code className="bg-white px-1 rounded">pb.setConfig()</code></li>
                </ul>
              </div>

              {/* Ad Unit Refresh Example */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Refreshing Ad Units</h4>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Manually refresh ad units on-demand.</p>
                  <button
                    type="button"
                    onClick={() => handleCopy(adUnitExample)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
                  <code>{adUnitExample}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Reference */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Wrapper API Reference</h2>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <code className="text-sm font-mono text-gray-900">pb.init()</code>
            <p className="text-sm text-gray-600 mt-1">
              Initialize the wrapper and fetch configuration from server. Returns a Promise.
            </p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <code className="text-sm font-mono text-gray-900">pb.refresh([adUnitCodes])</code>
            <p className="text-sm text-gray-600 mt-1">
              Refresh ad units. Pass array of ad unit codes, or omit to refresh all.
            </p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <code className="text-sm font-mono text-gray-900">pb.getConfig()</code>
            <p className="text-sm text-gray-600 mt-1">
              Get current Prebid configuration object.
            </p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <code className="text-sm font-mono text-gray-900">pb.setConfig(config)</code>
            <p className="text-sm text-gray-600 mt-1">
              Update configuration at runtime. Merges with existing config.
            </p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <code className="text-sm font-mono text-gray-900">pb.on(event, callback)</code>
            <p className="text-sm text-gray-600 mt-1">
              Subscribe to events: 'pbReady', 'refreshRequested', 'pbError'.
            </p>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <code className="text-sm font-mono text-gray-900">pb.off(event, [callback])</code>
            <p className="text-sm text-gray-600 mt-1">
              Unsubscribe from events. Omit callback to remove all listeners for event.
            </p>
          </div>
        </div>
      </div>

      {/* Additional Resources */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Resources</h2>
        <ul className="space-y-3">
          <li className="flex items-center">
            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm text-gray-700">
              Wrapper URL: <code className="bg-gray-100 px-1 rounded">{apiEndpoint}/pb.min.js</code>
            </span>
          </li>
          <li className="flex items-center">
            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span className="text-sm text-gray-700">
              Config endpoint: <code className="bg-gray-100 px-1 rounded">{apiEndpoint}/c/{publisherSlug}</code>
            </span>
          </li>
          <li className="flex items-center">
            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className="text-sm text-gray-700">
              Need help? Contact support for integration assistance.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
