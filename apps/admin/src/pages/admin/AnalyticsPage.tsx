import { useState } from 'react';
import { Tabs, Tab } from '../../components/ui';
import {
  RevenueChart,
  LatencyChart,
  FillRateChart,
  ScheduledReportsList,
  AnalyticsFilters,
} from '../../components/analytics';

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('Last 7 days');

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
    {
      id: 'scheduled',
      label: 'Scheduled Reports',
      content: <ScheduledReportsList />,
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

      {/* Date Range Selector and Export */}
      <AnalyticsFilters dateRange={dateRange} onDateRangeChange={setDateRange} />

      {/* Tabs */}
      <Tabs tabs={tabs} defaultTab="revenue" />
    </div>
  );
}
