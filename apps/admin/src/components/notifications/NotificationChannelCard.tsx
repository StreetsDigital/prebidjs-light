interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'discord' | 'teams' | 'sms' | 'webhook' | 'pagerduty';
  name: string;
  enabled: boolean;
  verified: boolean;
  config: any;
}

interface NotificationChannelCardProps {
  channel: NotificationChannel;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function NotificationChannelCard({ channel, onTest, onEdit, onDelete }: NotificationChannelCardProps) {
  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email':
        return '📧';
      case 'slack':
        return '💬';
      case 'discord':
        return '🎮';
      case 'teams':
        return '👥';
      case 'sms':
        return '📱';
      case 'webhook':
        return '🔗';
      case 'pagerduty':
        return '🚨';
      default:
        return '📢';
    }
  };

  return (
    <div
      className={`border-2 rounded-lg p-4 ${
        channel.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getChannelIcon(channel.type)}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{channel.name}</h3>
            <p className="text-xs text-gray-500 capitalize">{channel.type}</p>
          </div>
        </div>
        {channel.verified && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            ✓ Verified
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4 text-sm">
        {channel.type === 'email' && (
          <p className="text-gray-600">
            📧 {channel.config.emails?.length || 0} recipient(s)
          </p>
        )}
        {channel.type === 'sms' && (
          <p className="text-gray-600">
            📱 {channel.config.phoneNumbers?.length || 0} number(s)
          </p>
        )}
        {(channel.type === 'slack' || channel.type === 'discord' || channel.type === 'teams') && (
          <p className="text-gray-600">🔗 Webhook configured</p>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={onTest}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
        >
          Test
        </button>
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
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
  );
}
