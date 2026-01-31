import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import ConfigWizard from '../../components/ConfigWizard';

interface WrapperConfig {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
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
  const { publisherId } = useParams<{ publisherId: string }>();
  const [configs, setConfigs] = useState<WrapperConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showWizard, setShowWizard] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WrapperConfig | null>(null);

  useEffect(() => {
    loadConfigs();
  }, [publisherId]);

  async function loadConfigs() {
    try {
      setLoading(true);
      const response = await fetch(`/api/publishers/${publisherId}/configs`);
      if (!response.ok) throw new Error('Failed to load configs');
      const data = await response.json();
      setConfigs(data.data || []);
    } catch (err) {
      console.error('Error loading configs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(configId: string) {
    try {
      const response = await fetch(`/api/publishers/${publisherId}/configs/${configId}/activate`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to activate');
      await loadConfigs();
    } catch (err) {
      console.error('Error activating config:', err);
    }
  }

  async function handlePause(configId: string) {
    try {
      const response = await fetch(`/api/publishers/${publisherId}/configs/${configId}/pause`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to pause');
      await loadConfigs();
    } catch (err) {
      console.error('Error pausing config:', err);
    }
  }

  async function handleDuplicate(configId: string, name: string) {
    try {
      const response = await fetch(`/api/publishers/${publisherId}/configs/${configId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${name} (Copy)` }),
      });
      if (!response.ok) throw new Error('Failed to duplicate');
      await loadConfigs();
    } catch (err) {
      console.error('Error duplicating config:', err);
    }
  }

  async function handleDelete(configId: string) {
    if (!confirm('Are you sure you want to delete this config?')) return;

    try {
      const response = await fetch(`/api/publishers/${publisherId}/configs/${configId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      await loadConfigs();
    } catch (err) {
      console.error('Error deleting config:', err);
    }
  }

  const filteredConfigs = configs.filter(config => {
    const matchesSearch = config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         config.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || config.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    return new Intl.NumberFormat().format(num);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  const parseConditions = (conditionsStr: string) => {
    try {
      return JSON.parse(conditionsStr);
    } catch {
      return [];
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">Sites & Traffic Configs</h1>
        <p className="text-purple-100">
          Manage wrapper configurations for different traffic segments with embedded config architecture (3-4x faster!)
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
              placeholder="Search configs..."
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
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Create Button */}
          <button
            onClick={() => {
              setEditingConfig(null);
              setShowWizard(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition"
          >
            <Plus className="w-5 h-5" />
            New Config
          </button>
        </div>
      </div>

      {/* Configs List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading configs...</p>
        </div>
      ) : filteredConfigs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No configs found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first wrapper config to get started'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => setShowWizard(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Create First Config
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredConfigs.map(config => (
            <div key={config.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{config.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(config.status)}`}>
                        {config.status.toUpperCase()}
                      </span>
                    </div>
                    {config.description && (
                      <p className="text-gray-600">{config.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 bg-gray-50 grid md:grid-cols-2 gap-6">
                {/* Settings */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Settings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timeout:</span>
                      <span className="font-medium">{config.bidderTimeout || 1500}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Granularity:</span>
                      <span className="font-medium capitalize">{config.priceGranularity || 'medium'}</span>
                    </div>
                  </div>
                </div>

                {/* Targeting */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Targeting</h4>
                  {config.rules && config.rules.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      {config.rules.map(rule => {
                        const conditions = parseConditions(rule.conditions);
                        return (
                          <div key={rule.id}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                Priority: {rule.priority}
                              </span>
                              <span className="text-xs text-gray-500">
                                Match {rule.matchType.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-gray-700">
                              {conditions.map((cond: any, idx: number) => (
                                <span key={idx}>
                                  {idx > 0 && <span className="text-gray-400"> {rule.matchType === 'all' ? 'AND' : 'OR'} </span>}
                                  <span className="font-medium">{cond.attribute}</span>
                                  <span className="text-gray-400"> {cond.operator} </span>
                                  <span className="font-medium">{Array.isArray(cond.value) ? cond.value.join(', ') : cond.value}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No targeting rules (fallback config)</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Traffic:</span>
                    <span className="ml-2 font-semibold text-purple-600">{formatNumber(config.impressionsServed)} requests</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Last served:</span>
                    <span className="ml-2 font-medium">{formatDate(config.lastServedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 bg-white border-t border-gray-200 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setEditingConfig(config);
                    setShowWizard(true);
                  }}
                  className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDuplicate(config.id, config.name)}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition"
                >
                  Duplicate
                </button>
                {config.status === 'active' ? (
                  <button
                    onClick={() => handlePause(config.id)}
                    className="px-4 py-2 text-yellow-600 hover:bg-yellow-50 rounded-lg font-medium transition"
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(config.id)}
                    className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg font-medium transition"
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={() => handleDelete(config.id)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Config Wizard Modal */}
      {showWizard && (
        <ConfigWizard
          publisherId={publisherId!}
          config={editingConfig}
          onClose={() => {
            setShowWizard(false);
            setEditingConfig(null);
          }}
          onSave={() => {
            setShowWizard(false);
            setEditingConfig(null);
            loadConfigs();
          }}
        />
      )}
    </div>
  );
}
