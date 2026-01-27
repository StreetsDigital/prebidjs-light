import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

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

interface DatabaseInfo {
  type: string;
  path: string;
  size: string;
  lastModified: string;
  walSize?: string;
  shmSize?: string;
  tables: Array<{ name: string; count: number }>;
}

interface SystemConfig {
  environment: string;
  apiPort: string | number;
  cors: {
    enabled: boolean;
    origins: string[];
  };
  database: {
    type: string;
    path: string;
  };
  wrapper: {
    path: string;
    cacheControl: string;
  };
}

export function SystemSettingsPage() {
  const { token } = useAuthStore();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'health' | 'database' | 'config'>('health');
  const [rebuildingWrapper, setRebuildingWrapper] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/system/health', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (err) {
      console.error('Failed to fetch health:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/system/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchDatabase = async () => {
    try {
      const response = await fetch('/api/system/database', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDbInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch database info:', err);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/system/config', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    }
  };

  const handleRebuildWrapper = async () => {
    setRebuildingWrapper(true);
    setMessage(null);

    try {
      const response = await fetch('/api/system/rebuild-wrapper', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Wrapper rebuilt successfully: ${data.size}` });
        fetchHealth(); // Refresh health data
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to rebuild wrapper' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to rebuild wrapper' });
    } finally {
      setRebuildingWrapper(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    setMessage(null);

    try {
      const response = await fetch('/api/system/clear-cache', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Database cache cleared successfully' });
        fetchDatabase(); // Refresh database info
      } else {
        setMessage({ type: 'error', text: 'Failed to clear cache' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to clear cache' });
    } finally {
      setClearingCache(false);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      await Promise.all([fetchHealth(), fetchStats(), fetchDatabase(), fetchConfig()]);
      setIsLoading(false);
    };

    fetchAllData();

    // Auto-refresh health data every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Monitor system health, manage configuration, and perform maintenance tasks</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('health')}
            className={`${
              activeTab === 'health'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
          >
            Health & Monitoring
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`${
              activeTab === 'database'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
          >
            Database
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
          >
            Configuration
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">Loading system information...</p>
        </div>
      ) : (
        <>
          {/* Health Tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              {/* System Overview */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">System Overview</h2>
                </div>
                <div className="p-6">
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
                </div>
              </div>

              {/* Health Status */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Health Status</h2>
                </div>
                <div className="p-6">
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
                          onClick={handleRebuildWrapper}
                          disabled={rebuildingWrapper}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          {rebuildingWrapper ? 'Rebuilding...' : 'Rebuild Wrapper'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Database Tab */}
          {activeTab === 'database' && dbInfo && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Database Information</h2>
                </div>
                <div className="p-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Type</dt>
                      <dd className="mt-1 text-sm text-gray-900">{dbInfo.type}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Size</dt>
                      <dd className="mt-1 text-sm text-gray-900">{dbInfo.size}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Path</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{dbInfo.path}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Modified</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(dbInfo.lastModified).toLocaleString()}
                      </dd>
                    </div>
                    {dbInfo.walSize && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">WAL Size</dt>
                        <dd className="mt-1 text-sm text-gray-900">{dbInfo.walSize}</dd>
                      </div>
                    )}
                    {dbInfo.shmSize && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">SHM Size</dt>
                        <dd className="mt-1 text-sm text-gray-900">{dbInfo.shmSize}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-6">
                    <button
                      onClick={handleClearCache}
                      disabled={clearingCache}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {clearingCache ? 'Clearing...' : 'Clear Cache (WAL Checkpoint)'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Statistics */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Table Statistics</h2>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Table Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Record Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dbInfo.tables.map((table) => (
                          <tr key={table.name}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {table.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {table.count.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'config' && config && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">System Configuration</h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Environment</dt>
                    <dd className="mt-1 text-sm text-gray-900">{config.environment}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">API Port</dt>
                    <dd className="mt-1 text-sm text-gray-900">{config.apiPort}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">CORS Enabled</dt>
                    <dd className="mt-1 text-sm text-gray-900">{config.cors.enabled ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">CORS Origins</dt>
                    <dd className="mt-1 text-sm text-gray-900">{config.cors.origins.join(', ')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Database Type</dt>
                    <dd className="mt-1 text-sm text-gray-900">{config.database.type}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Database Path</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{config.database.path}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Wrapper Path</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{config.wrapper.path}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Wrapper Cache Control</dt>
                    <dd className="mt-1 text-sm text-gray-900">{config.wrapper.cacheControl}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
