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

interface OptimizationRulesTabProps {
  publisher: Publisher;
}

/**
 * OptimizationRulesTab - Displays the optimization rules automation overview
 *
 * This tab shows information about the intelligent automation rules engine
 * that allows publishers to set up rules that optimize their configuration
 * automatically based on performance metrics.
 *
 * Features:
 * - Auto-disable underperforming bidders
 * - Dynamic timeout adjustments
 * - Smart alerts and notifications
 * - Various rule types (auto-disable, auto-enable, adjust timeout, floor prices, alerts, traffic)
 */
export function OptimizationRulesTab({ publisher }: OptimizationRulesTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Optimization Rules Engine</h2>
            <p className="text-sm text-gray-500 mt-1">
              Set up intelligent automation rules that optimize your configuration 24/7
            </p>
          </div>
          <Link
            to={`/admin/publishers/${publisher.id}/optimization-rules`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Manage Rules
          </Link>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-purple-800">Set It and Forget It</h3>
              <div className="mt-1 text-sm text-purple-700">
                <p>Create rules that monitor your metrics and automatically take action when conditions are met.</p>
                <p className="mt-1">
                  Your configuration optimizes itself 24/7, even while you sleep.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <h3 className="font-semibold text-gray-900">Auto-Disable Bidders</h3>
            </div>
            <p className="text-sm text-gray-600">
              Automatically disable bidders when timeout rate exceeds threshold or performance degrades.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-semibold text-gray-900">Dynamic Timeouts</h3>
            </div>
            <p className="text-sm text-gray-600">
              Adjust bidder timeouts automatically based on response speed and performance patterns.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="font-semibold text-gray-900">Smart Alerts</h3>
            </div>
            <p className="text-sm text-gray-600">
              Get notified when revenue drops, fill rate declines, or other critical metrics change.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="font-medium text-gray-900 mb-4">Rule Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-lg font-bold text-red-600">Auto-Disable</div>
              <div className="text-xs text-gray-600 mt-1">Remove bad performers</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">Auto-Enable</div>
              <div className="text-xs text-gray-600 mt-1">Activate on schedule</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">Adjust Timeout</div>
              <div className="text-xs text-gray-600 mt-1">Dynamic optimization</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">Floor Prices</div>
              <div className="text-xs text-gray-600 mt-1">Revenue optimization</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-lg font-bold text-yellow-600">Alerts</div>
              <div className="text-xs text-gray-600 mt-1">Get notified</div>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <div className="text-lg font-bold text-indigo-600">Traffic</div>
              <div className="text-xs text-gray-600 mt-1">Allocation rules</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
