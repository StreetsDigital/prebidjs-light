import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { TrendingUp, Activity, DollarSign, Target } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(7); // days

  useEffect(() => {
    if (!publisherId) return;
    fetchData();
  }, [publisherId, dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      // Fetch bidder metrics
      const metricsResponse = await fetch(
        `http://localhost:3001/api/publishers/${publisherId}/analytics/bidders?startDate=${
          startDate.toISOString().split('T')[0]
        }&endDate=${endDate.toISOString().split('T')[0]}`
      );

      if (metricsResponse.ok) {
        const { data } = await metricsResponse.json();
        setMetrics(data);
      }

      // Fetch timeseries data
      const timeseriesResponse = await fetch(
        `http://localhost:3001/api/publishers/${publisherId}/analytics/timeseries?startDate=${
          startDate.toISOString().split('T')[0]
        }&endDate=${endDate.toISOString().split('T')[0]}`
      );

      if (timeseriesResponse.ok) {
        const { data } = await timeseriesResponse.json();
        setTimeseries(data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totals = metrics.reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.revenue,
        impressions: acc.impressions + m.impressions,
        bids: acc.bids + m.bids,
        wins: acc.wins + m.wins,
      }),
      { revenue: 0, impressions: 0, bids: 0, wins: 0 }
    );

    return {
      ...totals,
      avgCpm: totals.impressions > 0 ? totals.revenue / totals.impressions : 0,
      winRate: totals.bids > 0 ? (totals.wins / totals.bids) * 100 : 0,
    };
  };

  const topBidders = metrics
    .reduce((acc: Record<string, MetricData>, m) => {
      if (!acc[m.bidderCode]) {
        acc[m.bidderCode] = { ...m };
      } else {
        acc[m.bidderCode].revenue += m.revenue;
        acc[m.bidderCode].impressions += m.impressions;
        acc[m.bidderCode].wins += m.wins;
      }
      return acc;
    }, {});

  const topBiddersList = Object.values(topBidders)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Prepare chart data
  const revenueByBidder = topBiddersList.map((bidder) => ({
    name: bidder.bidderCode,
    revenue: Number(bidder.revenue.toFixed(2)),
    impressions: bidder.impressions,
  }));

  const pieChartData = topBiddersList.map((bidder) => ({
    name: bidder.bidderCode,
    value: Number(bidder.revenue.toFixed(2)),
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  // Aggregate timeseries data by date
  const timeseriesChartData = timeseries.map((ts) => ({
    date: new Date(ts.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: Number(ts.revenue.toFixed(2)),
    impressions: Math.round(ts.impressions / 1000), // Show in thousands
    winRate: Number((ts.winRate * 100).toFixed(1)),
  }));

  // Latency comparison data
  const latencyData = topBiddersList.map((bidder) => ({
    name: bidder.bidderCode,
    latency: Math.round(bidder.avgLatency),
  })).sort((a, b) => a.latency - b.latency);

  // Win rate by bidder
  const winRateData = topBiddersList.map((bidder) => ({
    name: bidder.bidderCode,
    winRate: bidder.winRate ? Number((bidder.winRate * 100).toFixed(1)) : 0,
    fillRate: bidder.fillRate ? Number((bidder.fillRate * 100).toFixed(1)) : 0,
  }));

  // Impressions by bidder over time (stacked area)
  const impressionsByBidderDate = metrics.reduce((acc: any, m) => {
    const date = new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!acc[date]) {
      acc[date] = { date };
    }
    acc[date][m.bidderCode] = m.impressions;
    return acc;
  }, {});
  const impressionsAreaData = Object.values(impressionsByBidderDate).sort((a: any, b: any) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

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
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Performance metrics and insights for your Prebid configuration
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDateRange(7)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              dateRange === 7
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateRange(30)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              dateRange === 30
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${totals.revenue.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Impressions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {totals.impressions.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg CPM</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${totals.avgCpm.toFixed(2)}
              </p>
            </div>
            <Target className="w-10 h-10 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Win Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {totals.winRate.toFixed(1)}%
              </p>
            </div>
            <Activity className="w-10 h-10 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Top Bidders */}
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

      {/* Revenue Trend Chart */}
      {timeseries.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeseriesChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Revenue ($)"
              />
              <Line
                type="monotone"
                dataKey="impressions"
                stroke="#10B981"
                strokeWidth={2}
                name="Impressions (K)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bidder Revenue Comparison */}
      {topBiddersList.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Bidder</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByBidder}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#3B82F6" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Win Rate & Fill Rate Comparison */}
      {topBiddersList.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics by Bidder</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={winRateData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="winRate" fill="#10B981" name="Win Rate (%)" />
              <Bar dataKey="fillRate" fill="#3B82F6" name="Fill Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Latency Comparison & Impressions Area */}
      {topBiddersList.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latency Comparison */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Average Latency (Lower is Better)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={latencyData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="latency" name="Latency (ms)">
                  {latencyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.latency < 100
                          ? '#10B981'
                          : entry.latency < 150
                          ? '#F59E0B'
                          : '#EF4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex gap-4 text-xs justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-600">Fast (&lt;100ms)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded"></div>
                <span className="text-gray-600">Medium (100-150ms)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-gray-600">Slow (&gt;150ms)</span>
              </div>
            </div>
          </div>

          {/* Impressions Stacked Area */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Impressions by Bidder Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={impressionsAreaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {topBiddersList.slice(0, 5).map((bidder, index) => (
                  <Area
                    key={bidder.bidderCode}
                    type="monotone"
                    dataKey={bidder.bidderCode}
                    stackId="1"
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    name={bidder.bidderCode}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
