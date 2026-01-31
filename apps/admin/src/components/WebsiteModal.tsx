import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Website {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'paused' | 'disabled';
  notes?: string;
}

interface WebsiteModalProps {
  website?: Website | null;
  publisherId: string;
  onClose: () => void;
  onSave: () => void;
}

export function WebsiteModal({ website, publisherId, onClose, onSave }: WebsiteModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    status: 'active' as 'active' | 'paused' | 'disabled',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (website) {
      setFormData({
        name: website.name,
        domain: website.domain,
        status: website.status,
        notes: website.notes || '',
      });
    }
  }, [website]);

  const validateDomain = (domain: string): boolean => {
    // Remove protocol and trailing slashes
    const cleaned = domain.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    return domainRegex.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Website name is required');
      return;
    }

    if (!formData.domain.trim()) {
      setError('Domain is required');
      return;
    }

    if (!validateDomain(formData.domain)) {
      setError('Please enter a valid domain (e.g., example.com)');
      return;
    }

    setLoading(true);

    try {
      const url = website
        ? `/api/publishers/${publisherId}/websites/${website.id}`
        : `/api/publishers/${publisherId}/websites`;

      const method = website ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          domain: formData.domain.trim(),
          status: formData.status,
          notes: formData.notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save website');
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving website:', err);
      setError(err instanceof Error ? err.message : 'Failed to save website');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {website ? 'Edit Website' : 'Add New Website'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Website Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., The New York Times"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Human-readable name for this website
            </p>
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Domain <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              placeholder="e.g., nytimes.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Domain name without protocol (https://) or trailing slash
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="disabled">Disabled</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Active websites can serve wrapper configs
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes about this website..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : website ? 'Update Website' : 'Create Website'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
