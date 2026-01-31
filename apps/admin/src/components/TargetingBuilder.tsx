import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface Condition {
  attribute: 'geo' | 'device' | 'browser' | 'os' | 'domain';
  operator: 'equals' | 'in' | 'contains' | 'not_in';
  value: string | string[];
}

interface TargetingRules {
  conditions: Condition[];
  matchType: 'all' | 'any';
  priority: number;
}

interface TargetingBuilderProps {
  conditions: Condition[];
  matchType: 'all' | 'any';
  priority: number;
  onChange: (rules: TargetingRules) => void;
}

// Available options for each attribute
const ATTRIBUTE_OPTIONS = [
  { value: 'geo', label: 'Country' },
  { value: 'device', label: 'Device Type' },
  { value: 'browser', label: 'Browser' },
  { value: 'os', label: 'Operating System' },
  { value: 'domain', label: 'Domain' },
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'in', label: 'In List' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_in', label: 'Not In' },
];

// Common values for each attribute
const ATTRIBUTE_VALUES: Record<string, Array<{ value: string; label: string }>> = {
  geo: [
    { value: 'US', label: 'United States' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'CA', label: 'Canada' },
    { value: 'AU', label: 'Australia' },
    { value: 'DE', label: 'Germany' },
    { value: 'FR', label: 'France' },
    { value: 'JP', label: 'Japan' },
    { value: 'BR', label: 'Brazil' },
  ],
  device: [
    { value: 'mobile', label: 'Mobile' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'desktop', label: 'Desktop' },
  ],
  browser: [
    { value: 'chrome', label: 'Chrome' },
    { value: 'safari', label: 'Safari' },
    { value: 'firefox', label: 'Firefox' },
    { value: 'edge', label: 'Edge' },
  ],
  os: [
    { value: 'windows', label: 'Windows' },
    { value: 'macos', label: 'macOS' },
    { value: 'ios', label: 'iOS' },
    { value: 'android', label: 'Android' },
    { value: 'linux', label: 'Linux' },
  ],
};

export default function TargetingBuilder({
  conditions,
  matchType,
  priority,
  onChange,
}: TargetingBuilderProps) {
  const [customValues, setCustomValues] = useState<Record<number, string>>({});

  const addCondition = () => {
    const newConditions = [
      ...conditions,
      {
        attribute: 'geo' as const,
        operator: 'equals' as const,
        value: '',
      },
    ];
    onChange({ conditions: newConditions, matchType, priority });
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    onChange({ conditions: newConditions, matchType, priority });
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange({ conditions: newConditions, matchType, priority });
  };

  const updateMatchType = (newMatchType: 'all' | 'any') => {
    onChange({ conditions, matchType: newMatchType, priority });
  };

  const updatePriority = (newPriority: number) => {
    onChange({ conditions, matchType, priority: newPriority });
  };

  const handleValueChange = (index: number, value: string, isCustom: boolean = false) => {
    if (isCustom) {
      setCustomValues({ ...customValues, [index]: value });
    } else {
      updateCondition(index, { value });
      // Clear custom value if switching to dropdown
      const newCustomValues = { ...customValues };
      delete newCustomValues[index];
      setCustomValues(newCustomValues);
    }
  };

  const handleValueBlur = (index: number) => {
    if (customValues[index] !== undefined) {
      updateCondition(index, { value: customValues[index] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Targeting Rules</h3>
        <p className="text-sm text-gray-600">
          Define when this config should be served based on traffic attributes
        </p>
      </div>

      {/* Match Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Match Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={matchType === 'all'}
              onChange={() => updateMatchType('all')}
              className="text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm">Match ALL conditions (AND)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={matchType === 'any'}
              onChange={() => updateMatchType('any')}
              className="text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm">Match ANY condition (OR)</span>
          </label>
        </div>
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-gray-700">
            Conditions
          </label>
          <button
            type="button"
            onClick={addCondition}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Condition
          </button>
        </div>

        {conditions.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 mb-2">No conditions added</p>
            <p className="text-sm text-gray-400">
              This config will serve as a fallback (matches all traffic)
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                {/* Attribute */}
                <div className="flex-1">
                  <select
                    value={condition.attribute}
                    onChange={(e) =>
                      updateCondition(index, {
                        attribute: e.target.value as Condition['attribute'],
                        value: '', // Reset value when attribute changes
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {ATTRIBUTE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operator */}
                <div className="flex-1">
                  <select
                    value={condition.operator}
                    onChange={(e) =>
                      updateCondition(index, {
                        operator: e.target.value as Condition['operator'],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {OPERATOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value */}
                <div className="flex-1">
                  {ATTRIBUTE_VALUES[condition.attribute] ? (
                    <select
                      value={typeof condition.value === 'string' ? condition.value : ''}
                      onChange={(e) => handleValueChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select {condition.attribute}</option>
                      {ATTRIBUTE_VALUES[condition.attribute].map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      <option value="__custom__">Custom Value...</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={
                        customValues[index] !== undefined
                          ? customValues[index]
                          : typeof condition.value === 'string'
                          ? condition.value
                          : ''
                      }
                      onChange={(e) => handleValueChange(index, e.target.value, true)}
                      onBlur={() => handleValueBlur(index)}
                      placeholder={`Enter ${condition.attribute}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  )}
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeCondition(index)}
                  className="text-red-600 hover:text-red-700 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Priority
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={priority}
            onChange={(e) => updatePriority(parseInt(e.target.value) || 0)}
            min="0"
            max="999"
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-600">
            Higher priority = evaluated first (0-999)
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Recommended: 200+ (very specific), 100-199 (specific), 50-99 (general), 0-49 (fallback)
        </p>
      </div>

      {/* Helper Text */}
      {conditions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            This config will match:
          </h4>
          <p className="text-sm text-blue-800">
            {matchType === 'all' ? 'All of the following:' : 'Any of the following:'}
          </p>
          <ul className="mt-2 space-y-1">
            {conditions.map((cond, index) => (
              <li key={index} className="text-sm text-blue-700">
                • {ATTRIBUTE_OPTIONS.find((a) => a.value === cond.attribute)?.label}{' '}
                {OPERATOR_OPTIONS.find((o) => o.value === cond.operator)?.label.toLowerCase()}{' '}
                <span className="font-semibold">
                  {typeof cond.value === 'string'
                    ? ATTRIBUTE_VALUES[cond.attribute]?.find((v) => v.value === cond.value)
                        ?.label || cond.value
                    : cond.value.join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overlap Warning (placeholder - would need API call to check) */}
      {conditions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ Make sure this config's priority is set correctly to avoid conflicts with other configs
          </p>
        </div>
      )}
    </div>
  );
}
