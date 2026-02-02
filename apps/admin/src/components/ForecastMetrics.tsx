interface SeasonalityPattern {
  period: number;
  name?: string;
  avgRevenue: number;
  percentOfAvg: number;
  count: number;
}

interface Anomaly {
  date: string;
  revenue: number;
  expected: number;
  deviation: number;
  percentChange: number;
  type: 'spike' | 'drop';
}

interface PacingData {
  period: {
    daysElapsed: number;
    daysRemaining: number;
    percentComplete: number;
  };
  actual: {
    revenue: number;
    dailyAvg: number;
    projectedTotal: number;
  };
  goal?: number;
  pacing: {
    status: 'ahead' | 'behind' | 'on_track';
    onTrackFor: number;
    needsDaily?: number;
  };
}

interface ForecastMetricsProps {
  activeMetric: 'seasonality' | 'anomalies' | 'pacing';
  hourlyPatterns: SeasonalityPattern[];
  dailyPatterns: SeasonalityPattern[];
  anomalies: Anomaly[];
  pacingData: PacingData | null;
  goalAmount: string;
  goalPeriod: string;
  onGoalAmountChange: (value: string) => void;
  onGoalPeriodChange: (value: string) => void;
  onCalculatePacing: () => void;
}

export function ForecastMetrics({
  activeMetric,
  hourlyPatterns,
  dailyPatterns,
  anomalies,
  pacingData,
  goalAmount,
  goalPeriod,
  onGoalAmountChange,
  onGoalPeriodChange,
  onCalculatePacing,
}: ForecastMetricsProps) {
  if (activeMetric === 'seasonality') {
    return (
      <div className="space-y-6">
        {/* Hourly Patterns */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Hour of Day</h3>
          <div className="grid grid-cols-12 gap-2">
            {hourlyPatterns.map((pattern) => (
              <div key={pattern.period} className="text-center">
                <div
                  className={`h-32 rounded flex items-end justify-center ${
                    pattern.percentOfAvg > 120 ? 'bg-green-500' :
                    pattern.percentOfAvg > 100 ? 'bg-blue-500' :
                    pattern.percentOfAvg > 80 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ height: `${Math.max(20, pattern.percentOfAvg)}px` }}
                  title={`${pattern.period}:00 - ${pattern.percentOfAvg.toFixed(0)}% of average`}
                >
                  <span className="text-xs text-white font-semibold mb-1">
                    {pattern.percentOfAvg.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-600">{pattern.period}h</div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Patterns */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Day of Week</h3>
          <div className="grid grid-cols-7 gap-4">
            {dailyPatterns.map((pattern) => (
              <div key={pattern.period} className="text-center">
                <div
                  className={`h-48 rounded flex flex-col items-center justify-end pb-4 ${
                    pattern.percentOfAvg > 110 ? 'bg-green-500' :
                    pattern.percentOfAvg > 95 ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}
                  style={{ height: `${Math.max(100, pattern.percentOfAvg * 1.5)}px` }}
                >
                  <div className="text-2xl font-bold text-white">{pattern.percentOfAvg.toFixed(0)}%</div>
                  <div className="text-xs text-white mt-1">${pattern.avgRevenue.toFixed(2)}</div>
                </div>
                <div className="mt-2 text-sm font-medium text-gray-700">{pattern.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeMetric === 'anomalies') {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Anomalies (Last 30 Days)</h3>
          <p className="text-sm text-gray-500 mt-1">Unusual spikes or drops in revenue</p>
        </div>

        {anomalies.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No anomalies detected</h3>
            <p className="mt-2 text-sm text-gray-500">Revenue has been stable with no significant deviations</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {anomalies.map((anomaly, idx) => (
              <div key={idx} className={`p-6 ${anomaly.type === 'spike' ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        anomaly.type === 'spike' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {anomaly.type === 'spike' ? '📈 Revenue Spike' : '📉 Revenue Drop'}
                      </span>
                      <span className="text-sm text-gray-500">{new Date(anomaly.date).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">Actual Revenue</div>
                        <div className="text-lg font-semibold text-gray-900">${anomaly.revenue.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Expected</div>
                        <div className="text-lg font-semibold text-gray-700">${anomaly.expected.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Difference</div>
                        <div className={`text-lg font-semibold ${anomaly.type === 'spike' ? 'text-green-600' : 'text-red-600'}`}>
                          {anomaly.percentChange > 0 ? '+' : ''}{anomaly.percentChange.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Deviation</div>
                        <div className="text-lg font-semibold text-gray-900">{Math.abs(anomaly.deviation).toFixed(1)}σ</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeMetric === 'pacing') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Goal Pacing & Budget Tracking</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Revenue Goal ($)</label>
              <input
                type="number"
                value={goalAmount}
                onChange={(e) => onGoalAmountChange(e.target.value)}
                placeholder="e.g., 10000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Goal Period</label>
              <select
                value={goalPeriod}
                onChange={(e) => onGoalPeriodChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>

          <button
            onClick={onCalculatePacing}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-6"
          >
            Calculate Pacing
          </button>

          {pacingData && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">
                    {pacingData.period.daysElapsed} of {pacingData.period.daysElapsed + pacingData.period.daysRemaining} days
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${
                      pacingData.pacing.status === 'ahead' ? 'bg-green-600' :
                      pacingData.pacing.status === 'behind' ? 'bg-red-600' :
                      'bg-blue-600'
                    }`}
                    style={{ width: `${pacingData.period.percentComplete}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500">Actual Revenue</div>
                  <div className="text-2xl font-bold text-gray-900">${pacingData.actual.revenue.toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500">Daily Average</div>
                  <div className="text-2xl font-bold text-gray-900">${pacingData.actual.dailyAvg.toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500">Projected Total</div>
                  <div className="text-2xl font-bold text-gray-900">${pacingData.actual.projectedTotal.toFixed(2)}</div>
                </div>
              </div>

              {/* Pacing Status */}
              {pacingData.goal && (
                <div className={`p-6 rounded-lg border-2 ${
                  pacingData.pacing.status === 'ahead' ? 'bg-green-50 border-green-300' :
                  pacingData.pacing.status === 'behind' ? 'bg-red-50 border-red-300' :
                  'bg-blue-50 border-blue-300'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Pacing Status</h4>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      pacingData.pacing.status === 'ahead' ? 'bg-green-100 text-green-800' :
                      pacingData.pacing.status === 'behind' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {pacingData.pacing.status === 'ahead' ? '🚀 Ahead' :
                       pacingData.pacing.status === 'behind' ? '⚠️ Behind' :
                       '✓ On Track'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Goal</div>
                      <div className="text-xl font-bold text-gray-900">${pacingData.goal.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">On Track For</div>
                      <div className="text-xl font-bold text-gray-900">${pacingData.pacing.onTrackFor.toFixed(2)}</div>
                    </div>
                  </div>

                  {pacingData.pacing.needsDaily && (
                    <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                      <div className="text-sm text-gray-600">Daily Target (Remaining Days)</div>
                      <div className="text-2xl font-bold text-blue-600">${pacingData.pacing.needsDaily.toFixed(2)}/day</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
