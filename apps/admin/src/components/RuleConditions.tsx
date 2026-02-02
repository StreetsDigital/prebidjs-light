import { Condition } from '../types/optimization';

interface RuleConditionsProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export function RuleConditions({ conditions, onChange }: RuleConditionsProps) {
  const addCondition = () => {
    onChange([
      ...conditions,
      {
        metric: 'timeout_rate',
        operator: '>',
        value: 0,
        timeWindow: '1h',
        target: '',
      },
    ]);
  };

  const updateCondition = (index: number, field: keyof Condition, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const metricOptions = [
    { value: 'timeout_rate', label: 'Timeout Rate (%)' },
    { value: 'response_rate', label: 'Response Rate (%)' },
    { value: 'avg_latency', label: 'Avg Latency (ms)' },
    { value: 'revenue', label: 'Revenue ($)' },
    { value: 'win_rate', label: 'Win Rate (%)' },
    { value: 'fill_rate', label: 'Fill Rate (%)' },
  ];

  const operatorOptions = [
    { value: '>', label: '>' },
    { value: '<', label: '<' },
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
    { value: '==', label: '==' },
    { value: '!=', label: '!=' },
  ];

  const timeWindowOptions = [
    { value: '5m', label: 'Last 5 minutes' },
    { value: '15m', label: 'Last 15 minutes' },
    { value: '30m', label: 'Last 30 minutes' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '6h', label: 'Last 6 hours' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Conditions
          <span className="text-red-500 ml-1">*</span>
        </label>
        <button
          type="button"
          onClick={addCondition}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + Add Condition
        </button>
      </div>

      {conditions.length === 0 && (
        <div className="text-sm text-gray-500 italic">
          No conditions added. Click "Add Condition" to create one.
        </div>
      )}

      {conditions.map((condition, index) => (
        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Condition {index + 1}</span>
            <button
              type="button"
              onClick={() => removeCondition(index)}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Metric
              </label>
              <select
                value={condition.metric}
                onChange={(e) => updateCondition(index, 'metric', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {metricOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target (Optional)
              </label>
              <input
                type="text"
                value={condition.target || ''}
                onChange={(e) => updateCondition(index, 'target', e.target.value)}
                placeholder="e.g., rubicon, leaderboard"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operator
              </label>
              <select
                value={condition.operator}
                onChange={(e) => updateCondition(index, 'operator', e.target.value as Condition['operator'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {operatorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="number"
                value={condition.value}
                onChange={(e) => updateCondition(index, 'value', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Window
              </label>
              <select
                value={condition.timeWindow}
                onChange={(e) => updateCondition(index, 'timeWindow', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeWindowOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-2">
            Preview: {condition.metric.replace('_', ' ')}
            {condition.target ? ` for ${condition.target}` : ''} {condition.operator} {condition.value} in {condition.timeWindow}
          </div>
        </div>
      ))}
    </div>
  );
}
