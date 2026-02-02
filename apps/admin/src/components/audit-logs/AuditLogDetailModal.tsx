import { FormModal } from '../ui';
import { AuditLog } from './types';

interface AuditLogDetailModalProps {
  log: AuditLog | null;
  isOpen: boolean;
  onClose: () => void;
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

export function AuditLogDetailModal({ log, isOpen, onClose }: AuditLogDetailModalProps) {
  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Log Details"
    >
      {log && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Timestamp</p>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(log.timestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Action</p>
              <p className="mt-1">{getActionBadge(log.action)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Resource</p>
              <p className="mt-1 text-sm text-gray-900">{log.resource}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Resource ID</p>
              <p className="mt-1 text-sm text-gray-900 font-mono">
                {log.resourceId}
              </p>
            </div>
          </div>

          <hr className="border-gray-200" />

          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">User Information</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-sm text-gray-900">{log.userName}</p>
              <p className="text-sm text-gray-500">{log.userEmail}</p>
              <p className="text-sm text-gray-500">ID: {log.userId}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Request Information</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-sm text-gray-900">IP: {log.ipAddress}</p>
              <p className="text-sm text-gray-500 truncate">{log.userAgent}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Details</p>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </FormModal>
  );
}
