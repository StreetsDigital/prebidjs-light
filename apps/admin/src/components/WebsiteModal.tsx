import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useFormValidation } from '../hooks/useFormValidation';
import { useLoadingState } from '../hooks/useLoadingState';

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
  const validateDomain = (domain: string): boolean => {
    if (!domain) return false;
    // Remove protocol and trailing slashes
    const cleaned = domain.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    return domainRegex.test(cleaned);
  };

  const validators = useMemo(() => ({
    name: (value: string) => {
      if (!value || !value.trim()) {
        return 'Website name is required';
      }
      return null;
    },
    domain: (value: string) => {
      if (!value || !value.trim()) {
        return 'Domain is required';
      }
      if (!validateDomain(value)) {
        return 'Please enter a valid domain (e.g., example.com)';
      }
      return null;
    },
    status: () => null,
    notes: () => null,
  }), []);

  const initialValues = useMemo(() => ({
    name: website?.name || '',
    domain: website?.domain || '',
    status: (website?.status || 'active') as 'active' | 'paused' | 'disabled',
    notes: website?.notes || '',
  }), [website]);

  const { values, errors, handleChange, handleSubmit } = useFormValidation(
    initialValues,
    validators
  );

  const { isLoading, error: submitError, setError, withLoading } = useLoadingState(false);

  useEffect(() => {
    if (website) {
      handleChange('name', website.name);
      handleChange('domain', website.domain);
      handleChange('status', website.status);
      handleChange('notes', website.notes || '');
    }
  }, [website, handleChange]);

  const onSubmit = async () => {
    const result = await withLoading(async () => {
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
          name: values.name.trim(),
          domain: values.domain.trim(),
          status: values.status,
          notes: values.notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save website');
      }

      return true;
    });

    if (result) {
      onSave();
      onClose();
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
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit); }} className="p-6 space-y-6">
          {/* Error message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {submitError}
            </div>
          )}

          {/* Website Name */}
          <div>
            <label htmlFor="website-name" className="block text-sm font-medium text-gray-700 mb-2">
              Website Name <span className="text-red-500">*</span>
            </label>
            <input
              id="website-name"
              type="text"
              value={values.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., The New York Times"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
            {!errors.name && (
              <p className="mt-1 text-sm text-gray-500">
                Human-readable name for this website
              </p>
            )}
          </div>

          {/* Domain */}
          <div>
            <label htmlFor="website-domain" className="block text-sm font-medium text-gray-700 mb-2">
              Domain <span className="text-red-500">*</span>
            </label>
            <input
              id="website-domain"
              type="text"
              value={values.domain}
              onChange={(e) => handleChange('domain', e.target.value)}
              placeholder="e.g., nytimes.com"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.domain ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {errors.domain && (
              <p className="mt-1 text-sm text-red-600">{errors.domain}</p>
            )}
            {!errors.domain && (
              <p className="mt-1 text-sm text-gray-500">
                Domain name without protocol (https://) or trailing slash
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="website-status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="website-status"
              value={values.status}
              onChange={(e) => handleChange('status', e.target.value)}
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
            <label htmlFor="website-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="website-notes"
              value={values.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
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
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : website ? 'Update Website' : 'Create Website'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
