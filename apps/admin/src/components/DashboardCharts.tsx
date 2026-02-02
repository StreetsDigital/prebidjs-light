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

interface DashboardChartsProps {
  metrics: MetricData[];
  timeseries: TimeseriesData[];
  topBiddersList: MetricData[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export function DashboardCharts({ metrics, timeseries, topBiddersList }: DashboardChartsProps) {
  // Prepare chart data
  const revenueByBidder = topBiddersList.map((bidder) => ({
    name: bidder?.bidderCode ?? 'Unknown',
    revenue: Number((bidder?.revenue ?? 0).toFixed(2)),
    impressions: bidder?.impressions ?? 0,
  }));

  const pieChartData = topBiddersList.map((bidder) => ({
    name: bidder?.bidderCode ?? 'Unknown',
    value: Number((bidder?.revenue ?? 0).toFixed(2)),
  }));

  const timeseriesChartData = (timeseries ?? []).map((ts) => ({
    date: ts?.timestamp ? new Date(ts.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
    revenue: Number((ts?.revenue ?? 0).toFixed(2)),
    impressions: Math.round((ts?.impressions ?? 0) / 1000),
    winRate: Number(((ts?.winRate ?? 0) * 100).toFixed(1)),
  }));

  const latencyData = topBiddersList.map((bidder) => ({
    name: bidder?.bidderCode ?? 'Unknown',
    latency: Math.round(bidder?.avgLatency ?? 0),
  })).sort((a, b) => a.latency - b.latency);

  const winRateData = topBiddersList.map((bidder) => ({
    name: bidder?.bidderCode ?? 'Unknown',
    winRate: bidder?.winRate ? Number((bidder.winRate * 100).toFixed(1)) : 0,
    fillRate: bidder?.fillRate ? Number((bidder.fillRate * 100).toFixed(1)) : 0,
  }));

  const impressionsByBidderDate = (metrics ?? []).reduce((acc: any, m) => {
    if (!m?.date || !m?.bidderCode) return acc;
    const date = new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!acc[date]) {
      acc[date] = { date };
    }
    acc[date][m.bidderCode] = m?.impressions ?? 0;
    return acc;
  }, {});
  const impressionsAreaData = Object.values(impressionsByBidderDate).sort((a: any, b: any) =>
    new Date(a?.date ?? 0).getTime() - new Date(b?.date ?? 0).getTime()
  );

  return (
    <>
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
    </>
  );
}
