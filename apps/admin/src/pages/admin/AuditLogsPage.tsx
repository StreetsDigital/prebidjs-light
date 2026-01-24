import { useState } from 'react';
import { FormModal } from '../../components/ui';

interface AuditLog {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'config_change';
  resource: string;
  resourceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
}

const MOCK_LOGS: AuditLog[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    action: 'login',
    resource: 'session',
    resourceId: 'sess_123',
    userId: 'user_1',
    userName: 'Super Admin',
    userEmail: 'admin@example.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    details: { method: 'password' },
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    action: 'create',
    resource: 'publisher',
    resourceId: 'pub_456',
    userId: 'user_1',
    userName: 'Super Admin',
    userEmail: 'admin@example.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    details: { name: 'New Publisher', slug: 'new-publisher' },
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    action: 'update',
    resource: 'publisher',
    resourceId: 'pub_123',
    userId: 'user_1',
    userName: 'Super Admin',
    userEmail: 'admin@example.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    details: { field: 'status', oldValue: 'active', newValue: 'paused' },
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    action: 'config_change',
    resource: 'bidder',
    resourceId: 'appnexus',
    userId: 'user_2',
    userName: 'Staff Admin',
    userEmail: 'staff@example.com',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    details: { bidder: 'appnexus', enabled: true },
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    action: 'delete',
    resource: 'ad_unit',
    resourceId: 'unit_789',
    userId: 'user_1',
    userName: 'Super Admin',
    userEmail: 'admin@example.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    details: { name: 'Old Ad Unit', code: 'old-unit' },
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    action: 'logout',
    resource: 'session',
    resourceId: 'sess_122',
    userId: 'user_3',
    userName: 'Publisher User',
    userEmail: 'publisher@example.com',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
    details: { reason: 'user_initiated' },
  },
  {
    id: '7',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    action: 'create',
    resource: 'user',
    resourceId: 'user_4',
    userId: 'user_1',
    userName: 'Super Admin',
    userEmail: 'admin@example.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    details: { email: 'newuser@example.com', role: 'publisher' },
  },
  {
    id: '8',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    action: 'update',
    resource: 'user',
    resourceId: 'user_2',
    userId: 'user_1',
    userName: 'Super Admin',
    userEmail: 'admin@example.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    details: { field: 'role', oldValue: 'publisher', newValue: 'admin' },
  },
];

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
  const [logs] = useState<AuditLog[]>(MOCK_LOGS);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = actionFilter
    ? logs.filter((log) => log.action === actionFilter)
    : logs;

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
            Showing {filteredLogs.length} of {logs.length} entries
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
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
