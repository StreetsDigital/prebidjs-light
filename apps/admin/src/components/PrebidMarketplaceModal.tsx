import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Tabs, Tab } from './ui/Tabs';
import ComponentBrowser from './ComponentBrowser';

const API_BASE_URL = import.meta.env.VITE_API_URL || '${API_BASE_URL}';

// Component types - Re-export for compatibility
export interface BasePrebidComponent {
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

export interface Bidder extends BasePrebidComponent {
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

export interface Module extends BasePrebidComponent {
  category: 'userid' | 'rtd' | 'general' | 'analytics';
  is_recommended?: boolean;
}

export interface Analytics extends BasePrebidComponent {
  provider?: string;
}

export type PrebidComponent = Bidder | Module | Analytics;

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
  const [biddersFilters, setBiddersFilters] = useState({
    capabilityFilter: 'all' as 'all' | 'client' | 'server' | 'both',
    formatFilter: 'all' as 'all' | 'banner' | 'video' | 'native',
    hideAdded: false,
  });

  const [modulesFilters, setModulesFilters] = useState({
    categoryFilter: 'all' as 'all' | 'recommended' | 'userid' | 'rtd' | 'general',
  });

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
          fetch('${API_BASE_URL}/api/prebid/bidders'),
          fetch('${API_BASE_URL}/api/prebid/modules'),
          fetch('${API_BASE_URL}/api/prebid/analytics'),
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

  // Reset search when tab changes
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

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

  if (!isOpen) return null;

  const tabs: Tab[] = [
    {
      id: 'bidders',
      label: `Bidders (${bidders.length})`,
      content: (
        <ComponentBrowser
          type="bidders"
          components={bidders}
          searchQuery={searchQuery}
          addedComponents={addedBidders}
          addingComponent={addingComponent}
          onAdd={handleAdd}
          filters={biddersFilters}
          onFiltersChange={setBiddersFilters}
        />
      ),
    },
    {
      id: 'modules',
      label: `Modules (${modules.length})`,
      content: (
        <ComponentBrowser
          type="modules"
          components={modules}
          searchQuery={searchQuery}
          addedComponents={addedModules}
          addingComponent={addingComponent}
          onAdd={handleAdd}
          filters={modulesFilters}
          onFiltersChange={setModulesFilters}
        />
      ),
    },
    {
      id: 'analytics',
      label: `Analytics (${analytics.length})`,
      content: (
        <ComponentBrowser
          type="analytics"
          components={analytics}
          searchQuery={searchQuery}
          addedComponents={addedAnalytics}
          addingComponent={addingComponent}
          onAdd={handleAdd}
        />
      ),
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
