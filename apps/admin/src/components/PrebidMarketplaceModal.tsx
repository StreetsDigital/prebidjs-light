import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { Tabs, Tab } from './ui/Tabs';

// Component types
interface BasePrebidComponent {
  code: string;
  name: string;
  description: string;
  documentation_url?: string;
  privacy_compliance?: {
    gdpr?: boolean;
    coppa?: boolean;
    gpp?: boolean;
    usp?: boolean;
  };
}

interface Bidder extends BasePrebidComponent {
  capability: 'client' | 'server' | 'both';
  ad_formats: Array<'banner' | 'video' | 'native'>;
  features?: {
    deals?: boolean;
    floors?: boolean;
    user_ids?: boolean;
    first_party_data?: boolean;
  };
  is_built_in?: boolean;
}

interface Module extends BasePrebidComponent {
  category: 'userid' | 'rtd' | 'general' | 'analytics';
  is_recommended?: boolean;
}

interface Analytics extends BasePrebidComponent {
  provider?: string;
}

type PrebidComponent = Bidder | Module | Analytics;

interface PrebidMarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (component: PrebidComponent, type: 'bidder' | 'module' | 'analytics') => Promise<void>;
  addedBidders?: string[]; // Array of bidder codes already added
  addedModules?: string[]; // Array of module codes already added
  addedAnalytics?: string[]; // Array of analytics codes already added
}

