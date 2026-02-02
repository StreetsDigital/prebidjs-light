import { OptimizationRule } from '../types/optimization';

interface RuleCardProps {
  rule: OptimizationRule;
  onToggle: (rule: OptimizationRule) => void;
  onEdit: (rule: OptimizationRule) => void;
  onDelete: (rule: OptimizationRule) => void;
  onTest: (rule: OptimizationRule) => void;
  formatCondition: (condition: any) => string;
  formatAction: (action: any) => string;
  getRuleTypeLabel: (type: string) => string;
  getRuleTypeColor: (type: string) => string;
}

export function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
  onTest,
  formatCondition,
  formatAction,
  getRuleTypeLabel,
  getRuleTypeColor,
}: RuleCardProps) {
  return (
    <div className="p-6 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className="text-lg font-semibold text-gray-900">{rule.name}</h4>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRuleTypeColor(rule.ruleType)}`}>
              {getRuleTypeLabel(rule.ruleType)}
            </span>
            {rule.enabled ? (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                Disabled
              </span>
            )}
          </div>
          {rule.description && (
            <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
          )}

          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-gray-500">CONDITIONS:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {rule.conditions.map((condition, idx) => (
                  <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                    {formatCondition(condition)}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-gray-500">ACTIONS:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {rule.actions.map((action, idx) => (
                  <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-800 border border-green-200">
                    {formatAction(action)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
            <span>Priority: {rule.priority}</span>
            <span>Executed: {rule.executionCount} times</span>
            {rule.lastExecuted && (
              <span>Last: {new Date(rule.lastExecuted).toLocaleString()}</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onTest(rule)}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            title="Test rule"
          >
            Test
          </button>
          <button
            onClick={() => onToggle(rule)}
            className={`px-3 py-1.5 text-sm rounded ${
              rule.enabled
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {rule.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(rule)}
            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
