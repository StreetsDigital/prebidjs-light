import { useState, useEffect } from 'react';
import { FormModal } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { ArrowDownTrayIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userId: string | null;
  userName: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  details: {
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
  };
}

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'config_change', label: 'Config Change' },
];

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
];

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

  switch (preset) {
    case 'today':
      return {
        startDate: today.toISOString(),
        endDate: endOfToday.toISOString(),
      };
    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        startDate: yesterday.toISOString(),
        endDate: new Date(today.getTime() - 1).toISOString(),
      };
    }
    case 'last_7_days': {
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        startDate: sevenDaysAgo.toISOString(),
        endDate: endOfToday.toISOString(),
      };
    }
    case 'last_30_days': {
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: thirtyDaysAgo.toISOString(),
        endDate: endOfToday.toISOString(),
      };
    }
    case 'this_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: startOfMonth.toISOString(),
        endDate: endOfToday.toISOString(),
      };
    }
    default:
      return { startDate: '', endDate: '' };
  }
}

function formatDateForInput(isoString: string): string {
  if (!isoString) return '';
  return isoString.split('T')[0];
}

function exportToCSV(logs: AuditLog[], filename: string): void {
  const headers = ['Timestamp', 'Action', 'Resource', 'Resource ID', 'User Name', 'User Email', 'IP Address', 'User Agent', 'Old Values', 'New Values'];
  const rows = logs.map(log => [
    new Date(log.timestamp).toISOString(),
    log.action,
    log.resource,
    log.resourceId || '',
    log.userName,
    log.userEmail,
    log.ipAddress,
    log.userAgent,
    log.details.oldValues ? JSON.stringify(log.details.oldValues) : '',
    log.details.newValues ? JSON.stringify(log.details.newValues) : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function getActionBadge(action: string) {
  const styles: Record<string, string> = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
    login: 'bg-purple-100 text-purple-800',
    logout: 'bg-gray-100 text-gray-800',
    config_change: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[action] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {action.replace('_', ' ')}
    </span>
  );
}

export function AuditLogsPage() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [datePreset, setDatePreset] = useState('last_7_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (actionFilter) {
        params.append('action', actionFilter);
      }

      // Apply date filters
      if (datePreset === 'custom') {
        if (customStartDate) {
          params.append('startDate', new Date(customStartDate).toISOString());
        }
        if (customEndDate) {
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          params.append('endDate', endDate.toISOString());
        }
      } else if (datePreset) {
        const { startDate, endDate } = getDateRange(datePreset);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token, actionFilter, datePreset, customStartDate, customEndDate]);

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `audit-logs-${timestamp}.csv`;
    exportToCSV(logs, filename);
  };

  const filteredLogs = logs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track all system activities and user actions.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Action Type Filter */}
          <div>
            <label htmlFor="action-filter" className="block text-xs font-medium text-gray-500 mb-1">
              Filter by action
            </label>
            <select
              id="action-filter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3 pr-10"
            >
              {ACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label htmlFor="date-preset" className="block text-xs font-medium text-gray-500 mb-1">
              Date range
            </label>
            <select
              id="date-preset"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3 pr-10"
            >
              {DATE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range */}
          {datePreset === 'custom' && (
            <>
              <div>
                <label htmlFor="start-date" className="block text-xs font-medium text-gray-500 mb-1">
                  Start date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="start-date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="end-date" className="block text-xs font-medium text-gray-500 mb-1">
                  End date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="end-date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                  />
                </div>
              </div>
            </>
          )}

          {/* Clear Filters */}
          {(actionFilter || datePreset !== 'last_7_days') && (
            <button
              type="button"
              onClick={() => {
                setActionFilter('');
                setDatePreset('last_7_days');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700 self-end pb-1.5"
            >
              Clear filters
            </button>
          )}

          {/* Export Button and Count */}
          <div className="ml-auto flex items-end gap-4">
            <div className="text-sm text-gray-500 pb-1.5">
              {isLoading ? 'Loading...' : `Showing ${filteredLogs.length} entries`}
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={isLoading || filteredLogs.length === 0}
              className="inline-flex items-center gap-x-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Timestamp
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Action
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Resource
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                User
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                IP Address
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTimestamp(log.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getActionBadge(log.action)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{log.resource}</div>
                  <div className="text-sm text-gray-500">{log.resourceId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{log.userName}</div>
                  <div className="text-sm text-gray-500">{log.userEmail}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.ipAddress}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLog(log);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No audit logs found matching your filter.
          </div>
        )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <FormModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Details"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Timestamp</p>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Action</p>
                <p className="mt-1">{getActionBadge(selectedLog.action)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Resource</p>
                <p className="mt-1 text-sm text-gray-900">{selectedLog.resource}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Resource ID</p>
                <p className="mt-1 text-sm text-gray-900 font-mono">
                  {selectedLog.resourceId}
                </p>
              </div>
            </div>

            <hr className="border-gray-200" />

            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">User Information</p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-sm text-gray-900">{selectedLog.userName}</p>
                <p className="text-sm text-gray-500">{selectedLog.userEmail}</p>
                <p className="text-sm text-gray-500">ID: {selectedLog.userId}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Request Information</p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-sm text-gray-900">IP: {selectedLog.ipAddress}</p>
                <p className="text-sm text-gray-500 truncate">{selectedLog.userAgent}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Details</p>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </FormModal>
    </div>
  );
}
