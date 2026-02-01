import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { PrebidMarketplaceModal } from '../../components/PrebidMarketplaceModal';

interface Analytics {
  id: string;
  code: string;
  name: string;
  params?: Record<string, any> | null;
  enabled: boolean;
  isPrebidMember: boolean;
  documentationUrl?: string | null;
  dependencies?: string[];
}

export function AnalyticsPage() {
  const { user } = useAuthStore();
  const publisherId = user?.publisherId;

  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingAnalytics, setDeletingAnalytics] = useState<string | null>(null);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);

  // Fetch analytics from API
  useEffect(() => {
    if (!publisherId) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `http://localhost:3001/api/publishers/${publisherId}/analytics`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch analytics adapters');
        }

        const { data } = await response.json();
        setAnalytics(data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics adapters');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [publisherId]);

  const filteredAnalytics = analytics.filter(
    (adapter) =>
      adapter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adapter.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (adapter: Analytics) => {
    if (!publisherId) return;

    const confirmMessage = `Remove ${adapter.name}? This will disable analytics tracking for this adapter.`;

    if (!confirm(confirmMessage)) return;

    try {
      setDeletingAnalytics(adapter.code);

      const response = await fetch(
        `http://localhost:3001/api/publishers/${publisherId}/analytics/${adapter.code}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete analytics adapter');
      }

      // Optimistically update UI
      setAnalytics((prev) => prev.filter((a) => a.code !== adapter.code));
    } catch (err) {
      console.error('Error deleting analytics adapter:', err);
      alert('Failed to delete analytics adapter. Please try again.');
    } finally {
      setDeletingAnalytics(null);
    }
  };

  // Handle adding component from marketplace
  const handleAddComponent = async (component: any, type: 'bidder' | 'module' | 'analytics') => {
    if (!publisherId) return;

    if (type !== 'analytics') {
      alert('Only analytics adapters can be added from this page.');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/publishers/${publisherId}/analytics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analyticsCode: component.code,
            analyticsName: component.name,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add analytics adapter');
      }

      // Refresh analytics list
      const fetchResponse = await fetch(
        `http://localhost:3001/api/publishers/${publisherId}/analytics`
      );
      const { data } = await fetchResponse.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error adding analytics adapter:', err);
      alert(err instanceof Error ? err.message : 'Failed to add analytics adapter');
      throw err; // Re-throw to let modal handle the error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-red-600 hover:text-red-500 font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const prebidMemberCount = analytics.filter(a => a.isPrebidMember).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track auction performance and bidder behavior with analytics adapters.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsMarketplaceOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Browse Analytics
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Adapters</p>
          <p className="text-2xl font-semibold text-gray-900">{analytics.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Enabled Adapters</p>
          <p className="text-2xl font-semibold text-gray-900">
            {analytics.filter((a) => a.enabled).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Prebid Members</p>
          <p className="text-2xl font-semibold text-gray-900">{prebidMemberCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-4">
        <input
          type="text"
          placeholder="Search analytics adapters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
        />
      </div>

      {/* Analytics List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredAnalytics.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {searchQuery ? 'No analytics adapters found' : 'No analytics adapters added yet'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery
                ? 'No analytics adapters match your search criteria.'
                : 'Click "Browse Analytics" to add analytics adapters to your account.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredAnalytics.map((adapter) => (
              <li key={adapter.code} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {adapter.name}
                        </h3>
                        {adapter.isPrebidMember && (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            Prebid Member
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        Analytics code: {adapter.code}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {adapter.documentationUrl && (
                      <a
                        href={adapter.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Docs
                      </a>
                    )}
                    <button
                      type="button"
                      className="text-sm text-gray-600 hover:text-gray-800"
                      title="Configure adapter parameters"
                    >
                      Configure
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(adapter)}
                      disabled={deletingAnalytics === adapter.code}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingAnalytics === adapter.code ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Marketplace Modal */}
      <PrebidMarketplaceModal
        isOpen={isMarketplaceOpen}
        onClose={() => setIsMarketplaceOpen(false)}
        onAdd={handleAddComponent}
        addedAnalytics={analytics.map((a) => a.code)}
      />
    </div>
  );
}
