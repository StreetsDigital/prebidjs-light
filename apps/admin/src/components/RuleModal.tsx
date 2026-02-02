import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { OptimizationRule, Condition, Action, Schedule } from '../types/optimization';
import { RuleConditions } from './RuleConditions';

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  publisherId: string;
  editingRule?: OptimizationRule | null;
}

export function RuleModal({ isOpen, onClose, onSuccess, publisherId, editingRule }: RuleModalProps) {
  const { token } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState<OptimizationRule['ruleType']>('auto_disable_bidder');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [priority, setPriority] = useState(5);
  const [enabled, setEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingRule) {
      setName(editingRule.name);
      setDescription(editingRule.description || '');
      setRuleType(editingRule.ruleType);
      setConditions(editingRule.conditions);
      setActions(editingRule.actions);
      setPriority(editingRule.priority);
      setEnabled(editingRule.enabled);
    } else {
      resetForm();
    }
  }, [editingRule, isOpen]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setRuleType('auto_disable_bidder');
    setConditions([]);
    setActions([]);
    setPriority(5);
    setEnabled(true);
    setError(null);
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        type: getDefaultActionType(ruleType),
        target: '',
        value: undefined,
      },
    ]);
  };

  const updateAction = (index: number, field: keyof Action, value: any) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const getDefaultActionType = (ruleType: OptimizationRule['ruleType']): string => {
    const typeMap: Record<OptimizationRule['ruleType'], string> = {
      auto_disable_bidder: 'disable_bidder',
      auto_enable_bidder: 'enable_bidder',
      auto_adjust_timeout: 'adjust_timeout',
      auto_adjust_floor: 'adjust_floor',
      alert_notification: 'send_alert',
      traffic_allocation: 'adjust_traffic',
    };
    return typeMap[ruleType];
  };

  const getActionOptions = (ruleType: OptimizationRule['ruleType']) => {
    const options: Record<OptimizationRule['ruleType'], Array<{ value: string; label: string }>> = {
      auto_disable_bidder: [
        { value: 'disable_bidder', label: 'Disable Bidder' },
        { value: 'send_alert', label: 'Send Alert' },
      ],
      auto_enable_bidder: [
        { value: 'enable_bidder', label: 'Enable Bidder' },
        { value: 'send_alert', label: 'Send Alert' },
      ],
      auto_adjust_timeout: [
        { value: 'adjust_timeout', label: 'Adjust Timeout' },
        { value: 'send_alert', label: 'Send Alert' },
      ],
      auto_adjust_floor: [
        { value: 'adjust_floor', label: 'Adjust Floor Price' },
        { value: 'send_alert', label: 'Send Alert' },
      ],
      alert_notification: [
        { value: 'send_alert', label: 'Send Alert' },
      ],
      traffic_allocation: [
        { value: 'adjust_traffic', label: 'Adjust Traffic Allocation' },
        { value: 'send_alert', label: 'Send Alert' },
      ],
    };
    return options[ruleType];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Rule name is required');
      return;
    }

    if (conditions.length === 0) {
      setError('At least one condition is required');
      return;
    }

    if (actions.length === 0) {
      setError('At least one action is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingRule
        ? `/api/publishers/${publisherId}/optimization-rules/${editingRule.id}`
        : `/api/publishers/${publisherId}/optimization-rules`;

      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: description || null,
          ruleType,
          conditions,
          actions,
          priority,
          enabled,
          schedule: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save rule');
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const ruleTypeOptions = [
    { value: 'auto_disable_bidder', label: 'Auto-Disable Bidder' },
    { value: 'auto_enable_bidder', label: 'Auto-Enable Bidder' },
    { value: 'auto_adjust_timeout', label: 'Auto-Adjust Timeout' },
    { value: 'auto_adjust_floor', label: 'Auto-Adjust Floor Price' },
    { value: 'alert_notification', label: 'Alert & Notification' },
    { value: 'traffic_allocation', label: 'Traffic Allocation' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingRule ? 'Edit Rule' : 'Create New Rule'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Disable slow bidders"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this rule does..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Type
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={ruleType}
                  onChange={(e) => {
                    setRuleType(e.target.value as OptimizationRule['ruleType']);
                    setActions([]); // Reset actions when type changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ruleTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Higher priority rules execute first</p>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
                Enable this rule immediately
              </label>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <RuleConditions conditions={conditions} onChange={setConditions} />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Actions
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <button
                  type="button"
                  onClick={addAction}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Action
                </button>
              </div>

              {actions.length === 0 && (
                <div className="text-sm text-gray-500 italic">
                  No actions added. Click "Add Action" to create one.
                </div>
              )}

              {actions.map((action, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Action {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeAction(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Action Type
                      </label>
                      <select
                        value={action.type}
                        onChange={(e) => updateAction(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {getActionOptions(ruleType).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target
                      </label>
                      <input
                        type="text"
                        value={action.target || ''}
                        onChange={(e) => updateAction(index, 'target', e.target.value)}
                        placeholder="e.g., rubicon, leaderboard"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {(action.type === 'adjust_timeout' || action.type === 'adjust_floor' || action.type === 'adjust_traffic') && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Value
                        </label>
                        <input
                          type="number"
                          value={action.value || ''}
                          onChange={(e) => updateAction(index, 'value', parseFloat(e.target.value))}
                          placeholder={action.type === 'adjust_timeout' ? 'e.g., 1500 (ms)' : 'e.g., 0.5'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
