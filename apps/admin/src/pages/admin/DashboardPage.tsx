import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface DashboardStats {
  publishers: {
    total: number;
    active: number;
  };
  adUnits: {
    total: number;
    active: number;
  };
  users: {
    total: number;
  };
  today: {
    impressions: number;
    revenue: number;
  };
}

export function DashboardPage() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-6">
          Welcome to the pbjs_engine admin dashboard. This is where you can
          manage publishers, ad units, bidders, and more.
        </p>

        {/* Quick stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">
              Total Publishers
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {isLoading ? '...' : stats?.publishers.total ?? 0}
            </dd>
          </div>
          <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">
              Active Ad Units
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {isLoading ? '...' : stats?.adUnits.active ?? 0}
            </dd>
          </div>
          <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">
              Today's Impressions
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {isLoading ? '...' : stats?.today.impressions ?? 0}
            </dd>
          </div>
          <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">
              Revenue (Today)
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              ${isLoading ? '...' : stats?.today.revenue ?? 0}
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
}
