interface NotificationStatsProps {
  stats: {
    total: number;
    byStatus: {
      sent: number;
      failed: number;
      acknowledged: number;
    };
    bySeverity: {
      info: number;
      warning: number;
      critical: number;
    };
    byEventType: Record<string, number>;
  };
}

export function NotificationStats({ stats }: NotificationStatsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Notification Statistics</h2>
        <p className="text-sm text-gray-500 mt-1">
          Overview of notifications sent in the last 30 days
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-blue-800 mt-1">Total Notifications</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
          <div className="text-2xl font-bold text-green-600">{stats.byStatus.sent}</div>
          <div className="text-sm text-green-800 mt-1">Successfully Sent</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
          <div className="text-2xl font-bold text-red-600">{stats.byStatus.failed}</div>
          <div className="text-sm text-red-800 mt-1">Failed</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
          <div className="text-2xl font-bold text-purple-600">{stats.byStatus.acknowledged}</div>
          <div className="text-sm text-purple-800 mt-1">Acknowledged</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-4">By Severity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Info</span>
              <span className="font-semibold text-blue-600">{stats.bySeverity.info}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Warning</span>
              <span className="font-semibold text-yellow-600">{stats.bySeverity.warning}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Critical</span>
              <span className="font-semibold text-red-600">{stats.bySeverity.critical}</span>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-4">By Event Type</h3>
          <div className="space-y-2">
            {Object.entries(stats.byEventType).map(([eventType, count]) => (
              <div key={eventType} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{eventType.replace(/_/g, ' ')}</span>
                <span className="font-semibold text-gray-900">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
