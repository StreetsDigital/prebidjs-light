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

interface CustomReportsTabProps {
  publisher: Publisher;
}

export function CustomReportsTab({ publisher }: CustomReportsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Custom Report Builder</h2>
            <p className="text-sm text-gray-500 mt-1">
              Create flexible reports with custom metrics, dimensions, and export options
            </p>
          </div>
          <Link
            to={`/admin/publishers/${publisher.id}/custom-reports`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Open Report Builder
          </Link>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-indigo-800">Build Reports Your Way</h3>
              <div className="mt-1 text-sm text-indigo-700">
                <p>Design custom reports with exactly the metrics and dimensions you need. Choose from revenue, CPM, fill rate, timeout rate, and more.</p>
                <p className="mt-1">
                  Export to CSV, Excel, or PDF. Schedule automated delivery. Share with your team.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002 2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="font-semibold text-gray-900">Flexible Metrics</h3>
            </div>
            <p className="text-sm text-gray-600">
              Select from 7+ metrics including revenue, impressions, CPM, fill rate, timeout rate, and more.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 010 2H6v10h2a1 1 0 010 2H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 110 2h-2v10h2a1 1 0 110 2h-4a1 1 0 01-1-1V5z" />
              </svg>
              <h3 className="font-semibold text-gray-900">Group & Filter</h3>
            </div>
            <p className="text-sm text-gray-600">
              Group by date, bidder, ad unit, device type, and more. Apply filters for precise analysis.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="font-semibold text-gray-900">Export Options</h3>
            </div>
            <p className="text-sm text-gray-600">
              Export to CSV, Excel, or PDF. Schedule automated delivery to your inbox.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="font-medium text-gray-900 mb-4">Report Templates</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">Daily Revenue</div>
              <div className="text-xs text-gray-600 mt-1">Revenue by day & bidder</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">Bidder Performance</div>
              <div className="text-xs text-gray-600 mt-1">Comprehensive metrics</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">Ad Unit Breakdown</div>
              <div className="text-xs text-gray-600 mt-1">Performance by unit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">Hourly Analysis</div>
              <div className="text-xs text-gray-600 mt-1">Revenue patterns</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
