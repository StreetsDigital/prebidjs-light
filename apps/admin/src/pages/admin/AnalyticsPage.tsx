import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Tabs, Tab } from '../../components/ui';

const API_BASE = 'http://localhost:3001';

// Helper to get token from auth store in localStorage
function getAuthToken(): string | null {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed.state?.token || null;
    }
  } catch {
    // Fallback to direct token if auth-storage parsing fails
  }
  return localStorage.getItem('token');
}

interface ScheduledReport {
  id: string;
  name: string;
  reportType: 'revenue' | 'latency' | 'fill_rate' | 'all';
  schedule: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  publisherId?: string;
  dateRange: string;
  format: 'csv' | 'json' | 'pdf';
  status: 'active' | 'paused';
  lastSentAt: string | null;
  nextSendAt: string | null;
  createdAt: string;
}

// Analytics data types
interface AnalyticsStats {
  totalEvents: number;
  eventsLast24h: number;
  uniquePublishers: number;
  totalRevenue: number;
  eventsByType: Record<string, number>;
}

interface BidderStats {
  bidderCode: string;
  bidsRequested: number;
  bidsReceived: number;
  bidsWon: number;
  bidsTimeout: number;
  avgCpm: number;
  avgLatency: number;
}

// Fetch analytics stats from API
async function fetchAnalyticsStats(): Promise<AnalyticsStats> {
  try {
    const res = await fetch(`${API_BASE}/api/analytics/stats`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch analytics stats:', err);
  }
  return {
    totalEvents: 0,
    eventsLast24h: 0,
    uniquePublishers: 0,
    totalRevenue: 0,
    eventsByType: {},
  };
}

// Fetch bidder stats from API
async function fetchBidderStats(): Promise<BidderStats[]> {
  try {
    const res = await fetch(`${API_BASE}/api/analytics/bidders`);
    if (res.ok) {
      const data = await res.json();
      return data.bidders || [];
    }
  } catch (err) {
    console.error('Failed to fetch bidder stats:', err);
  }
  return [];
}

function RevenueChart() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

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

function LatencyChart() {
  const [bidders, setBidders] = useState<BidderStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBidderStats().then((data) => {
      setBidders(data);
      setLoading(false);
    });
  }, []);

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

function FillRateChart() {
  const [bidders, setBidders] = useState<BidderStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBidderStats().then((data) => {
      setBidders(data);
      setLoading(false);
    });
  }, []);

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

interface ScheduleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: Partial<ScheduledReport>) => Promise<void>;
  editingReport?: ScheduledReport | null;
}

