import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '${API_BASE_URL}';

interface Module {
  id?: string;
  code: string;
  name: string;
  category: 'recommended' | 'userId' | 'rtd' | 'general' | 'vendor';
  description?: string;
  documentationUrl?: string;
  params?: Record<string, any>;
}

export function ModulesPage() {
  const { user } = useAuthStore();
  const publisherId = user?.publisherId;

  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deletingModule, setDeletingModule] = useState<string | null>(null);

  // Fetch modules from API
  useEffect(() => {
    if (!publisherId) return;

    const fetchModules = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE_URL}/api/publishers/${publisherId}/modules`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch modules');
        }

        const { data } = await response.json();
        setModules(data);
      } catch (err) {
        console.error('Error fetching modules:', err);
        setError(err instanceof Error ? err.message : 'Failed to load modules');
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [publisherId]);

  const filteredModules = modules.filter((module) => {
    const matchesSearch =
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || module.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (module: Module) => {
    if (!publisherId) return;

    const confirmMessage = `Remove ${module.name}? This will remove it from your module list.`;

    if (!confirm(confirmMessage)) return;

    try {
      setDeletingModule(module.code);

      const response = await fetch(
        `${API_BASE_URL}/api/publishers/${publisherId}/modules/${module.code}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete module');
      }

      // Optimistically update UI
      setModules((prev) => prev.filter((m) => m.code !== module.code));
    } catch (err) {
      console.error('Error deleting module:', err);
      alert('Failed to delete module. Please try again.');
    } finally {
      setDeletingModule(null);
    }
  };

  // Get category badge
  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      recommended: { label: 'Recommended', color: 'bg-purple-50 text-purple-700 ring-purple-700/10' },
      userId: { label: 'User ID', color: 'bg-blue-50 text-blue-700 ring-blue-700/10' },
      rtd: { label: 'RTD', color: 'bg-green-50 text-green-700 ring-green-600/20' },
      general: { label: 'General', color: 'bg-gray-50 text-gray-600 ring-gray-500/10' },
      vendor: { label: 'Vendor', color: 'bg-orange-50 text-orange-700 ring-orange-600/10' },
    };

    const badge = badges[category] || badges.general;

    return (
      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badge.color}`}>
        {badge.label}
      </span>
    );
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
          <h1 className="text-2xl font-bold text-gray-900">Modules</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading modules</h3>
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

  const recommendedModules = modules.filter(m => m.category === 'recommended');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure Prebid.js modules for User ID, RTD, consent management, and more.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Browse Modules
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Modules</p>
          <p className="text-2xl font-semibold text-gray-900">{modules.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Recommended Modules</p>
          <p className="text-2xl font-semibold text-gray-900">{recommendedModules.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Enabled Modules</p>
          <p className="text-2xl font-semibold text-gray-900">{modules.length}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white shadow rounded-lg p-4 space-y-4">
        <input
          type="text"
          placeholder="Search modules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
        />

        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Filter by category:</span>
          <div className="flex flex-wrap gap-2">
            {['all', 'recommended', 'userId', 'rtd', 'general', 'vendor'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? 'All' : cat === 'userId' ? 'User ID' : cat === 'rtd' ? 'RTD' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredModules.length === 0 ? (
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
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {searchQuery || categoryFilter !== 'all' ? 'No modules found' : 'No modules added yet'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery || categoryFilter !== 'all'
                ? 'No modules match your search or filter criteria.'
                : 'Click "Browse Modules" to add modules to your account.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredModules.map((module) => (
              <li key={module.code} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        {module.code.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {module.name}
                        </h3>
                        {module.category === 'recommended' && (
                          <span className="text-yellow-500" title="Recommended">
                            ⭐
                          </span>
                        )}
                        {getCategoryBadge(module.category)}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {module.description || `Module code: ${module.code}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {module.documentationUrl && (
                      <a
                        href={module.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Docs
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(module)}
                      disabled={deletingModule === module.code}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingModule === module.code ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
