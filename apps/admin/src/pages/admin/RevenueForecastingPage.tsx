import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ForecastChart } from '../../components/ForecastChart';
import { ScenarioBuilder } from '../../components/ScenarioBuilder';
import { ForecastMetrics } from '../../components/ForecastMetrics';

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
        <ForecastChart
          historicalData={historicalData}
          forecastData={forecastData}
          forecastDays={forecastDays}
          onForecastDaysChange={setForecastDays}
          trend={trend}
        />
      )}

      {/* Seasonality & Anomalies & Pacing Tabs */}
      {(activeTab === 'seasonality' || activeTab === 'anomalies' || activeTab === 'pacing') && (
        <ForecastMetrics
          activeMetric={activeTab}
          hourlyPatterns={hourlyPatterns}
          dailyPatterns={dailyPatterns}
          anomalies={anomalies}
          pacingData={pacingData}
          goalAmount={goalAmount}
          goalPeriod={goalPeriod}
          onGoalAmountChange={setGoalAmount}
          onGoalPeriodChange={setGoalPeriod}
          onCalculatePacing={fetchPacing}
        />
      )}

      {/* Scenario Tab */}
      {activeTab === 'scenario' && publisherId && (
        <ScenarioBuilder
          publisherId={publisherId}
          token={token || ''}
          onScenarioRun={(result) => console.log('Scenario result:', result)}
        />
      )}
    </div>
  );
}
