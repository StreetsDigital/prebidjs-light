import React from 'react';
import { Info } from 'lucide-react';

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

interface ParameterFieldProps {
  parameter: Parameter;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export default function ParameterField({
  parameter,
  value,
  onChange,
  error,
}: ParameterFieldProps) {
  const renderField = () => {
    // Boolean field - checkbox
    if (parameter.type === 'boolean') {
      return (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Enable</span>
        </label>
      );
    }

    // Enum field - select dropdown
    if (parameter.validation?.enum) {
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select {parameter.name}</option>
          {parameter.validation.enum.map((option) => (
            <option key={String(option)} value={option}>
              {String(option)}
            </option>
          ))}
        </select>
      );
    }

    // Number field
    if (parameter.type === 'number') {
      return (
        <input
          type="number"
          value={value !== undefined && value !== null ? value : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          min={parameter.validation?.min}
          max={parameter.validation?.max}
          placeholder={parameter.defaultValue !== undefined ? String(parameter.defaultValue) : ''}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      );
    }

    // Object or Array - JSON textarea
    if (parameter.type === 'object' || parameter.type === 'array') {
      const jsonValue = value ? JSON.stringify(value, null, 2) : '';

      return (
        <textarea
          value={jsonValue}
          onChange={(e) => {
            try {
              if (!e.target.value) {
                onChange(undefined);
              } else {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              }
            } catch {
              // Invalid JSON - don't update yet
            }
          }}
          rows={6}
          placeholder={`Enter ${parameter.type} as JSON`}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      );
    }

    // String field (default)
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        pattern={parameter.validation?.pattern}
        placeholder={parameter.defaultValue !== undefined ? String(parameter.defaultValue) : ''}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
    );
  };

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">
          {parameter.name}
          {parameter.required && <span className="text-red-500 ml-1">*</span>}
        </span>

        {/* Info tooltip */}
        {parameter.description && (
          <div className="group relative">
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-64">
              <div className="bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg">
                {parameter.description}

                {/* Show validation hints */}
                {parameter.validation?.min !== undefined && (
                  <div className="mt-1 text-gray-300">Min: {parameter.validation.min}</div>
                )}
                {parameter.validation?.max !== undefined && (
                  <div className="mt-1 text-gray-300">Max: {parameter.validation.max}</div>
                )}
                {parameter.validation?.pattern && (
                  <div className="mt-1 text-gray-300 font-mono text-xs">
                    Pattern: {parameter.validation.pattern}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </label>

      {/* Field */}
      {renderField()}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Helper text */}
      {!error && parameter.defaultValue !== undefined && (
        <p className="text-xs text-gray-500">
          Default: {JSON.stringify(parameter.defaultValue)}
        </p>
      )}
    </div>
  );
}
