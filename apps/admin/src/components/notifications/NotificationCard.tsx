interface NotificationCardProps {
  notification: {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    status: 'pending' | 'sent' | 'failed' | 'acknowledged';
    createdAt: string;
    title: string;
    message: string;
    errorMessage: string | null;
    acknowledgedBy: string | null;
  };
  onAcknowledge: () => void;
}

export function NotificationCard({ notification, onAcknowledge }: NotificationCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'acknowledged':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(notification.severity)}`}>
              {notification.severity}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(notification.status)}`}>
              {notification.status}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(notification.createdAt).toLocaleString()}
            </span>
          </div>
          <h4 className="font-medium text-gray-900 mb-1">{notification.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
          {notification.errorMessage && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
              Error: {notification.errorMessage}
            </p>
          )}
        </div>
        {notification.status === 'sent' && !notification.acknowledgedBy && (
          <button
            onClick={onAcknowledge}
            className="ml-4 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
          >
            Acknowledge
          </button>
        )}
      </div>
    </div>
  );
}
