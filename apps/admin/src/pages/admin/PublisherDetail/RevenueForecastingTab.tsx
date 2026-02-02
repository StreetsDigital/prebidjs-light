import { Link } from 'react-router-dom';

interface Publisher {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  domains: string[];
  status: 'active' | 'paused' | 'disabled';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RevenueForecastingTabProps {
  publisher: Publisher;
}

/**
 * Revenue Forecasting Tab Component
 *
 * Displays revenue forecasting and analytics features including:
 * - Revenue forecasting with confidence intervals
 * - Seasonality pattern analysis
 * - Anomaly detection
 * - What-if scenario modeling
 * - Goal tracking and budget pacing
 */
export function RevenueForecastingTab({ publisher }: RevenueForecastingTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Revenue Forecasting & Analytics</h2>
            <p className="text-sm text-gray-500 mt-1">
              Predict future revenue, detect anomalies, and optimize with data-driven insights
            </p>
          </div>
          <Link
            to={`/admin/publishers/${publisher.id}/revenue-forecasting`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002 2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Dashboard
          </Link>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Predictive Analytics Powered by ML</h3>
              <div className="mt-1 text-sm text-green-700">
                <p>Use machine learning to forecast revenue, understand seasonality patterns, and detect anomalies automatically.</p>
                <p className="mt-1">
                  Make data-driven decisions with confidence intervals, what-if scenarios, and goal tracking.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h3 className="font-semibold text-gray-900">Revenue Forecast</h3>
            </div>
            <p className="text-sm text-gray-600">
              Predict future revenue with confidence intervals using linear regression and trend analysis.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-semibold text-gray-900">Seasonality Patterns</h3>
            </div>
            <p className="text-sm text-gray-600">
              Understand hourly and daily revenue patterns. See which times and days perform best.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="font-semibold text-gray-900">Anomaly Detection</h3>
            </div>
            <p className="text-sm text-gray-600">
              Automatically detect revenue spikes and drops using statistical analysis.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="font-medium text-gray-900 mb-4">Key Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">Forecasting</div>
              <div className="text-xs text-gray-600 mt-1">30/60/90 day predictions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">Scenarios</div>
              <div className="text-xs text-gray-600 mt-1">What-if modeling</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">Goal Tracking</div>
              <div className="text-xs text-gray-600 mt-1">Budget pacing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">Confidence</div>
              <div className="text-xs text-gray-600 mt-1">Statistical intervals</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
