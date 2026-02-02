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

interface AuctionInspectorTabProps {
  publisher: Publisher;
}

export function AuctionInspectorTab({ publisher }: AuctionInspectorTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Live Auction Inspector</h2>
            <p className="text-sm text-gray-500 mt-1">
              Watch auctions happen in real-time and debug header bidding issues
            </p>
          </div>
          <Link
            to={`/admin/publishers/${publisher.id}/auction-inspector`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Open Inspector
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
              <h3 className="text-sm font-medium text-indigo-800">Chrome DevTools for Ads</h3>
              <div className="mt-1 text-sm text-indigo-700">
                <p>See every auction as it happens - bid requests, responses, timeouts, errors, and winners.</p>
                <p className="mt-1">
                  Perfect for debugging integration issues and understanding auction behavior in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="font-semibold text-gray-900">Real-Time Stream</h3>
            </div>
            <p className="text-sm text-gray-600">
              Watch auctions as they occur with auto-refresh. See new auctions appear instantly.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
              <h3 className="font-semibold text-gray-900">Waterfall View</h3>
            </div>
            <p className="text-sm text-gray-600">
              Visualize the complete auction timeline - which bidders responded, timed out, or won.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <h3 className="font-semibold text-gray-900">Request/Response</h3>
            </div>
            <p className="text-sm text-gray-600">
              Inspect full bid request and response payloads. Debug exactly what's being sent and received.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="font-medium text-gray-900 mb-4">What You Can Debug</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">Timeouts</div>
              <div className="text-xs text-gray-600 mt-1">Why bidders are slow</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">Errors</div>
              <div className="text-xs text-gray-600 mt-1">Integration issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">Winners</div>
              <div className="text-xs text-gray-600 mt-1">Who wins and why</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">Latency</div>
              <div className="text-xs text-gray-600 mt-1">Performance issues</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
