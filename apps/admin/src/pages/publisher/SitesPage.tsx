import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { WebsiteCard } from '../../components/WebsiteCard';
import { WebsiteModal } from '../../components/WebsiteModal';
import ConfigWizard from '../../components/ConfigWizard';

interface Website {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'paused' | 'disabled';
  notes?: string;
  configs?: WrapperConfig[];
}

interface WrapperConfig {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  isDefault?: boolean;
  blockWrapper?: boolean;
  bidderTimeout?: number;
  priceGranularity?: string;
  impressionsServed?: number;
  lastServedAt?: string;
  rules?: TargetingRule[];
}

interface TargetingRule {
  id: string;
  conditions: string;
  matchType: 'all' | 'any';
  priority: number;
  enabled: boolean;
}

export function SitesPage() {
  const { user } = useAuthStore();
  const publisherId = user?.publisherId;

  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Website modal state
  const [showWebsiteModal, setShowWebsiteModal] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);

  // Config wizard state
  const [showConfigWizard, setShowConfigWizard] = useState(false);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<WrapperConfig | null>(null);

  useEffect(() => {
    if (publisherId) {
      loadWebsites();
    }
  }, [publisherId]);

  async function loadWebsites() {
    if (!publisherId) {
      console.error('No publisherId available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load websites
      const websitesResponse = await fetch(`/api/publishers/${publisherId}/websites`);
      if (!websitesResponse.ok) throw new Error('Failed to load websites');
      const websitesData = await websitesResponse.json();

      // Load all configs
      const configsResponse = await fetch(`/api/publishers/${publisherId}/configs`);
      if (!configsResponse.ok) throw new Error('Failed to load configs');
      const configsData = await configsResponse.json();

      // Group configs by websiteId
      const configsByWebsite: Record<string, WrapperConfig[]> = {};
      const publisherLevelConfigs: WrapperConfig[] = [];

      for (const config of configsData.data || []) {
        if (config.websiteId) {
          if (!configsByWebsite[config.websiteId]) {
            configsByWebsite[config.websiteId] = [];
          }
          configsByWebsite[config.websiteId].push(config);
        } else {
          publisherLevelConfigs.push(config);
        }
      }

      // Attach configs to websites
      const websitesWithConfigs = (websitesData.websites || []).map((website: Website) => ({
        ...website,
        configs: configsByWebsite[website.id] || [],
      }));

      setWebsites(websitesWithConfigs);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteWebsite(websiteId: string) {
    if (!publisherId) return;

    try {
      const response = await fetch(`/api/publishers/${publisherId}/websites/${websiteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete website');

      await loadWebsites();
    } catch (err) {
      console.error('Error deleting website:', err);
      alert('Failed to delete website');
    }
  }

  async function handleDeleteConfig(configId: string) {
    if (!publisherId) return;

    try {
      const response = await fetch(`/api/publishers/${publisherId}/configs/${configId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete config');

      await loadWebsites();
    } catch (err) {
      console.error('Error deleting config:', err);
      alert('Failed to delete config');
    }
  }

  const filteredWebsites = websites.filter(website => {
    const matchesSearch = website.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         website.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || website.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Early return if no publisherId
  if (!publisherId) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error: No Publisher ID</h2>
          <p className="text-red-700">
            Unable to load sites. Your account is not associated with a publisher.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">Sites & Configurations</h1>
        <p className="text-purple-100">
          Manage your websites and wrapper configurations with advanced targeting and blocking
        </p>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search websites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {/* Create Button */}
          <button
            onClick={() => {
              setEditingWebsite(null);
              setShowWebsiteModal(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition"
          >
            <Plus className="w-5 h-5" />
            New Site
          </button>
        </div>
      </div>

      {/* Websites List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading sites...</p>
        </div>
      ) : filteredWebsites.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No sites found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first site to get started'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => setShowWebsiteModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Create First Site
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWebsites.map(website => (
            <WebsiteCard
              key={website.id}
              website={website}
              onEdit={(website) => {
                setEditingWebsite(website);
                setShowWebsiteModal(true);
              }}
              onDelete={handleDeleteWebsite}
              onAddConfig={(websiteId) => {
                setSelectedWebsiteId(websiteId);
                setEditingConfig(null);
                setShowConfigWizard(true);
              }}
              onEditConfig={(config) => {
                // Find the website this config belongs to
                const website = websites.find(w => w.configs?.some(c => c.id === config.id));
                setSelectedWebsiteId(website?.id || null);
                setEditingConfig(config);
                setShowConfigWizard(true);
              }}
              onDeleteConfig={handleDeleteConfig}
            />
          ))}
        </div>
      )}

      {/* Website Modal */}
      {showWebsiteModal && (
        <WebsiteModal
          website={editingWebsite}
          publisherId={publisherId}
          onClose={() => {
            setShowWebsiteModal(false);
            setEditingWebsite(null);
          }}
          onSave={() => {
            setShowWebsiteModal(false);
            setEditingWebsite(null);
            loadWebsites();
          }}
        />
      )}

      {/* Config Wizard Modal */}
      {showConfigWizard && (
        <ConfigWizard
          publisherId={publisherId}
          websiteId={selectedWebsiteId}
          config={editingConfig}
          onClose={() => {
            setShowConfigWizard(false);
            setEditingConfig(null);
            setSelectedWebsiteId(null);
          }}
          onSave={() => {
            setShowConfigWizard(false);
            setEditingConfig(null);
            setSelectedWebsiteId(null);
            loadWebsites();
          }}
        />
      )}
    </div>
  );
}
