import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { PrebidMarketplaceModal } from '../../components/PrebidMarketplaceModal';
import ComponentConfigModal from '../../components/ComponentConfigModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || '${API_BASE_URL}';

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

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    currentPage === pageNum
                      ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
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
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedAnalytics, setSelectedAnalytics] = useState<Analytics | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch analytics from API
  useEffect(() => {
    if (!publisherId) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE_URL}/api/publishers/${publisherId}/analytics`
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

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate pagination
  const totalItems = filteredAnalytics.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAnalytics = filteredAnalytics.slice(startIndex, endIndex);

  const handleDelete = async (adapter: Analytics) => {
    if (!publisherId) return;

    const confirmMessage = `Remove ${adapter.name}? This will disable analytics tracking for this adapter.`;

    if (!confirm(confirmMessage)) return;

    try {
      setDeletingAnalytics(adapter.code);

      const response = await fetch(
        `${API_BASE_URL}/api/publishers/${publisherId}/analytics/${adapter.code}`,
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
        `${API_BASE_URL}/api/publishers/${publisherId}/analytics`,
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
        `${API_BASE_URL}/api/publishers/${publisherId}/analytics`
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
        {paginatedAnalytics.length === 0 ? (
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
          <>
          <ul className="divide-y divide-gray-200">
            {paginatedAnalytics.map((adapter) => (
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
                      onClick={() => {
                        setSelectedAnalytics(adapter);
                        setConfigModalOpen(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
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
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
          </>
        )}
      </div>

      {/* Marketplace Modal */}
      <PrebidMarketplaceModal
        isOpen={isMarketplaceOpen}
        onClose={() => setIsMarketplaceOpen(false)}
        onAdd={handleAddComponent}
        addedAnalytics={analytics.map((a) => a.code)}
      />

      {/* Configuration Modal */}
      {selectedAnalytics && publisherId && (
        <ComponentConfigModal
          isOpen={configModalOpen}
          onClose={() => {
            setConfigModalOpen(false);
            setSelectedAnalytics(null);
          }}
          componentType="analytics"
          componentCode={selectedAnalytics.code}
          componentName={selectedAnalytics.name}
          publisherId={publisherId}
          onSave={() => {
            // Configuration saved successfully
            // Could reload analytics adapters here if we need to show updated config
          }}
        />
      )}
    </div>
  );
}
