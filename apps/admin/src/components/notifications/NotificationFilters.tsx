type TabType = 'channels' | 'rules' | 'history' | 'escalation' | 'stats';

interface NotificationFiltersProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function NotificationFilters({ activeTab, onTabChange }: NotificationFiltersProps) {
  const tabs = [
    { id: 'channels' as TabType, label: 'Channels', icon: '📢' },
    { id: 'rules' as TabType, label: 'Alert Rules', icon: '⚠️' },
    { id: 'history' as TabType, label: 'History', icon: '📊' },
    { id: 'escalation' as TabType, label: 'Escalation', icon: '🔺' },
    { id: 'stats' as TabType, label: 'Statistics', icon: '📈' },
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
