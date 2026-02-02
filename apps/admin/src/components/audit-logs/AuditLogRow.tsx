import { AuditLog } from './types';

interface AuditLogRowProps {
  log: AuditLog;
  onClick: () => void;
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

export function AuditLogRow({ log, onClick }: AuditLogRowProps) {
  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer"
      onClick={onClick}
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
            onClick();
          }}
          className="text-blue-600 hover:text-blue-900"
        >
          View Details
        </button>
      </td>
    </tr>
  );
}
