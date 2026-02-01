import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import DynamicParameterForm from './DynamicParameterForm';

interface Parameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  description: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

interface ParameterSchema {
  componentCode: string;
  componentType: 'bidder' | 'module' | 'analytics';
  parameters: Parameter[];
}

interface ComponentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  componentType: 'bidder' | 'module' | 'analytics';
  componentCode: string;
  componentName: string;
  publisherId: string;
  websiteId?: string;
  adUnitId?: string;
  onSave?: () => void;
}

export default function ComponentConfigModal({
  isOpen,
  onClose,
  componentType,
  componentCode,
  componentName,
  publisherId,
  websiteId,
  adUnitId,
  onSave,
}: ComponentConfigModalProps) {
  const [schema, setSchema] = useState<ParameterSchema | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSchema();
      loadCurrentValues();
    }
  }, [isOpen, componentType, componentCode, publisherId, websiteId, adUnitId]);

  const loadSchema = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/components/${componentType}/${componentCode}/parameters`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load parameter schema');
      }

      const result = await response.json();
      setSchema(result.data);
    } catch (err) {
      console.error('Error loading schema:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schema');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentValues = async () => {
    try {
      const params = new URLSearchParams();
      if (websiteId) params.append('websiteId', websiteId);
      if (adUnitId) params.append('adUnitId', adUnitId);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/publishers/${publisherId}/components/${componentType}/${componentCode}/parameters?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        // If no values exist yet, that's okay
        if (response.status === 404) {
          setCurrentValues({});
          return;
        }
        throw new Error('Failed to load current values');
      }

      const result = await response.json();
      setCurrentValues(result.data || {});
    } catch (err) {
      console.error('Error loading current values:', err);
      // Non-critical error - we can continue with empty values
      setCurrentValues({});
    }
  };

  const handleSave = async (values: Record<string, any>) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/publishers/${publisherId}/components/${componentType}/${componentCode}/parameters`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            websiteId,
            adUnitId,
            parameters: values,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save parameters');
      }

      // Success!
      onSave?.();
      onClose();
    } catch (err) {
      console.error('Error saving parameters:', err);
      setError(err instanceof Error ? err.message : 'Failed to save parameters');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Configure {componentName}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {componentType === 'bidder' && 'Configure bidder parameters'}
              {componentType === 'module' && 'Configure module settings'}
              {componentType === 'analytics' && 'Configure analytics adapter'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && schema && (
            <>
              {schema.parameters.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    No configurable parameters for this {componentType}.
                  </p>
                </div>
              ) : (
                <DynamicParameterForm
                  schema={schema}
                  initialValues={currentValues}
                  onSubmit={handleSave}
                  saving={saving}
                  onCancel={onClose}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
