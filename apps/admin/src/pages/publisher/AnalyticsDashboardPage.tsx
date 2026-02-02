import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useLoadingState } from '../../hooks/useLoadingState';
import { DashboardFilters } from '../../components/DashboardFilters';
import { DashboardMetrics } from '../../components/DashboardMetrics';
import { DashboardCharts } from '../../components/DashboardCharts';

const API_BASE_URL = import.meta.env.VITE_API_URL || '${API_BASE_URL}';

interface MetricData {
  bidderCode: string;
  date: string;
  impressions: number;
  bids: number;
  wins: number;
  revenue: number;
  avgCpm: number;
  avgLatency: number;
  fillRate: number | null;
  winRate: number | null;
}

interface TimeseriesData {
  timestamp: string;
  revenue: number;
  impressions: number;
  winRate: number;
  avgLatency: number;
}

export function AnalyticsDashboardPage() {
  const { user } = useAuthStore();
  const publisherId = user?.publisherId;

  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesData[]>([]);
  const [dateRange, setDateRange] = useState(7);
  const { isLoading: loading, error, withLoading } = useLoadingState(true);

  useEffect(() => {
    if (!publisherId) return;
    fetchData();
  }, [publisherId, dateRange]);

  const fetchData = async () => {
    const result = await withLoading(async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const metricsResponse = await fetch(
        `${API_BASE_URL}/api/publishers/${publisherId}/analytics/bidders?startDate=${
          startDate.toISOString().split('T')[0]
        }&endDate=${endDate.toISOString().split('T')[0]}`
      );

      let metricsData: MetricData[] = [];
      if (metricsResponse.ok) {
        const { data } = await metricsResponse.json();
        metricsData = Array.isArray(data) ? data : [];
      }

      const timeseriesResponse = await fetch(
        `${API_BASE_URL}/api/publishers/${publisherId}/analytics/timeseries?startDate=${
          startDate.toISOString().split('T')[0]
        }&endDate=${endDate.toISOString().split('T')[0]}`
      );

      let timeseriesData: TimeseriesData[] = [];
      if (timeseriesResponse.ok) {
        const { data } = await timeseriesResponse.json();
        timeseriesData = Array.isArray(data) ? data : [];
      }

      return { metrics: metricsData, timeseries: timeseriesData };
    });

    if (result) {
      setMetrics(result.metrics);
      setTimeseries(result.timeseries);
    }
  };

  const calculateTotals = () => {
    const totals = (metrics ?? []).reduce(
      (acc, m) => ({
        revenue: acc.revenue + (m?.revenue ?? 0),
        impressions: acc.impressions + (m?.impressions ?? 0),
        bids: acc.bids + (m?.bids ?? 0),
        wins: acc.wins + (m?.wins ?? 0),
      }),
      { revenue: 0, impressions: 0, bids: 0, wins: 0 }
    );

    return {
      ...totals,
      avgCpm: totals.impressions > 0 ? totals.revenue / totals.impressions : 0,
      winRate: totals.bids > 0 ? (totals.wins / totals.bids) * 100 : 0,
    };
  };

  const topBidders = (metrics ?? []).reduce((acc: Record<string, MetricData>, m) => {
    if (!m?.bidderCode) return acc;
    if (!acc[m.bidderCode]) {
      acc[m.bidderCode] = { ...m };
    } else {
      acc[m.bidderCode].revenue += (m.revenue ?? 0);
      acc[m.bidderCode].impressions += (m.impressions ?? 0);
      acc[m.bidderCode].wins += (m.wins ?? 0);
    }
    return acc;
  }, {});

  const topBiddersList = Object.values(topBidders)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const latencyData = topBiddersList.map((bidder) => ({
    name: bidder?.bidderCode ?? 'Unknown',
    latency: Math.round(bidder?.avgLatency ?? 0),
  })).sort((a, b) => a.latency - b.latency);

  const winRateData = topBiddersList.map((bidder) => ({
    name: bidder?.bidderCode ?? 'Unknown',
    winRate: bidder?.winRate ? Number((bidder.winRate * 100).toFixed(1)) : 0,
    fillRate: bidder?.fillRate ? Number((bidder.fillRate * 100).toFixed(1)) : 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <DashboardFilters dateRange={dateRange} onDateRangeChange={setDateRange} />

      <DashboardMetrics totals={totals} />

      {/* Top Bidders Table */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Bidders by Revenue</h2>
        {topBiddersList.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No data available. Metrics will appear here once you start receiving bid data.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bidder
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Impressions
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Wins
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Avg CPM
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topBiddersList.map((bidder) => (
                  <tr key={bidder.bidderCode}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {bidder.bidderCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      ${bidder.revenue.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                      {bidder.impressions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                      {bidder.wins}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                      ${bidder.avgCpm.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DashboardCharts
        metrics={metrics}
        timeseries={timeseries}
        topBiddersList={topBiddersList}
      />

      {/* Performance Summary Cards */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Fastest Bidder</h3>
            <p className="text-2xl font-bold text-blue-600">
              {latencyData.length > 0 ? latencyData[0].name : 'N/A'}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {latencyData.length > 0 ? `${latencyData[0].latency}ms avg latency` : ''}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
            <h3 className="text-sm font-semibold text-green-900 mb-2">Best Win Rate</h3>
            <p className="text-2xl font-bold text-green-600">
              {winRateData.length > 0
                ? winRateData.reduce((a, b) => (a.winRate > b.winRate ? a : b)).name
                : 'N/A'}
            </p>
            <p className="text-sm text-green-700 mt-1">
              {winRateData.length > 0
                ? `${winRateData.reduce((a, b) => (a.winRate > b.winRate ? a : b)).winRate}% win rate`
                : ''}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border border-purple-200">
            <h3 className="text-sm font-semibold text-purple-900 mb-2">Total Bidders Active</h3>
            <p className="text-2xl font-bold text-purple-600">{Object.keys(topBidders).length}</p>
            <p className="text-sm text-purple-700 mt-1">
              {metrics.length} data points collected
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
