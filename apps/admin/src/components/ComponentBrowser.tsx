import { useMemo } from 'react';
import ComponentCard from './ComponentCard';
import type { PrebidComponent, Bidder, Module } from './PrebidMarketplaceModal';

interface ComponentBrowserProps {
  type: 'bidders' | 'modules' | 'analytics';
  components: PrebidComponent[];
  searchQuery: string;
  addedComponents: string[];
  addingComponent: string | null;
  onAdd: (component: PrebidComponent, type: 'bidder' | 'module' | 'analytics') => Promise<void>;
  filters?: {
    // Bidder filters
    capabilityFilter?: 'all' | 'client' | 'server' | 'both';
    formatFilter?: 'all' | 'banner' | 'video' | 'native';
    hideAdded?: boolean;
    // Module filters
    categoryFilter?: 'all' | 'recommended' | 'userid' | 'rtd' | 'general';
  };
  onFiltersChange?: (filters: any) => void;
}

export default function ComponentBrowser({
  type,
  components,
  searchQuery,
  addedComponents,
  addingComponent,
  onAdd,
  filters = {},
  onFiltersChange,
}: ComponentBrowserProps) {
  // Filter components based on search and type-specific filters
  const filteredComponents = useMemo(() => {
    let filtered = components;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.code.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query)
      );
    }

    // Type-specific filters
    if (type === 'bidders') {
      const bidders = filtered as Bidder[];

      if (filters.capabilityFilter && filters.capabilityFilter !== 'all') {
        filtered = bidders.filter((b) => b.capability === filters.capabilityFilter);
      }

      if (filters.formatFilter && filters.formatFilter !== 'all') {
        filtered = bidders.filter((b) => b.ad_formats.includes(filters.formatFilter as any));
      }

      if (filters.hideAdded) {
        filtered = filtered.filter((c) => !addedComponents.includes(c.code));
      }
    } else if (type === 'modules') {
      const modules = filtered as Module[];

      if (filters.categoryFilter === 'recommended') {
        filtered = modules.filter((m) => m.is_recommended);
      } else if (filters.categoryFilter && filters.categoryFilter !== 'all') {
        filtered = modules.filter((m) => m.category === filters.categoryFilter);
      }
    }

    return filtered;
  }, [components, searchQuery, type, filters, addedComponents]);

  // Render filters based on type
  const renderFilters = () => {
    if (type === 'bidders') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Capability</label>
            <select
              value={filters.capabilityFilter || 'all'}
              onChange={(e) =>
                onFiltersChange?.({ ...filters, capabilityFilter: e.target.value })
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">All</option>
              <option value="client">Client-side</option>
              <option value="server">Server-side</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ad Format</label>
            <select
              value={filters.formatFilter || 'all'}
              onChange={(e) => onFiltersChange?.({ ...filters, formatFilter: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">All</option>
              <option value="banner">Banner</option>
              <option value="video">Video</option>
              <option value="native">Native</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hideAdded || false}
                onChange={(e) =>
                  onFiltersChange?.({ ...filters, hideAdded: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Hide added</span>
            </label>
          </div>
        </div>
      );
    } else if (type === 'modules') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filters.categoryFilter || 'all'}
              onChange={(e) =>
                onFiltersChange?.({ ...filters, categoryFilter: e.target.value })
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">All</option>
              <option value="recommended">Recommended</option>
              <option value="userid">User ID</option>
              <option value="rtd">Real-Time Data</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      {renderFilters()}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
        {filteredComponents.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No {type} found</p>
          </div>
        ) : (
          filteredComponents.map((component) => (
            <ComponentCard
              key={component.code}
              component={component}
              type={type === 'bidders' ? 'bidder' : type === 'modules' ? 'module' : 'analytics'}
              isAdded={addedComponents.includes(component.code)}
              isAdding={addingComponent === component.code}
              onAdd={onAdd}
            />
          ))
        )}
      </div>

      {/* Count */}
      <div className="text-xs text-gray-500 text-right">
        Showing {filteredComponents.length} of {components.length} {type}
      </div>
    </div>
  );
}
