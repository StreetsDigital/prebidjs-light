import React, { useState, useEffect } from 'react';
import ParameterField from './ParameterField';

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

interface DynamicParameterFormProps {
  schema: ParameterSchema;
  initialValues: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  saving: boolean;
  onCancel: () => void;
}

export default function DynamicParameterForm({
  schema,
  initialValues,
  onSubmit,
  saving,
  onCancel,
}: DynamicParameterFormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Update values when initialValues change
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleFieldChange = (name: string, value: any) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    schema.parameters.forEach((param) => {
      const value = values[param.name];

      // Check required fields
      if (param.required && (value === undefined || value === null || value === '')) {
        newErrors[param.name] = 'This field is required';
        return;
      }

      // Skip validation if value is empty and not required
      if (value === undefined || value === null || value === '') return;

      // Type validation
      if (param.type === 'number') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          newErrors[param.name] = 'Must be a valid number';
          return;
        }

        // Range validation
        if (param.validation?.min !== undefined && numValue < param.validation.min) {
          newErrors[param.name] = `Must be at least ${param.validation.min}`;
        }
        if (param.validation?.max !== undefined && numValue > param.validation.max) {
          newErrors[param.name] = `Must be at most ${param.validation.max}`;
        }
      }

      // Enum validation
      if (param.validation?.enum && !param.validation.enum.includes(value)) {
        newErrors[param.name] = `Must be one of: ${param.validation.enum.join(', ')}`;
      }

      // Pattern validation
      if (param.validation?.pattern && typeof value === 'string') {
        const regex = new RegExp(param.validation.pattern);
        if (!regex.test(value)) {
          newErrors[param.name] = 'Invalid format';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Only submit non-empty values
    const valuesToSubmit: Record<string, any> = {};
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        valuesToSubmit[key] = value;
      }
    });

    await onSubmit(valuesToSubmit);
  };

  const getPreviewJson = () => {
    const nonEmptyValues: Record<string, any> = {};
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        nonEmptyValues[key] = value;
      }
    });
    return JSON.stringify(nonEmptyValues, null, 2);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form Fields */}
      <div className="space-y-4">
        {schema.parameters.map((param) => (
          <ParameterField
            key={param.name}
            parameter={param}
            value={values[param.name]}
            onChange={(value) => handleFieldChange(param.name, value)}
            error={errors[param.name]}
          />
        ))}
      </div>

      {/* Preview Toggle */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showPreview ? 'Hide' : 'Show'} JSON Preview
        </button>

        {showPreview && (
          <pre className="mt-3 p-4 bg-gray-50 rounded-lg text-sm overflow-x-auto">
            {getPreviewJson()}
          </pre>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
