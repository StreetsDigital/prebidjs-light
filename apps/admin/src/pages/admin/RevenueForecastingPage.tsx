import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface HistoricalDataPoint {
  date: string;
  revenue: number;
  impressions: number;
  avgCpm: number;
}

interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
  confidence: number;
}

interface Anomaly {
  date: string;
  revenue: number;
  expected: number;
  deviation: number;
  percentChange: number;
  type: 'spike' | 'drop';
}

interface SeasonalityPattern {
  period: number;
  name?: string;
  avgRevenue: number;
  percentOfAvg: number;
  count: number;
}

export function RevenueForecastingPage() {
  const { publisherId } = useParams<{ publisherId: string }>();
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'forecast' | 'seasonality' | 'anomalies' | 'scenario' | 'pacing'>('forecast');
  const [isLoading, setIsLoading] = useState(true);

  // Forecast data
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [forecastDays, setForecastDays] = useState(30);
  const [trend, setTrend] = useState<any>(null);

  // Seasonality data
  const [hourlyPatterns, setHourlyPatterns] = useState<SeasonalityPattern[]>([]);
  const [dailyPatterns, setDailyPatterns] = useState<SeasonalityPattern[]>([]);

  // Anomalies data
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  // Scenario data
  const [scenarioType, setScenarioType] = useState('add_bidders');
  const [scenarioParams, setScenarioParams] = useState({
    bidderCount: 2,
    timeoutIncrease: 500,
    floorIncrease: 10,
  });
  const [scenarioResult, setScenarioResult] = useState<any>(null);

  // Pacing data
  const [pacingData, setPacingData] = useState<any>(null);
  const [goalAmount, setGoalAmount] = useState('');
  const [goalPeriod, setGoalPeriod] = useState('month');

  useEffect(() => {
    if (activeTab === 'forecast') {
      fetchHistoricalData();
      fetchForecast();
    } else if (activeTab === 'seasonality') {
      fetchSeasonality();
    } else if (activeTab === 'anomalies') {
      fetchAnomalies();
    } else if (activeTab === 'pacing') {
      fetchPacing();
    }
  }, [publisherId, token, activeTab, forecastDays]);

  const fetchHistoricalData = async () => {
    if (!publisherId) return;

    try {
      const response = await fetch(`/api/publishers/${publisherId}/revenue-forecasting/historical?granularity=day`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHistoricalData(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch historical data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchForecast = async () => {
    if (!publisherId) return;

    try {
      const response = await fetch(`/api/publishers/${publisherId}/revenue-forecasting/forecast?days=${forecastDays}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setForecastData(data.forecast);
        setTrend(data.trend);
      }
    } catch (err) {
      console.error('Failed to fetch forecast:', err);
    }
  };

  const fetchSeasonality = async () => {
    if (!publisherId) return;

    try {
      const response = await fetch(`/api/publishers/${publisherId}/revenue-forecasting/seasonality`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHourlyPatterns(data.hourly.patterns);
        setDailyPatterns(data.daily.patterns);
      }
    } catch (err) {
      console.error('Failed to fetch seasonality:', err);
    }
  };

  const fetchAnomalies = async () => {
    if (!publisherId) return;

    try {
      const response = await fetch(`/api/publishers/${publisherId}/revenue-forecasting/anomalies?days=30`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnomalies(data.anomalies);
      }
    } catch (err) {
      console.error('Failed to fetch anomalies:', err);
    }
  };

  const fetchPacing = async () => {
    if (!publisherId) return;

    try {
      const params = new URLSearchParams({ goalPeriod });
      if (goalAmount) params.append('goalAmount', goalAmount);

      const response = await fetch(`/api/publishers/${publisherId}/revenue-forecasting/pacing?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPacingData(data);
      }
    } catch (err) {
      console.error('Failed to fetch pacing:', err);
    }
  };

  const runScenario = async () => {
    if (!publisherId) return;

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
      }
    } catch (err) {
      console.error('Failed to run scenario:', err);
    }
  };

  const getTrendIcon = (direction: string) => {
    if (direction === 'up') {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    } else if (direction === 'down') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue Forecasting & Insights</h1>
        <p className="mt-1 text-sm text-gray-500">
          Predictive analytics, trend analysis, and revenue optimization insights
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'forecast', label: 'Forecast', icon: '📈' },
            { id: 'seasonality', label: 'Seasonality', icon: '📅' },
            { id: 'anomalies', label: 'Anomalies', icon: '⚠️' },
            { id: 'scenario', label: 'What-If', icon: '🎯' },
            { id: 'pacing', label: 'Goal Pacing', icon: '🏃' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Forecast Tab */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Revenue (90d)</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                ${historicalData.reduce((sum, d) => sum + d.revenue, 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Daily Average</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                ${historicalData.length > 0 ? (historicalData.reduce((sum, d) => sum + d.revenue, 0) / historicalData.length).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trend</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 capitalize">{trend?.direction || 'N/A'}</p>
                </div>
                {trend && getTrendIcon(trend.direction)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Projected ({forecastDays}d)</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                ${forecastData.reduce((sum, f) => sum + f.predicted, 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Forecast Controls */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Revenue Forecast</h3>
              <div className="flex items-center space-x-3">
                <label className="text-sm text-gray-600">Forecast Period:</label>
                <select
                  value={forecastDays}
                  onChange={(e) => setForecastDays(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Chart Visualization */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              {/* Historical Data */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Historical Revenue</h4>
                <div className="space-y-1">
                  {historicalData.slice(-30).map((point, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-24">{new Date(point.date).toLocaleDateString()}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div
                          className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                          style={{
                            width: `${Math.min(100, (point.revenue / Math.max(...historicalData.map(d => d.revenue))) * 100)}%`
                          }}
                        >
                          <span className="text-xs text-white font-semibold">${point.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Forecast Data */}
              {forecastData.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Forecast ({forecastDays} days)</h4>
                  <div className="space-y-1">
                    {forecastData.slice(0, 14).map((point, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 w-24">{new Date(point.date).toLocaleDateString()}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                          {/* Confidence band */}
                          <div
                            className="bg-green-100 h-6 rounded-full absolute"
                            style={{
                              width: `${Math.min(100, (point.upper / Math.max(...historicalData.map(d => d.revenue))) * 100)}%`,
                              opacity: 0.3
                            }}
                          ></div>
                          {/* Predicted value */}
                          <div
                            className="bg-green-600 h-6 rounded-full flex items-center justify-end pr-2 relative"
                            style={{
                              width: `${Math.min(100, (point.predicted / Math.max(...historicalData.map(d => d.revenue))) * 100)}%`
                            }}
                          >
                            <span className="text-xs text-white font-semibold">${point.predicted.toFixed(2)}</span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 w-16">{(point.confidence * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Seasonality Tab */}
      {activeTab === 'seasonality' && (
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
      )}

      {/* Anomalies Tab */}
      {activeTab === 'anomalies' && (
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
      )}

      {/* Scenario Tab */}
      {activeTab === 'scenario' && (
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
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Run Scenario
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
      )}

      {/* Pacing Tab */}
      {activeTab === 'pacing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Goal Pacing & Budget Tracking</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Revenue Goal ($)</label>
                <input
                  type="number"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  placeholder="e.g., 10000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Goal Period</label>
                <select
                  value={goalPeriod}
                  onChange={(e) => setGoalPeriod(e.target.value)}
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
              onClick={fetchPacing}
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
      )}
    </div>
  );
}
