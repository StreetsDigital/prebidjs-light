import { useState } from 'react';

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

interface ForecastChartProps {
  historicalData: HistoricalDataPoint[];
  forecastData: ForecastPoint[];
  forecastDays: number;
  onForecastDaysChange: (days: number) => void;
  trend: any;
}

export function ForecastChart({
  historicalData,
  forecastData,
  forecastDays,
  onForecastDaysChange,
  trend,
}: ForecastChartProps) {
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

  return (
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
              onChange={(e) => onForecastDaysChange(parseInt(e.target.value))}
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
  );
}
