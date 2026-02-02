import { useState } from 'react';

interface Build {
  id: string;
  version: string;
  status: 'success' | 'failed' | 'building' | 'pending';
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  triggeredBy: string;
  commitHash: string;
  fileSize: string | null;
  modules: number;
  bidders: number;
  scriptUrl?: string;
}

interface Publisher {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  domains: string[];
  status: 'active' | 'paused' | 'disabled';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PublisherBidder {
  id: string;
  bidderCode: string;
  bidderName: string;
  enabled: boolean;
  params: Record<string, string>;
  priority: number;
}

interface AdUnit {
  id: string;
  websiteId: string;
  code: string;
  name: string;
  sizes: string[];
  mediaTypes: string[];
  status: 'active' | 'paused';
  floorPrice: string | null;
  sizeMapping: unknown[] | null;
  videoConfig?: unknown;
}

interface BuildTabProps {
  publisher: Publisher;
  builds: Build[];
  publisherBidders: PublisherBidder[];
  adUnitsByWebsite: Record<string, AdUnit[]>;
  token: string;
  isBuildTriggering: boolean;
  setIsBuildTriggering: (value: boolean) => void;
  setBuilds: React.Dispatch<React.SetStateAction<Build[]>>;
  onDeleteBuild: (build: Build) => void;
  onRefreshBuilds: () => Promise<void>;
  onAddToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export function BuildTab({
  publisher,
  builds,
  publisherBidders,
  adUnitsByWebsite,
  token,
  isBuildTriggering,
  setIsBuildTriggering,
  setBuilds,
  onDeleteBuild,
  onRefreshBuilds,
  onAddToast,
}: BuildTabProps) {
  const [copiedEmbedCode, setCopiedEmbedCode] = useState(false);

  const handleTriggerBuild = async () => {
    if (!publisher?.id) return;
    setIsBuildTriggering(true);

    try {
      const response = await fetch(`/api/publishers/${publisher.id}/builds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger build');
      }

      const data = await response.json();

      // Add building state to top of list
      const newBuild: Build = {
        id: data.id,
        version: data.version,
        status: 'building',
        startedAt: new Date().toISOString(),
        completedAt: null,
        duration: null,
        triggeredBy: 'Super Admin',
        commitHash: data.configHash,
        fileSize: null,
        modules: 0,
        bidders: publisherBidders.filter(b => b.enabled).length || 0,
      };

      setBuilds([newBuild, ...builds]);

      // Poll for build completion
      const pollBuild = async () => {
        const statusResponse = await fetch(`/api/publishers/${publisher.id}/builds/${data.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (statusResponse.ok) {
          const buildData = await statusResponse.json();
          if (buildData.status !== 'building') {
            // Build completed, update the list
            await onRefreshBuilds();
            setIsBuildTriggering(false);
            onAddToast({
              type: buildData.status === 'success' ? 'success' : 'error',
              message: buildData.status === 'success'
                ? `Build v${buildData.version} completed successfully`
                : `Build v${buildData.version} failed`,
            });
          } else {
            // Still building, poll again
            setTimeout(pollBuild, 1000);
          }
        } else {
          setIsBuildTriggering(false);
        }
      };

      // Start polling after 1 second
      setTimeout(pollBuild, 1000);
    } catch (err) {
      console.error('Failed to trigger build:', err);
      onAddToast({ message: 'Failed to trigger build', type: 'error' });
      setIsBuildTriggering(false);
    }
  };

  const handleDownloadBuild = () => {
    if (!publisher || builds.length === 0 || builds[0].status !== 'success') return;

    // Flatten all ad units from all websites
    const allAdUnits = Object.values(adUnitsByWebsite).flat();

    // Generate a mock Prebid.js bundle content
    const bundleContent = `// Prebid.js Bundle for Publisher: ${publisher.id}
// Version: ${builds[0].version}
// Generated: ${new Date().toISOString()}
// Modules: ${builds[0].modules}
// Bidders: ${builds[0].bidders}

var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

// Publisher Config
pbjs.setConfig({
  priceGranularity: "medium",
  enableSendAllBids: true,
  bidderTimeout: 1500,
  publisherId: "${publisher.id}"
});

// Ad Units
pbjs.addAdUnits(${JSON.stringify(allAdUnits.map(u => ({
  code: u.code,
  mediaTypes: { banner: { sizes: u.sizes.map(s => s.split('x').map(Number)) } }
})), null, 2)});

// Bidder Adapters
${publisherBidders.filter(b => b.enabled).map(b => `// ${b.bidderName} adapter loaded`).join('\n')}

// GPT Integration
pbjs.que.push(function() {
  pbjs.requestBids({
    bidsBackHandler: function() {
      pbjs.setTargetingForGPTAsync();
    }
  });
});

// Prebid.js bundle loaded successfully
`;

    // Create and download the file
    const blob = new Blob([bundleContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prebid-bundle-${publisher.slug}-v${builds[0].version}.min.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatVersionDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getBuildStatusBadge = (status: Build['status']) => {
    const styles = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      building: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800',
    };
    const icons = {
      success: (
        <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ),
      failed: (
        <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      ),
      building: (
        <svg className="mr-1 h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      ),
      pending: (
        <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      ),
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
      >
        {icons[status]}
        {status}
      </span>
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Current Build Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Build Status</h2>
            <p className="text-sm text-gray-500">
              Current Prebid.js build for this publisher.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {builds.length > 0 && builds[0].status === 'success' && (
              <button
                type="button"
                onClick={handleDownloadBuild}
                className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
              >
                <svg className="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            )}
            <button
              type="button"
              onClick={handleTriggerBuild}
              disabled={isBuildTriggering || (builds.length > 0 && builds[0].status === 'building')}
              className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${
                isBuildTriggering || (builds.length > 0 && builds[0].status === 'building')
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {isBuildTriggering || (builds.length > 0 && builds[0].status === 'building') ? (
                <>
                  <svg className="-ml-0.5 mr-1.5 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Building...
                </>
              ) : (
                <>
                  <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Trigger Build
                </>
              )}
            </button>
          </div>
        </div>

        {builds.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  builds[0].status === 'success' ? 'bg-green-100' :
                  builds[0].status === 'failed' ? 'bg-red-100' :
                  builds[0].status === 'building' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {builds[0].status === 'success' && (
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {builds[0].status === 'failed' && (
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {builds[0].status === 'building' && (
                    <svg className="h-6 w-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  )}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">
                    Build v{builds[0].version} {getBuildStatusBadge(builds[0].status)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Started {formatVersionDate(builds[0].startedAt)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-900">{builds[0].fileSize || 'N/A'}</p>
                <p className="text-sm text-gray-500">{formatDuration(builds[0].duration)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Modules</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{builds[0].modules}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Bidders</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{builds[0].bidders}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Commit</p>
                <p className="mt-1 text-sm font-mono text-gray-900">{builds[0].commitHash}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Embed Code Section */}
      {builds.length > 0 && builds[0].status === 'success' && builds[0].scriptUrl && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900">Embed Code</h2>
            <p className="text-sm text-gray-500">
              Add this single script tag to your website to load the minified Prebid.js bundle with all your configurations.
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 relative">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all">
{`<script async src="https://cdn.pbjs-engine.com${builds[0].scriptUrl}?key=${publisher.apiKey}&v=${builds[0].version}"></script>`}
            </pre>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  `<script async src="https://cdn.pbjs-engine.com${builds[0].scriptUrl}?key=${publisher.apiKey}&v=${builds[0].version}"></script>`
                );
                setCopiedEmbedCode(true);
                setTimeout(() => setCopiedEmbedCode(false), 2000);
              }}
              className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white rounded"
              title="Copy to clipboard"
            >
              {copiedEmbedCode ? (
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">What's Included</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Prebid.js library (minified)
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {builds[0].bidders} bidder adapters
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {builds[0].modules} modules configured
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ad unit definitions
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  GPT integration
                </li>
              </ul>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Quick Start</h3>
              <p className="text-sm text-blue-700 mb-3">
                Simply add the embed code to your website's &lt;head&gt; section. The script loads asynchronously and won't block page rendering.
              </p>
              <a
                href={`https://cdn.pbjs-engine.com${builds[0].scriptUrl}?key=${publisher.apiKey}&v=${builds[0].version}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Script
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Build History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Build History</h2>
          <p className="text-sm text-gray-500">Previous builds for this publisher.</p>
        </div>
        <div className="divide-y divide-gray-200">
          {builds.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No builds yet. Click "Build New Version" to create your first build.</p>
            </div>
          ) : (
            builds.map((build, index) => (
              <div key={build.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {getBuildStatusBadge(build.status)}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        v{build.version}
                        {index === 0 && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            Latest
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        by {build.triggeredBy} • {formatVersionDate(build.startedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="font-mono">{build.commitHash}</span>
                    <span>{formatDuration(build.duration)}</span>
                    <span>{build.fileSize || '-'}</span>
                    {build.status !== 'building' && (
                      <button
                        onClick={() => onDeleteBuild(build)}
                        className="ml-2 text-red-600 hover:text-red-800"
                        title="Delete build"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
