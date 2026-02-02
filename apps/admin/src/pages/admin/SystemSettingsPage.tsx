import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { HealthMonitoringSection } from '../../components/HealthMonitoringSection';
import { DatabaseSection } from '../../components/DatabaseSection';
import { ConfigurationSection } from '../../components/ConfigurationSection';

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
  }, []);

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
            <HealthMonitoringSection
              health={health}
              stats={stats}
              rebuildingWrapper={rebuildingWrapper}
              onRebuildWrapper={handleRebuildWrapper}
            />
          )}

          {/* Database Tab */}
          {activeTab === 'database' && dbInfo && (
            <DatabaseSection
              dbInfo={dbInfo}
              clearingCache={clearingCache}
              onClearCache={handleClearCache}
            />
          )}

          {/* Configuration Tab */}
          {activeTab === 'config' && config && (
            <ConfigurationSection config={config} />
          )}
        </>
      )}
    </div>
  );
}
