import { useState, useEffect } from 'react';
import { FormModal } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';

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
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (actionFilter) {
        params.append('action', actionFilter);
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
  }, [token, actionFilter]);

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
          <div>
            <label htmlFor="action-filter" className="sr-only">
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
          {actionFilter && (
            <button
              type="button"
              onClick={() => setActionFilter('')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filter
            </button>
          )}
          <div className="ml-auto text-sm text-gray-500">
            {isLoading ? 'Loading...' : `Showing ${filteredLogs.length} entries`}
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
