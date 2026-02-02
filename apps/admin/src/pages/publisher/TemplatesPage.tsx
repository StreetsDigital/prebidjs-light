import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { FileText, Plus, Trash2, Download } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '${API_BASE_URL}';

interface Template {
  id: string;
  name: string;
  description: string;
  templateType: 'preset' | 'custom' | 'community';
  isPublic: boolean;
  useCount: number;
  createdAt: string;
  previewConfig: {
    bidders: string[];
    modules: string[];
    analytics: string[];
  };
}

export function TemplatesPage() {
  const { user } = useAuthStore();
  const publisherId = user?.publisherId;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'preset' | 'custom'>('all');
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (!publisherId) return;

    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('${API_BASE_URL}/api/templates');

        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }

        const { data } = await response.json();
        setTemplates(data);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [publisherId]);

  const filteredTemplates = templates.filter((template) => {
    if (filterType === 'all') return true;
    return template.templateType === filterType;
  });

  const handleApplyTemplate = async (templateId: string) => {
    if (!publisherId) return;

    if (!confirm('Apply this template? This will add the components to your configuration.')) {
      return;
    }

    try {
      setApplyingTemplate(templateId);

      const response = await fetch(
        `${API_BASE_URL}/api/publishers/${publisherId}/apply-template`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId,
            targetSites: 'all',
            mergeStrategy: 'append',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to apply template');
      }

      alert('Template applied successfully!');
    } catch (err) {
      console.error('Error applying template:', err);
      alert('Failed to apply template');
    } finally {
      setApplyingTemplate(null);
    }
  };

  const getTypeBadge = (type: string) => {
    const badges = {
      preset: 'bg-blue-50 text-blue-700 ring-blue-700/10',
      custom: 'bg-green-50 text-green-700 ring-green-700/10',
      community: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    };
    return badges[type as keyof typeof badges] || badges.preset;
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
        <h1 className="text-2xl font-bold text-gray-900">Configuration Templates</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pre-built configurations for common use cases
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Templates</p>
          <p className="text-2xl font-semibold text-gray-900">{templates.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Preset Templates</p>
          <p className="text-2xl font-semibold text-gray-900">
            {templates.filter((t) => t.templateType === 'preset').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Custom Templates</p>
          <p className="text-2xl font-semibold text-gray-900">
            {templates.filter((t) => t.templateType === 'custom').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('preset')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filterType === 'preset'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Preset
          </button>
          <button
            onClick={() => setFilterType('custom')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filterType === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getTypeBadge(
                      template.templateType
                    )}`}
                  >
                    {template.templateType}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{template.description}</p>

            <div className="space-y-2 mb-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Modules:</span> {template.previewConfig.modules.length}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Analytics:</span> {template.previewConfig.analytics.length}
              </div>
              <div className="text-sm text-gray-500">Used {template.useCount} times</div>
            </div>

            <button
              onClick={() => handleApplyTemplate(template.id)}
              disabled={applyingTemplate === template.id}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {applyingTemplate === template.id ? 'Applying...' : 'Apply Template'}
            </button>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No templates found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {filterType === 'custom'
              ? 'Create your first custom template'
              : 'No templates match your filter'}
          </p>
        </div>
      )}
    </div>
  );
}
