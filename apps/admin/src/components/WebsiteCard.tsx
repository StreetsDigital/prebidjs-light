import { useState } from 'react';
import { Globe, ChevronDown, ChevronUp, Edit, Trash2, Plus } from 'lucide-react';

interface WrapperConfig {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  isDefault?: boolean;
  blockWrapper?: boolean;
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

interface Website {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'paused' | 'disabled';
  notes?: string;
  configs?: WrapperConfig[];
}

interface WebsiteCardProps {
  website: Website;
  onEdit: (website: Website) => void;
  onDelete: (websiteId: string) => void;
  onAddConfig: (websiteId: string) => void;
  onEditConfig: (config: WrapperConfig) => void;
  onDeleteConfig: (configId: string) => void;
}

export function WebsiteCard({
  website,
  onEdit,
  onDelete,
  onAddConfig,
  onEditConfig,
  onDeleteConfig,
}: WebsiteCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'disabled':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfigTypeLabel = (config: WrapperConfig) => {
    if (config.blockWrapper) {
      return { label: 'BLOCKING', color: 'bg-red-100 text-red-800' };
    }
    if (config.isDefault) {
      return { label: 'GLOBAL', color: 'bg-blue-100 text-blue-800' };
    }
    if (config.rules && config.rules.length > 0) {
      return { label: 'TARGETED', color: 'bg-purple-100 text-purple-800' };
    }
    return { label: 'STANDARD', color: 'bg-gray-100 text-gray-800' };
  };

  const parseConditions = (conditionsStr: string) => {
    try {
      return JSON.parse(conditionsStr);
    } catch {
      return [];
    }
  };

  const configs = website.configs || [];
  const globalConfig = configs.find(c => c.isDefault);
  const specificConfigs = configs.filter(c => !c.isDefault);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-6 h-6 text-gray-400" />
              <h3 className="text-xl font-bold text-gray-900">{website.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(website.status)}`}>
                {website.status.toUpperCase()}
              </span>
            </div>
            <div className="ml-9 space-y-1">
              <p className="text-sm text-gray-600">{website.domain}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">
                  {configs.length} {configs.length === 1 ? 'config' : 'configs'}
                </span>
                {globalConfig && (
                  <span className="text-blue-600 font-medium">
                    ✓ Has global config
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddConfig(website.id)}
              className="px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition flex items-center gap-2"
              title="Add Config"
            >
              <Plus className="w-4 h-4" />
              Add Config
            </button>
            <button
              onClick={() => onEdit(website)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Edit Website"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete website "${website.name}"? This will also delete all configs.`)) {
                  onDelete(website.id);
                }
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Delete Website"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {configs.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded configs list */}
      {expanded && configs.length > 0 && (
        <div className="p-6 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Configurations</h4>

          <div className="space-y-3">
            {/* Global config first */}
            {globalConfig && (
              <div className="bg-white rounded-lg border border-blue-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-semibold text-gray-900">{globalConfig.name}</h5>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getConfigTypeLabel(globalConfig).color}`}>
                        {getConfigTypeLabel(globalConfig).label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(globalConfig.status)}`}>
                        {globalConfig.status.toUpperCase()}
                      </span>
                    </div>
                    {globalConfig.description && (
                      <p className="text-sm text-gray-600">{globalConfig.description}</p>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      Default config - applies when no specific rules match
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditConfig(globalConfig)}
                      className="text-sm px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this config?')) {
                          onDeleteConfig(globalConfig.id);
                        }
                      }}
                      className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Specific configs */}
            {specificConfigs.map(config => {
              const typeInfo = getConfigTypeLabel(config);
              return (
                <div key={config.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-gray-900">{config.name}</h5>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(config.status)}`}>
                          {config.status.toUpperCase()}
                        </span>
                      </div>
                      {config.description && (
                        <p className="text-sm text-gray-600 mb-2">{config.description}</p>
                      )}

                      {/* Targeting rules summary */}
                      {config.rules && config.rules.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {config.rules.map(rule => {
                            const conditions = parseConditions(rule.conditions);
                            return (
                              <div key={rule.id} className="text-xs text-gray-600">
                                <span className="font-medium text-purple-600">Priority {rule.priority}:</span>
                                {' '}
                                {conditions.map((cond: any, idx: number) => (
                                  <span key={idx}>
                                    {idx > 0 && <span className="text-gray-400"> {rule.matchType === 'all' ? 'AND' : 'OR'} </span>}
                                    <span className="font-medium">{cond.attribute}</span>
                                    <span className="text-gray-400"> {cond.operator} </span>
                                    <span className="font-medium">{Array.isArray(cond.value) ? cond.value.join(', ') : cond.value}</span>
                                  </span>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Blocking warning */}
                      {config.blockWrapper && (
                        <div className="mt-2 text-xs text-red-600 font-medium">
                          ⚠️ Wrapper will NOT initialize when this config matches
                        </div>
                      )}

                      {/* Stats */}
                      {config.impressionsServed !== undefined && (
                        <div className="mt-2 text-xs text-gray-500">
                          {config.impressionsServed.toLocaleString()} requests served
                          {config.lastServedAt && ` • Last: ${new Date(config.lastServedAt).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditConfig(config)}
                        className="text-sm px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this config?')) {
                            onDeleteConfig(config.id);
                          }
                        }}
                        className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state when no configs */}
      {expanded && configs.length === 0 && (
        <div className="p-6 bg-gray-50 text-center">
          <p className="text-gray-500 mb-3">No configurations yet</p>
          <button
            onClick={() => onAddConfig(website.id)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Plus className="w-4 h-4" />
            Create First Config
          </button>
        </div>
      )}
    </div>
  );
}
