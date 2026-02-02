interface NotificationRule {
  id: string;
  name: string;
  description: string | null;
  eventType: string;
  conditions: any;
  channels: string[];
  severity: 'info' | 'warning' | 'critical';
  cooldownMinutes: number;
  enabled: boolean;
  triggerCount: number;
  lastTriggered: string | null;
}

interface NotificationRuleCardProps {
  rule: NotificationRule;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function NotificationRuleCard({ rule, onToggle, onEdit, onDelete }: NotificationRuleCardProps) {
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

  return (
    <div
      className={`border-l-4 ${
        rule.severity === 'critical'
          ? 'border-red-500'
          : rule.severity === 'warning'
          ? 'border-yellow-500'
          : 'border-blue-500'
      } bg-white shadow rounded-lg p-6`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(rule.severity)}`}>
              {rule.severity.toUpperCase()}
            </span>
            {rule.enabled ? (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Disabled
              </span>
            )}
          </div>
          {rule.description && (
            <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
          )}
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              <span className="font-medium">Event:</span> {rule.eventType.replace(/_/g, ' ')}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Condition:</span>{' '}
              {rule.conditions.comparison} {rule.conditions.threshold} (over {rule.conditions.timeWindow})
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Channels:</span> {rule.channels.length} configured
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Cooldown:</span> {rule.cooldownMinutes} minutes
            </p>
            {rule.triggerCount > 0 && (
              <p className="text-gray-600">
                <span className="font-medium">Triggered:</span> {rule.triggerCount} time(s)
                {rule.lastTriggered && ` (last: ${new Date(rule.lastTriggered).toLocaleString()})`}
              </p>
            )}
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <button
            onClick={onToggle}
            className={`px-3 py-1.5 text-xs font-medium rounded ${
              rule.enabled
                ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200'
                : 'text-green-600 bg-green-100 hover:bg-green-200'
            }`}
          >
            {rule.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-100 rounded hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
