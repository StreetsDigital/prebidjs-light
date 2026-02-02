import { AnalyticsStats } from '../../hooks/useAnalyticsData';

interface AnalyticsMetricsProps {
  stats: AnalyticsStats | null;
  loading: boolean;
}

export function AnalyticsMetrics({ stats, loading }: AnalyticsMetricsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = stats?.totalRevenue || 0;
  const impressions = stats?.eventsByType?.impression || 0;
  const bidsWon = stats?.eventsByType?.bidWon || 0;
  const totalEvents = stats?.totalEvents || 0;
  const eCPM = impressions > 0 ? (totalRevenue / impressions) * 1000 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Revenue</p>
          <p className="text-2xl font-semibold text-gray-900">${totalRevenue.toFixed(2)}</p>
          <p className="text-sm text-gray-500">From {bidsWon} winning bids</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Impressions</p>
          <p className="text-2xl font-semibold text-gray-900">{impressions.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Last 24h: {stats?.eventsLast24h || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Events</p>
          <p className="text-2xl font-semibold text-gray-900">{totalEvents.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{stats?.uniquePublishers || 0} publishers</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">eCPM</p>
          <p className="text-2xl font-semibold text-gray-900">${eCPM.toFixed(2)}</p>
          <p className="text-sm text-gray-500">Revenue per 1000 impressions</p>
        </div>
      </div>

      {/* Event Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats?.eventsByType || {}).map(([eventType, count]) => (
            <div key={eventType} className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 capitalize">{eventType}</p>
              <p className="text-xl font-semibold text-gray-900">{count.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
