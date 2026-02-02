interface Bidder {
  bidderCode: string;
  status: 'responded' | 'timeout' | 'error' | 'no_bid';
  latency: number | null;
  cpm: number | null;
  won: boolean;
  errorMessage: string | null;
  bidResponse: any;
}

interface BidDetailsProps {
  bidders: Bidder[];
  onShowPayload: (type: 'request' | 'response', data: any) => void;
}

export function BidDetails({ bidders, onShowPayload }: BidDetailsProps) {
  const getBidderStatusIcon = (status: string) => {
    switch (status) {
      case 'responded':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'timeout':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Bidders ({bidders.length})</h4>
      <div className="space-y-2">
        {bidders.map((bidder) => (
          <div
            key={bidder.bidderCode}
            className={`p-3 rounded-lg border ${
              bidder.won
                ? 'border-green-300 bg-green-50'
                : bidder.status === 'error'
                ? 'border-red-200 bg-red-50'
                : bidder.status === 'timeout'
                ? 'border-yellow-200 bg-yellow-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getBidderStatusIcon(bidder.status)}
                <span className="text-sm font-medium text-gray-900">{bidder.bidderCode}</span>
                {bidder.won && (
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
              </div>
              <div className="flex items-center space-x-3 text-xs">
                {bidder.cpm !== null && (
                  <span className="font-semibold text-green-600">${bidder.cpm.toFixed(2)}</span>
                )}
                {bidder.latency !== null && (
                  <span className="text-gray-600">{bidder.latency}ms</span>
                )}
                <span className={`px-2 py-0.5 rounded font-medium ${
                  bidder.status === 'responded' ? 'bg-green-100 text-green-800' :
                  bidder.status === 'timeout' ? 'bg-yellow-100 text-yellow-800' :
                  bidder.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {bidder.status}
                </span>
              </div>
            </div>
            {bidder.errorMessage && (
              <div className="mt-2 text-xs text-red-600">
                Error: {bidder.errorMessage}
              </div>
            )}
            {bidder.bidResponse && (
              <button
                onClick={() => onShowPayload('response', bidder.bidResponse)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                View Response
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
