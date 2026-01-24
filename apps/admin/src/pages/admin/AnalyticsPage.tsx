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

  const handleExport = () => {
    setIsExporting(true);
    try {
      // Generate CSV from current analytics data
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `analytics-${dateRange.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.csv`;

      // Build CSV content with revenue data
      const headers = ['Date', 'Revenue'];
      const rows = mockRevenueData.map(d => [d.date, `$${d.revenue}`]);

      // Add summary row
      const totalRevenue = mockRevenueData.reduce((sum, d) => sum + d.revenue, 0);
      rows.push(['Total', `$${totalRevenue}`]);

      // Add latency data section
      const latencyHeaders = ['', '', 'Bidder', 'Avg Latency (ms)', 'P95 Latency (ms)'];
      const latencyRows = mockLatencyData.map(d => ['', '', d.bidder, d.avg.toString(), d.p95.toString()]);

      // Add fill rate data section
      const fillRateHeaders = ['', '', '', 'Ad Unit', 'Fill Rate (%)', 'Requests'];
      const fillRateRows = mockFillRateData.map(d => ['', '', '', d.adUnit, d.fillRate.toString(), d.requests.toString()]);

      const csvContent = [
        `Analytics Report - ${dateRange}`,
        '',
        'Revenue Data',
        headers.join(','),
        ...rows.map(row => row.join(',')),
        '',
        'Latency Data',
        latencyHeaders.slice(2).join(','),
        ...latencyRows.map(row => row.slice(2).join(',')),
        '',
        'Fill Rate Data',
        fillRateHeaders.slice(3).join(','),
        ...fillRateRows.map(row => row.slice(3).join(',')),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
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
