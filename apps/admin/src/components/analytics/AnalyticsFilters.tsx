import { useState } from 'react';
import { fetchAnalyticsStats, fetchBidderStats } from '../../hooks/useAnalyticsData';

interface AnalyticsFiltersProps {
  dateRange: string;
  onDateRangeChange: (dateRange: string) => void;
}

export function AnalyticsFilters({ dateRange, onDateRangeChange }: AnalyticsFiltersProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dateRangeError, setDateRangeError] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch real data from APIs
      const [stats, biddersRes] = await Promise.all([
        fetchAnalyticsStats(),
        fetchBidderStats(),
      ]);

      // Generate CSV from real analytics data
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `analytics-${dateRange.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.csv`;

      // Build CSV content with summary data
      const summaryHeaders = ['Metric', 'Value'];
      const summaryRows = [
        ['Total Events', stats.totalEvents.toString()],
        ['Events Last 24h', stats.eventsLast24h.toString()],
        ['Unique Publishers', stats.uniquePublishers.toString()],
        ['Total Revenue', `$${stats.totalRevenue.toFixed(2)}`],
        ['Impressions', (stats.eventsByType?.impression || 0).toString()],
        ['Bids Requested', (stats.eventsByType?.bidRequested || 0).toString()],
        ['Bids Received', (stats.eventsByType?.bidResponse || 0).toString()],
        ['Bids Won', (stats.eventsByType?.bidWon || 0).toString()],
      ];

      // Build bidder stats section
      const bidderHeaders = ['Bidder', 'Requests', 'Responses', 'Won', 'Timeouts', 'Avg CPM', 'Avg Latency (ms)', 'Fill Rate (%)'];
      const bidderRows = biddersRes.map(b => {
        const fillRate = b.bidsRequested > 0 ? ((b.bidsReceived / b.bidsRequested) * 100).toFixed(1) : '0.0';
        return [
          b.bidderCode,
          b.bidsRequested.toString(),
          b.bidsReceived.toString(),
          b.bidsWon.toString(),
          b.bidsTimeout.toString(),
          `$${b.avgCpm.toFixed(2)}`,
          b.avgLatency.toString(),
          fillRate,
        ];
      });

      const csvContent = [
        `Analytics Report - ${dateRange}`,
        `Generated: ${new Date().toISOString()}`,
        '',
        'Summary Metrics',
        summaryHeaders.join(','),
        ...summaryRows.map(row => row.join(',')),
        '',
        'Bidder Performance',
        bidderHeaders.join(','),
        ...bidderRows.map(row => row.join(',')),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDateRangeChange = (value: string) => {
    onDateRangeChange(value);
    if (value === 'Custom range') {
      setShowCustomDatePicker(true);
      // Set default dates to last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      setCustomStartDate(startDate.toISOString().split('T')[0]);
      setCustomEndDate(endDate.toISOString().split('T')[0]);
      setDateRangeError('');
    } else {
      setShowCustomDatePicker(false);
      setDateRangeError('');
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-4">
      <select
        value={dateRange}
        onChange={(e) => handleDateRangeChange(e.target.value)}
        className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
      >
        <option>Last 7 days</option>
        <option>Last 30 days</option>
        <option>Last 90 days</option>
        <option>This month</option>
        <option>Last month</option>
        <option>Custom range</option>
      </select>

      {/* Custom Date Picker */}
      {showCustomDatePicker && (
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="startDate" className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              id="startDate"
              value={customStartDate}
              onChange={(e) => {
                const newStartDate = e.target.value;
                setCustomStartDate(newStartDate);
                // Validate: end date should not be before start date
                if (customEndDate && newStartDate > customEndDate) {
                  setDateRangeError('End date cannot be before start date');
                } else {
                  setDateRangeError('');
                }
              }}
              className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="endDate" className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              id="endDate"
              value={customEndDate}
              onChange={(e) => {
                const newEndDate = e.target.value;
                setCustomEndDate(newEndDate);
                // Validate: end date should not be before start date
                if (customStartDate && newEndDate < customStartDate) {
                  setDateRangeError('End date cannot be before start date');
                } else {
                  setDateRangeError('');
                }
              }}
              className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            />
          </div>
          {dateRangeError && (
            <div className="w-full sm:w-auto">
              <p className="text-sm text-red-600">{dateRangeError}</p>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting || !!dateRangeError}
        className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {isExporting ? 'Exporting...' : 'Export'}
      </button>
    </div>
  );
}
