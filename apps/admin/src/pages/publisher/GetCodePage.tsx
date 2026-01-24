import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

export function GetCodePage() {
  const { user } = useAuthStore();
  const [selectedTab, setSelectedTab] = useState<'header' | 'body'>('header');
  const [copied, setCopied] = useState(false);

  const publisherId = user?.publisherId || 'demo-publisher';

  const headerCode = `<!-- pbjs_engine Header Code -->
<script async src="https://cdn.pbjs-engine.com/prebid.min.js"></script>
<script>
  var pbjs = pbjs || {};
  pbjs.que = pbjs.que || [];

  pbjs.que.push(function() {
    pbjs.setConfig({
      publisherId: '${publisherId}',
      debug: false,
      enableSendAllBids: true,
      priceGranularity: 'medium'
    });
  });
</script>`;

  const bodyCode = `<!-- pbjs_engine Ad Unit -->
<div id="ad-unit-1" data-pbjs-ad-unit="header-banner">
  <script>
    pbjs.que.push(function() {
      pbjs.renderAd('ad-unit-1');
    });
  </script>
</div>`;

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
  <title>pbjs_engine Integration - ${publisherId}</title>

${headerCode}
</head>
<body>
  <h1>pbjs_engine Ad Integration Example</h1>
  <p>Publisher ID: ${publisherId}</p>

  <!-- Ad Unit Example -->
${bodyCode}

</body>
</html>`;

    const blob = new Blob([fullCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pbjs-embed-code-${publisherId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Get Code</h1>
        <p className="mt-1 text-sm text-gray-500">
          Copy the code snippets below to integrate pbjs_engine into your website.
        </p>
      </div>

      {/* Quick Start Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
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
            <h3 className="text-sm font-medium text-blue-800">Quick Start</h3>
            <p className="mt-1 text-sm text-blue-700">
              1. Add the header code to your page's &lt;head&gt; section.<br />
              2. Add ad unit code where you want ads to appear.<br />
              3. That's it! Your ads will start serving immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Download Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Download Complete Code</h2>
            <p className="mt-1 text-sm text-gray-500">
              Download a complete HTML example file with your publisher ID ({publisherId}).
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
            Download Embed Code
          </button>
        </div>
      </div>

      {/* Code Tabs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              type="button"
              onClick={() => setSelectedTab('header')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                selectedTab === 'header'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Header Code
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('body')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                selectedTab === 'body'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ad Unit Code
            </button>
          </nav>
        </div>

        <div className="p-4">
          {selectedTab === 'header' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">
                  Add this code to the <code className="bg-gray-100 px-1 rounded">&lt;head&gt;</code> section of your page.
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(headerCode)}
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
                <code>{headerCode}</code>
              </pre>
            </div>
          )}

          {selectedTab === 'body' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">
                  Add this code where you want ads to appear on your page.
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(bodyCode)}
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
                <code>{bodyCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Additional Resources */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Resources</h2>
        <ul className="space-y-3">
          <li className="flex items-center">
            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <a href="#" className="text-blue-600 hover:text-blue-800">
              Integration Documentation
            </a>
          </li>
          <li className="flex items-center">
            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <a href="#" className="text-blue-600 hover:text-blue-800">
              Troubleshooting Guide
            </a>
          </li>
          <li className="flex items-center">
            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <a href="#" className="text-blue-600 hover:text-blue-800">
              API Reference
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
