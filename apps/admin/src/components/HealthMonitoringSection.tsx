import { SettingsSection } from './SettingsSection';

interface SystemHealth {
  status: string;
  timestamp: string;
  database: {
    status: string;
    latency: string;
    size: string;
  };
  wrapper: {
    built: boolean;
    size: string;
    lastModified: string | null;
  };
  api: {
    uptime: number;
    memory: {
      used: string;
      total: string;
    };
    nodeVersion: string;
  };
}

interface SystemStats {
  publishers: number;
  websites: number;
  adUnits: number;
  users: number;
}

interface HealthMonitoringSectionProps {
  health: SystemHealth | null;
  stats: SystemStats | null;
  rebuildingWrapper: boolean;
  onRebuildWrapper: () => void;
}

export function HealthMonitoringSection({
  health,
  stats,
  rebuildingWrapper,
  onRebuildWrapper,
}: HealthMonitoringSectionProps) {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <SettingsSection title="System Overview">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5">
            <dt className="truncate text-sm font-medium text-gray-500">Total Publishers</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {stats?.publishers || 0}
            </dd>
          </div>
          <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5">
            <dt className="truncate text-sm font-medium text-gray-500">Total Websites</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {stats?.websites || 0}
            </dd>
          </div>
          <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5">
            <dt className="truncate text-sm font-medium text-gray-500">Total Ad Units</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {stats?.adUnits || 0}
            </dd>
          </div>
          <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5">
            <dt className="truncate text-sm font-medium text-gray-500">Total Users</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {stats?.users || 0}
            </dd>
          </div>
        </div>
      </SettingsSection>

      {/* Health Status */}
      <SettingsSection title="Health Status">
        <div className="space-y-4">
          {/* Database Status */}
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-900">Database</h3>
                <p className="text-sm text-green-700">{health?.database.status}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-700">Latency: {health?.database.latency}</p>
              <p className="text-sm text-green-700">Size: {health?.database.size}</p>
            </div>
          </div>

          {/* API Status */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900">API Server</h3>
                <p className="text-sm text-blue-700">Uptime: {health ? formatUptime(health.api.uptime) : 'N/A'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-700">Memory: {health?.api.memory.used} / {health?.api.memory.total}</p>
              <p className="text-sm text-blue-700">Node: {health?.api.nodeVersion}</p>
            </div>
          </div>

          {/* Wrapper Status */}
          <div className={`flex items-center justify-between p-4 rounded-lg ${health?.wrapper.built ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className={`h-8 w-8 ${health?.wrapper.built ? 'text-green-600' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <h3 className={`text-sm font-medium ${health?.wrapper.built ? 'text-green-900' : 'text-yellow-900'}`}>
                  Publisher Wrapper
                </h3>
                <p className={`text-sm ${health?.wrapper.built ? 'text-green-700' : 'text-yellow-700'}`}>
                  {health?.wrapper.built ? 'Built' : 'Not built'}
                </p>
              </div>
            </div>
            <div className="text-right space-y-2">
              {health?.wrapper.built && (
                <>
                  <p className="text-sm text-green-700">Size: {health.wrapper.size}</p>
                  <p className="text-sm text-green-700">
                    Modified: {health.wrapper.lastModified ? new Date(health.wrapper.lastModified).toLocaleString() : 'N/A'}
                  </p>
                </>
              )}
              <button
                onClick={onRebuildWrapper}
                disabled={rebuildingWrapper}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {rebuildingWrapper ? 'Rebuilding...' : 'Rebuild Wrapper'}
              </button>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