export function PrebidMarketplaceModal({
  isOpen,
  onClose,
  onAdd,
  addedBidders = [],
  addedModules = [],
  addedAnalytics = [],
}: PrebidMarketplaceModalProps) {
  const [activeTab, setActiveTab] = useState<'bidders' | 'modules' | 'analytics'>('bidders');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);

  // Filter states
  const [biddersCapabilityFilter, setBiddersCapabilityFilter] = useState<'all' | 'client' | 'server' | 'both'>('all');
  const [biddersFormatFilter, setBiddersFormatFilter] = useState<'all' | 'banner' | 'video' | 'native'>('all');
  const [biddersHideAdded, setBiddersHideAdded] = useState(false);
  const [modulesCategoryFilter, setModulesCategoryFilter] = useState<'all' | 'recommended' | 'userid' | 'rtd' | 'general'>('all');

  // Adding state
  const [addingComponent, setAddingComponent] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [biddersRes, modulesRes, analyticsRes] = await Promise.all([
          fetch('http://localhost:3001/api/prebid/bidders'),
          fetch('http://localhost:3001/api/prebid/modules'),
          fetch('http://localhost:3001/api/prebid/analytics'),
        ]);

        if (!biddersRes.ok || !modulesRes.ok || !analyticsRes.ok) {
          throw new Error('Failed to fetch Prebid components');
        }

        const [biddersData, modulesData, analyticsData] = await Promise.all([
          biddersRes.json(),
          modulesRes.json(),
          analyticsRes.json(),
        ]);

        setBidders(biddersData.data || []);
        setModules(modulesData.data || []);
        setAnalytics(analyticsData.data || []);
      } catch (err) {
        console.error('Error fetching Prebid components:', err);
        setError(err instanceof Error ? err.message : 'Failed to load components');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Reset filters when tab changes
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // Filter bidders
  const filteredBidders = useMemo(() => {
    let filtered = bidders;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.code.toLowerCase().includes(query) ||
          b.description.toLowerCase().includes(query)
      );
    }

    // Capability filter
    if (biddersCapabilityFilter !== 'all') {
      filtered = filtered.filter((b) => b.capability === biddersCapabilityFilter);
    }

    // Format filter
    if (biddersFormatFilter !== 'all') {
      filtered = filtered.filter((b) => b.ad_formats.includes(biddersFormatFilter));
    }

    // Hide added filter
    if (biddersHideAdded) {
      filtered = filtered.filter((b) => !addedBidders.includes(b.code));
    }

    return filtered;
  }, [bidders, searchQuery, biddersCapabilityFilter, biddersFormatFilter, biddersHideAdded, addedBidders]);

  // Filter modules
  const filteredModules = useMemo(() => {
    let filtered = modules;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.code.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (modulesCategoryFilter === 'recommended') {
      filtered = filtered.filter((m) => m.is_recommended);
    } else if (modulesCategoryFilter !== 'all') {
      filtered = filtered.filter((m) => m.category === modulesCategoryFilter);
    }

    return filtered;
  }, [modules, searchQuery, modulesCategoryFilter]);

  // Filter analytics
  const filteredAnalytics = useMemo(() => {
    if (!searchQuery) return analytics;

    const query = searchQuery.toLowerCase();
    return analytics.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.code.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
    );
  }, [analytics, searchQuery]);

  // Handle add component
  const handleAdd = async (component: PrebidComponent, type: 'bidder' | 'module' | 'analytics') => {
    setAddingComponent(component.code);
    try {
      await onAdd(component, type);
    } catch (err) {
      console.error('Error adding component:', err);
    } finally {
      setAddingComponent(null);
    }
  };

  // Check if component is already added
  const isAdded = (code: string, type: 'bidder' | 'module' | 'analytics') => {
    if (type === 'bidder') return addedBidders.includes(code);
    if (type === 'module') return addedModules.includes(code);
    if (type === 'analytics') return addedAnalytics.includes(code);
    return false;
  };

  // Render component card
  const renderComponentCard = (component: PrebidComponent, type: 'bidder' | 'module' | 'analytics') => {
    const added = isAdded(component.code, type);
    const isBidder = type === 'bidder';
    const isModule = type === 'module';
    const bidder = isBidder ? (component as Bidder) : null;
    const module = isModule ? (component as Module) : null;

    return (
      <div key={component.code} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{component.name}</h3>
            <p className="text-xs text-gray-500 truncate">{component.code}</p>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            {component.documentation_url && (
              <a
                href={component.documentation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Docs
              </a>
            )}
            <button
              type="button"
              onClick={() => !added && handleAdd(component, type)}
              disabled={added || addingComponent === component.code}
              className={`text-xs px-3 py-1 rounded-md transition ${
                added
                  ? 'bg-green-50 text-green-700 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {addingComponent === component.code ? 'Adding...' : added ? 'Added ✓' : 'Add'}
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{component.description}</p>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          {bidder?.is_built_in && (
            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
              Built-in
            </span>
          )}

          {bidder && (
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
              bidder.capability === 'both'
                ? 'bg-purple-50 text-purple-700 ring-purple-700/10'
                : bidder.capability === 'client'
                ? 'bg-green-50 text-green-700 ring-green-600/20'
                : 'bg-blue-50 text-blue-700 ring-blue-700/10'
            }`}>
              {bidder.capability === 'both' ? 'Client + Server' : bidder.capability === 'client' ? 'Client-side' : 'Server-side'}
            </span>
          )}

          {module && (
            <>
              {module.is_recommended && (
                <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                  Recommended
                </span>
              )}
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                {module.category}
              </span>
            </>
          )}

          {/* Privacy compliance badges */}
          {component.privacy_compliance?.gdpr && (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              GDPR
            </span>
          )}
          {component.privacy_compliance?.coppa && (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              COPPA
            </span>
          )}
          {component.privacy_compliance?.gpp && (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              GPP
            </span>
          )}
          {component.privacy_compliance?.usp && (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              USP
            </span>
          )}

          {/* Bidder features */}
          {bidder?.features?.deals && (
            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
              Deals
            </span>
          )}
          {bidder?.features?.floors && (
            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
              Floors
            </span>
          )}
          {bidder?.features?.user_ids && (
            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
              User IDs
            </span>
          )}
          {bidder?.features?.first_party_data && (
            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
              FPD
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render bidders tab content
  const renderBiddersTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Capability</label>
          <select
            value={biddersCapabilityFilter}
            onChange={(e) => setBiddersCapabilityFilter(e.target.value as any)}
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
            value={biddersFormatFilter}
            onChange={(e) => setBiddersFormatFilter(e.target.value as any)}
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
              checked={biddersHideAdded}
              onChange={(e) => setBiddersHideAdded(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Hide added</span>
          </label>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
        {filteredBidders.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No bidders found</p>
          </div>
        ) : (
          filteredBidders.map((bidder) => renderComponentCard(bidder, 'bidder'))
        )}
      </div>

      {/* Count */}
      <div className="text-xs text-gray-500 text-right">
        Showing {filteredBidders.length} of {bidders.length} bidders
      </div>
    </div>
  );

  // Render modules tab content
  const renderModulesTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
          <select
            value={modulesCategoryFilter}
            onChange={(e) => setModulesCategoryFilter(e.target.value as any)}
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

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
        {filteredModules.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No modules found</p>
          </div>
        ) : (
          filteredModules.map((module) => renderComponentCard(module, 'module'))
        )}
      </div>

      {/* Count */}
      <div className="text-xs text-gray-500 text-right">
        Showing {filteredModules.length} of {modules.length} modules
      </div>
    </div>
  );

  // Render analytics tab content
  const renderAnalyticsTab = () => (
    <div className="space-y-4">
      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
        {filteredAnalytics.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No analytics providers found</p>
          </div>
        ) : (
          filteredAnalytics.map((analytics) => renderComponentCard(analytics, 'analytics'))
        )}
      </div>

      {/* Count */}
      <div className="text-xs text-gray-500 text-right">
        Showing {filteredAnalytics.length} of {analytics.length} analytics providers
      </div>
    </div>
  );

  if (!isOpen) return null;

  const tabs: Tab[] = [
    {
      id: 'bidders',
      label: `Bidders (${bidders.length})`,
      content: renderBiddersTab(),
    },
    {
      id: 'modules',
      label: `Modules (${modules.length})`,
      content: renderModulesTab(),
    },
    {
      id: 'analytics',
      label: `Analytics (${analytics.length})`,
      content: renderAnalyticsTab(),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Prebid Marketplace</h2>
            <p className="text-sm text-gray-500 mt-1">Browse and add Prebid components to your account</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-4 py-2"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : (
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as 'bidders' | 'modules' | 'analytics')}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