function ScheduleReportModal({ isOpen, onClose, onSave, editingReport }: ScheduleReportModalProps) {
  const [name, setName] = useState('');
  const [reportType, setReportType] = useState<'revenue' | 'latency' | 'fill_rate' | 'all'>('all');
  const [schedule, setSchedule] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [recipients, setRecipients] = useState('');
  const [dateRange, setDateRange] = useState('last_7_days');
  const [format, setFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingReport) {
      setName(editingReport.name);
      setReportType(editingReport.reportType);
      setSchedule(editingReport.schedule);
      setRecipients(editingReport.recipients.join(', '));
      setDateRange(editingReport.dateRange);
      setFormat(editingReport.format);
    } else {
      setName('');
      setReportType('all');
      setSchedule('daily');
      setRecipients('');
      setDateRange('last_7_days');
      setFormat('csv');
    }
    setError('');
  }, [editingReport, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Report name is required');
      return;
    }

    if (!recipients.trim()) {
      setError('At least one recipient email is required');
      return;
    }

    const recipientList = recipients.split(',').map(e => e.trim()).filter(e => e);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of recipientList) {
      if (!emailRegex.test(email)) {
        setError(`Invalid email format: ${email}`);
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        reportType,
        schedule,
        recipients: recipientList,
        dateRange,
        format,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scheduled report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  {editingReport ? 'Edit Scheduled Report' : 'Schedule Report'}
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  {error && (
                    <div className="rounded-md bg-red-50 p-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Report Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      placeholder="Weekly Revenue Report"
                    />
                  </div>

                  <div>
                    <label htmlFor="reportType" className="block text-sm font-medium text-gray-700">
                      Report Type
                    </label>
                    <select
                      id="reportType"
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value as typeof reportType)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                    >
                      <option value="all">All Metrics</option>
                      <option value="revenue">Revenue</option>
                      <option value="latency">Latency</option>
                      <option value="fill_rate">Fill Rate</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="schedule" className="block text-sm font-medium text-gray-700">
                      Schedule
                    </label>
                    <select
                      id="schedule"
                      value={schedule}
                      onChange={(e) => setSchedule(e.target.value as typeof schedule)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">
                      Date Range
                    </label>
                    <select
                      id="dateRange"
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                    >
                      <option value="last_7_days">Last 7 Days</option>
                      <option value="last_30_days">Last 30 Days</option>
                      <option value="last_90_days">Last 90 Days</option>
                      <option value="this_month">This Month</option>
                      <option value="last_month">Last Month</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="format" className="block text-sm font-medium text-gray-700">
                      Export Format
                    </label>
                    <select
                      id="format"
                      value={format}
                      onChange={(e) => setFormat(e.target.value as typeof format)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="recipients" className="block text-sm font-medium text-gray-700">
                      Recipients (comma-separated emails)
                    </label>
                    <input
                      type="text"
                      id="recipients"
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      placeholder="admin@example.com, team@example.com"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter one or more email addresses, separated by commas
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : editingReport ? 'Update Schedule' : 'Save Schedule'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reportName: string;
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, reportName }: DeleteConfirmModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      Delete Scheduled Report
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete "{reportName}"? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function ScheduledReportsList() {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [deleteReport, setDeleteReport] = useState<ScheduledReport | null>(null);

  const fetchReports = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/scheduled-reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.scheduledReports || []);
      }
    } catch (err) {
      console.error('Failed to fetch scheduled reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSave = async (reportData: Partial<ScheduledReport>) => {
    const token = getAuthToken();
    const url = editingReport
      ? `${API_BASE}/api/scheduled-reports/${editingReport.id}`
      : `${API_BASE}/api/scheduled-reports`;
    const method = editingReport ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(reportData),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to save report');
    }

    await fetchReports();
    setEditingReport(null);
  };

  const handleDelete = async () => {
    if (!deleteReport) return;

    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/api/scheduled-reports/${deleteReport.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      await fetchReports();
    }
    setDeleteReport(null);
  };

  const formatSchedule = (schedule: string) => {
    return schedule.charAt(0).toUpperCase() + schedule.slice(1);
  };

  const formatDateRange = (range: string) => {
    return range.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Scheduled Reports</h3>
        <button
          onClick={() => {
            setEditingReport(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Schedule Report
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled reports</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a scheduled report.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Schedule Report
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{report.name}</div>
                    <div className="text-sm text-gray-500">{formatDateRange(report.dateRange)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {report.reportType === 'all' ? 'All Metrics' : formatSchedule(report.reportType.replace('_', ' '))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatSchedule(report.schedule)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {report.recipients.slice(0, 2).join(', ')}
                      {report.recipients.length > 2 && ` +${report.recipients.length - 2} more`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        report.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setEditingReport(report);
                        setIsModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteReport(report)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ScheduleReportModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReport(null);
        }}
        onSave={handleSave}
        editingReport={editingReport}
      />

      <DeleteConfirmModal
        isOpen={!!deleteReport}
        onClose={() => setDeleteReport(null)}
        onConfirm={handleDelete}
        reportName={deleteReport?.name || ''}
      />
    </div>
  );
}

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('Last 7 days');
  const [isExporting, setIsExporting] = useState(false);

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

      {/* Date Range Selector */}
      <div className="flex items-center gap-4">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
        >
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
          <option>This month</option>
          <option>Last month</option>
        </select>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} defaultTab="revenue" />
    </div>
  );
}
