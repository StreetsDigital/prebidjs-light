import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { PrebidMarketplaceModal } from '../../components/PrebidMarketplaceModal';
import ComponentConfigModal from '../../components/ComponentConfigModal';

interface Module {
  id: string;
  code: string;
  name: string;
  params?: Record<string, any> | null;
  enabled: boolean;
  isPrebidMember: boolean;
  documentationUrl?: string | null;
  dependencies?: string[];
  category: 'userId' | 'rtd' | 'general';
}

export function ModulesPage() {
  const { user } = useAuthStore();
  const publisherId = user?.publisherId;

  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingModule, setDeletingModule] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'userId' | 'rtd' | 'general'>('all');
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  // Fetch modules from API
  useEffect(() => {
    if (!publisherId) return;

    const fetchModules = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `http://localhost:3001/api/publishers/${publisherId}/modules`
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
    const matchesCategory = filterCategory === 'all' || module.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (module: Module) => {
    if (!publisherId) return;

    const confirmMessage = `Remove ${module.name}? This will disable this module in your Prebid configuration.`;

    if (!confirm(confirmMessage)) return;

    try {
      setDeletingModule(module.code);

      const response = await fetch(
        `http://localhost:3001/api/publishers/${publisherId}/modules/${module.code}`,
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

  // Handle adding component from marketplace
  const handleAddComponent = async (component: any, type: 'bidder' | 'module' | 'analytics') => {
    if (!publisherId) return;

    if (type !== 'module') {
      alert('Only modules can be added from this page.');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/publishers/${publisherId}/modules`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            moduleCode: component.code,
            moduleName: component.name,
            category: component.category,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add module');
      }

      // Refresh modules list
      const fetchResponse = await fetch(
        `http://localhost:3001/api/publishers/${publisherId}/modules`
      );
      const { data } = await fetchResponse.json();
      setModules(data);
    } catch (err) {
      console.error('Error adding module:', err);
      alert(err instanceof Error ? err.message : 'Failed to add module');
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

  const prebidMemberCount = modules.filter((m) => m.isPrebidMember).length;
  const userIdCount = modules.filter((m) => m.category === 'userId').length;
  const rtdCount = modules.filter((m) => m.category === 'rtd').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage User ID, RTD, and other Prebid modules for enhanced functionality.
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
          Browse Modules
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Modules</p>
          <p className="text-2xl font-semibold text-gray-900">{modules.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">User ID Modules</p>
          <p className="text-2xl font-semibold text-gray-900">{userIdCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">RTD Modules</p>
          <p className="text-2xl font-semibold text-gray-900">{rtdCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Prebid Members</p>
          <p className="text-2xl font-semibold text-gray-900">{prebidMemberCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as typeof filterCategory)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
          >
            <option value="all">All Categories</option>
            <option value="userId">User ID</option>
            <option value="rtd">Real-Time Data</option>
            <option value="general">General</option>
          </select>
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
                d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {searchQuery || filterCategory !== 'all' ? 'No modules found' : 'No modules added yet'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery || filterCategory !== 'all'
                ? 'No modules match your search criteria.'
                : 'Click "Browse Modules" to add modules to your account.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredModules.map((module) => (
              <li key={module.code} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {module.name}
                        </h3>
                        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                          {module.category}
                        </span>
                        {module.isPrebidMember && (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            Prebid Member
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        Module code: {module.code}
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
                      onClick={() => {
                        setSelectedModule(module);
                        setConfigModalOpen(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                      title="Configure module parameters"
                    >
                      Configure
                    </button>
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

      {/* Marketplace Modal */}
      <PrebidMarketplaceModal
        isOpen={isMarketplaceOpen}
        onClose={() => setIsMarketplaceOpen(false)}
        onAdd={handleAddComponent}
        addedModules={modules.map((m) => m.code)}
      />

      {/* Configuration Modal */}
      {selectedModule && publisherId && (
        <ComponentConfigModal
          isOpen={configModalOpen}
          onClose={() => {
            setConfigModalOpen(false);
            setSelectedModule(null);
          }}
          componentType="module"
          componentCode={selectedModule.code}
          componentName={selectedModule.name}
          publisherId={publisherId}
          onSave={() => {
            // Configuration saved successfully
            // Could reload modules here if we need to show updated config
          }}
        />
      )}
    </div>
  );
}
