import { useAnalyticsStats, useBidderStats } from '../../hooks/useAnalyticsData';
import { AnalyticsMetrics } from './AnalyticsMetrics';

export function RevenueChart() {
  const { stats, loading, recentEvents, isConnected, lastUpdate } = useAnalyticsStats();

  return (
    <div className="space-y-6">
      {/* Real-time Status Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {isConnected ? 'Real-time updates active' : 'Connecting...'}
        </span>
        {lastUpdate && (
          <span className="text-gray-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      <AnalyticsMetrics stats={stats} loading={loading} />

      {/* Real-time Event Feed */}
      {recentEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Event Feed
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentEvents.map((event, index) => (
              <div
                key={event.id || index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm animate-fade-in"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    event.eventType === 'bidWon' ? 'bg-green-100 text-green-800' :
                    event.eventType === 'bidResponse' ? 'bg-blue-100 text-blue-800' :
                    event.eventType === 'bidRequested' ? 'bg-yellow-100 text-yellow-800' :
                    event.eventType === 'impression' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {event.eventType}
                  </span>
                  {event.bidderCode && (
                    <span className="text-gray-600">{event.bidderCode}</span>
                  )}
                  {event.cpm && (
                    <span className="text-green-600 font-medium">${event.cpm.toFixed(2)}</span>
                  )}
                </div>
                <span className="text-gray-400 text-xs">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LatencyChart() {
  const { bidders, loading } = useBidderStats();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const biddersWithLatency = bidders.filter(b => b.avgLatency > 0);
  const maxLatency = Math.max(...biddersWithLatency.map(d => d.avgLatency), 1);
  const avgLatency = biddersWithLatency.length > 0
    ? Math.round(biddersWithLatency.reduce((sum, b) => sum + b.avgLatency, 0) / biddersWithLatency.length)
    : 0;
  const fastestBidder = biddersWithLatency.length > 0
    ? biddersWithLatency.reduce((prev, curr) => prev.avgLatency < curr.avgLatency ? prev : curr)
    : null;
  const totalTimeouts = bidders.reduce((sum, b) => sum + b.bidsTimeout, 0);
  const totalRequests = bidders.reduce((sum, b) => sum + b.bidsRequested, 0);
  const timeoutRate = totalRequests > 0 ? (totalTimeouts / totalRequests) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
          <p className="text-2xl font-semibold text-gray-900">{avgLatency}ms</p>
          <p className="text-sm text-gray-500">{biddersWithLatency.length} bidders with data</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Bidders</p>
          <p className="text-2xl font-semibold text-gray-900">{bidders.length}</p>
          <p className="text-sm text-gray-500">{totalRequests} requests</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Fastest Bidder</p>
          <p className="text-2xl font-semibold text-gray-900">{fastestBidder?.bidderCode || 'N/A'}</p>
          <p className="text-sm text-gray-500">{fastestBidder ? `${fastestBidder.avgLatency}ms avg` : 'No data'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Timeout Rate</p>
          <p className="text-2xl font-semibold text-gray-900">{timeoutRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-500">{totalTimeouts} timeouts</p>
        </div>
      </div>

      {/* Latency by Bidder */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bidder Latency (ms)</h3>
        {bidders.length === 0 ? (
          <p className="text-gray-500">No bidder data available</p>
        ) : (
          <div className="space-y-4">
            {bidders.map((data) => (
              <div key={data.bidderCode} className="flex items-center gap-4">
                <div className="w-28 text-sm font-medium text-gray-700 truncate" title={data.bidderCode}>
                  {data.bidderCode}
                </div>
                <div className="flex-1">
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="absolute h-full bg-green-500 rounded-lg"
                      style={{ width: `${Math.min((data.avgLatency / Math.max(maxLatency, 1)) * 100, 100)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <span className="text-sm font-medium text-gray-800">
                        {data.avgLatency}ms
                      </span>
                      <span className="text-xs text-gray-600">
                        {data.bidsRequested} req / {data.bidsWon} won
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function FillRateChart() {
  const { bidders, loading } = useBidderStats();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalRequests = bidders.reduce((sum, b) => sum + b.bidsRequested, 0);
  const totalResponses = bidders.reduce((sum, b) => sum + b.bidsReceived, 0);
  const totalWon = bidders.reduce((sum, b) => sum + b.bidsWon, 0);
  const overallFillRate = totalRequests > 0 ? (totalResponses / totalRequests) * 100 : 0;

  const biddersWithFillRate = bidders.map(b => ({
    ...b,
    fillRate: b.bidsRequested > 0 ? (b.bidsReceived / b.bidsRequested) * 100 : 0,
  })).sort((a, b) => b.fillRate - a.fillRate);

  const bestBidder = biddersWithFillRate.length > 0 ? biddersWithFillRate[0] : null;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Overall Fill Rate</p>
          <p className="text-2xl font-semibold text-gray-900">{overallFillRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-500">Responses / Requests</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Requests</p>
          <p className="text-2xl font-semibold text-gray-900">{totalRequests.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Filled Requests</p>
          <p className="text-2xl font-semibold text-gray-900">{totalResponses.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{totalWon} winning bids</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Best Performing</p>
          <p className="text-2xl font-semibold text-gray-900">{bestBidder?.bidderCode || 'N/A'}</p>
          <p className="text-sm text-gray-500">{bestBidder ? `${bestBidder.fillRate.toFixed(1)}% fill rate` : 'No data'}</p>
        </div>
      </div>

      {/* Fill Rate by Bidder */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fill Rate by Bidder</h3>
        {bidders.length === 0 ? (
          <p className="text-gray-500">No bidder data available</p>
        ) : (
          <div className="space-y-4">
            {biddersWithFillRate.map((data) => (
              <div key={data.bidderCode} className="flex items-center gap-4">
                <div className="w-28 text-sm font-medium text-gray-700 truncate" title={data.bidderCode}>
                  {data.bidderCode}
                </div>
                <div className="flex-1">
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className={`absolute h-full rounded-lg ${
                        data.fillRate >= 85
                          ? 'bg-green-500'
                          : data.fillRate >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(data.fillRate, 100)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <span className="text-sm font-medium text-gray-800">{data.fillRate.toFixed(1)}%</span>
                      <span className="text-sm text-gray-600">
                        {data.bidsReceived} / {data.bidsRequested} requests
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-gray-600">&gt;=85%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded" />
            <span className="text-gray-600">70-84%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span className="text-gray-600">&lt;70%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
