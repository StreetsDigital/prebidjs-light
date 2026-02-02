import { Condition, Action } from '../types/optimization';

interface TestResult {
  wouldExecute: boolean;
  conditionResults: Array<{
    condition: Condition;
    met: boolean;
    currentValue: number;
    threshold: number;
  }>;
  plannedActions: Action[];
}

interface RuleTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  testResult: TestResult | null;
  formatCondition: (condition: Condition) => string;
  formatAction: (action: Action) => string;
}

export function RuleTestModal({
  isOpen,
  onClose,
  testResult,
  formatCondition,
  formatAction,
}: RuleTestModalProps) {
  if (!isOpen || !testResult) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Rule Test Results</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className={`p-4 rounded-lg ${testResult.wouldExecute ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className="font-semibold text-gray-900">
              {testResult.wouldExecute ? '✓ Rule would execute' : '✗ Rule would NOT execute'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {testResult.wouldExecute
                ? 'All conditions are currently met. This rule would take action.'
                : 'One or more conditions are not met. No action would be taken.'}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Condition Results:</h3>
            <div className="space-y-2">
              {testResult.conditionResults.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded border ${result.met ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCondition(result.condition)}
                    </span>
                    <span className={`text-xs font-semibold ${result.met ? 'text-green-600' : 'text-red-600'}`}>
                      {result.met ? '✓ MET' : '✗ NOT MET'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    Current: {result.currentValue.toFixed(2)} | Threshold: {result.threshold}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {testResult.wouldExecute && testResult.plannedActions.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Planned Actions:</h3>
              <div className="space-y-2">
                {testResult.plannedActions.map((action, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 rounded border border-blue-200">
                    <span className="text-sm font-medium text-gray-900">
                      {formatAction(action)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
