import { useState } from 'react';
import { Tabs, Tab } from '../../components/ui';

// Mock chart data
const mockRevenueData = [
  { date: 'Mon', revenue: 4500 },
  { date: 'Tue', revenue: 5200 },
  { date: 'Wed', revenue: 4800 },
  { date: 'Thu', revenue: 6100 },
  { date: 'Fri', revenue: 5900 },
  { date: 'Sat', revenue: 3200 },
  { date: 'Sun', revenue: 2800 },
];

const mockLatencyData = [
  { bidder: 'AppNexus', avg: 45, p95: 120 },
  { bidder: 'Rubicon', avg: 62, p95: 145 },
  { bidder: 'Index', avg: 38, p95: 95 },
  { bidder: 'OpenX', avg: 55, p95: 130 },
  { bidder: 'PubMatic', avg: 48, p95: 110 },
];

const mockFillRateData = [
  { adUnit: 'Header Banner', fillRate: 87, requests: 125000 },
  { adUnit: 'Sidebar Box', fillRate: 92, requests: 98000 },
  { adUnit: 'In-Article', fillRate: 78, requests: 145000 },
  { adUnit: 'Footer', fillRate: 65, requests: 67000 },
];

function RevenueChart() {
  const maxRevenue = Math.max(...mockRevenueData.map(d => d.revenue));
  const totalRevenue = mockRevenueData.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Revenue</p>
          <p className="text-2xl font-semibold text-gray-900">${totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-green-600">+12% vs last week</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Avg Daily</p>
          <p className="text-2xl font-semibold text-gray-900">${Math.round(totalRevenue / 7).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Best Day</p>
          <p className="text-2xl font-semibold text-gray-900">Thursday</p>
          <p className="text-sm text-gray-500">$6,100</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">eCPM</p>
          <p className="text-2xl font-semibold text-gray-900">$3.76</p>
          <p className="text-sm text-green-600">+5% vs last week</p>
        </div>
      </div>

      {/* Revenue Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue</h3>
        <div className="flex items-end justify-between h-64 gap-2">
          {mockRevenueData.map((data) => (
            <div key={data.date} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center">
                <span className="text-sm text-gray-600 mb-2">${data.revenue.toLocaleString()}</span>
                <div
                  className="w-full bg-blue-500 rounded-t-lg transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${(data.revenue / maxRevenue) * 200}px` }}
                />
              </div>
              <span className="mt-2 text-sm font-medium text-gray-600">{data.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LatencyChart() {
  const maxLatency = Math.max(...mockLatencyData.map(d => d.p95));

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
          <p className="text-2xl font-semibold text-gray-900">50ms</p>
          <p className="text-sm text-green-600">-8% vs last week</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">P95 Latency</p>
          <p className="text-2xl font-semibold text-gray-900">120ms</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Fastest Bidder</p>
          <p className="text-2xl font-semibold text-gray-900">Index</p>
          <p className="text-sm text-gray-500">38ms avg</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Timeout Rate</p>
          <p className="text-2xl font-semibold text-gray-900">2.3%</p>
          <p className="text-sm text-green-600">-0.5% vs last week</p>
        </div>
      </div>

      {/* Latency by Bidder */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bidder Latency (ms)</h3>
        <div className="space-y-4">
          {mockLatencyData.map((data) => (
            <div key={data.bidder} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium text-gray-700">{data.bidder}</div>
              <div className="flex-1">
                <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="absolute h-full bg-green-500 rounded-lg"
                    style={{ width: `${(data.avg / maxLatency) * 100}%` }}
                  />
                  <div
                    className="absolute h-full bg-yellow-400 rounded-lg opacity-50"
                    style={{ width: `${(data.p95 / maxLatency) * 100}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="text-sm font-medium text-gray-800">
                      Avg: {data.avg}ms | P95: {data.p95}ms
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-gray-600">Average</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded" />
            <span className="text-gray-600">P95</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FillRateChart() {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Overall Fill Rate</p>
          <p className="text-2xl font-semibold text-gray-900">82%</p>
          <p className="text-sm text-green-600">+3% vs last week</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Requests</p>
          <p className="text-2xl font-semibold text-gray-900">435K</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Filled Requests</p>
          <p className="text-2xl font-semibold text-gray-900">357K</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Best Performing</p>
          <p className="text-2xl font-semibold text-gray-900">Sidebar Box</p>
          <p className="text-sm text-gray-500">92% fill rate</p>
        </div>
      </div>

      {/* Fill Rate by Ad Unit */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fill Rate by Ad Unit</h3>
        <div className="space-y-4">
          {mockFillRateData.map((data) => (
            <div key={data.adUnit} className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium text-gray-700">{data.adUnit}</div>
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
                    style={{ width: `${data.fillRate}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-sm font-medium text-gray-800">{data.fillRate}%</span>
                    <span className="text-sm text-gray-600">{data.requests.toLocaleString()} requests</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-gray-600">≥85%</span>
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

export function AnalyticsPage() {
  const tabs: Tab[] = [
    {
      id: 'revenue',
      label: 'Revenue',
      content: <RevenueChart />,
    },
    {
      id: 'latency',
      label: 'Latency',
      content: <LatencyChart />,
    },
    {
      id: 'fill-rate',
      label: 'Fill Rate',
      content: <FillRateChart />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor your ad performance metrics and revenue data.
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-4">
        <select className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
          <option>This month</option>
          <option>Last month</option>
        </select>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} defaultTab="revenue" />
    </div>
  );
}
