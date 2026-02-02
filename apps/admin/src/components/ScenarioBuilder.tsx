import { useState } from 'react';

interface ScenarioBuilderProps {
  publisherId: string;
  token: string;
  onScenarioRun: (result: any) => void;
}

export function ScenarioBuilder({ publisherId, token, onScenarioRun }: ScenarioBuilderProps) {
  const [scenarioType, setScenarioType] = useState('add_bidders');
  const [scenarioParams, setScenarioParams] = useState({
    bidderCount: 2,
    timeoutIncrease: 500,
    floorIncrease: 10,
  });
  const [scenarioResult, setScenarioResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runScenario = async () => {
    if (!publisherId) return;

    setIsRunning(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/revenue-forecasting/scenario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scenario: scenarioType,
          parameters: scenarioParams,
          timeframe: 'month',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setScenarioResult(data);
        onScenarioRun(data);
      }
    } catch (err) {
      console.error('Failed to run scenario:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What-If Scenario Modeling</h3>
        <p className="text-sm text-gray-600 mb-6">
          Model the impact of configuration changes on your revenue
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scenario Type</label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="add_bidders">Add New Bidders</option>
              <option value="increase_timeout">Increase Timeout</option>
              <option value="adjust_floors">Adjust Floor Prices</option>
            </select>
          </div>

          {scenarioType === 'add_bidders' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Bidders to Add</label>
              <input
                type="number"
                value={scenarioParams.bidderCount}
                onChange={(e) => setScenarioParams({ ...scenarioParams, bidderCount: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
                max="10"
              />
            </div>
          )}

          {scenarioType === 'increase_timeout' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timeout Increase (ms)</label>
              <input
                type="number"
                value={scenarioParams.timeoutIncrease}
                onChange={(e) => setScenarioParams({ ...scenarioParams, timeoutIncrease: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="100"
                max="2000"
                step="100"
              />
            </div>
          )}

          {scenarioType === 'adjust_floors' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Floor Price Increase (%)</label>
              <input
                type="number"
                value={scenarioParams.floorIncrease}
                onChange={(e) => setScenarioParams({ ...scenarioParams, floorIncrease: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="-50"
                max="100"
                step="5"
              />
            </div>
          )}

          <button
            onClick={runScenario}
            disabled={isRunning}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running Scenario...' : 'Run Scenario'}
          </button>
        </div>
      </div>

      {scenarioResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Scenario Results</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">{scenarioResult.explanation}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-3">Current (Baseline)</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Revenue:</span>
                  <span className="text-sm font-semibold text-gray-900">${scenarioResult.baseline.revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg CPM:</span>
                  <span className="text-sm font-semibold text-gray-900">${scenarioResult.baseline.avgCpm.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Impressions:</span>
                  <span className="text-sm font-semibold text-gray-900">{scenarioResult.baseline.impressions.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-3">Projected</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Revenue:</span>
                  <span className="text-sm font-semibold text-green-600">${scenarioResult.projected.revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg CPM:</span>
                  <span className="text-sm font-semibold text-green-600">${scenarioResult.projected.avgCpm.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Impressions:</span>
                  <span className="text-sm font-semibold text-gray-900">{scenarioResult.projected.impressions.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Projected Impact:</span>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {scenarioResult.impact.percentChange > 0 ? '+' : ''}{scenarioResult.impact.percentChange.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  ${scenarioResult.impact.revenueDiff > 0 ? '+' : ''}{scenarioResult.impact.revenueDiff.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
