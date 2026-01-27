import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface AuctionSummary {
  auctionId: string;
  adUnitCode: string;
  pageUrl: string | null;
  domain: string | null;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  totalBids: number;
  winner: {
    bidderCode: string;
    cpm: number;
    currency: string;
  } | null;
  deviceType: string | null;
  eventCount: number;
}

interface AuctionEvent {
  id: string;
  auctionId: string;
  timestamp: string;
  eventType: string;
  adUnitCode: string | null;
  bidderCode: string | null;
  bidRequest: any;
  bidResponse: any;
  latencyMs: number | null;
  cpm: string | null;
  currency: string | null;
  pageUrl: string | null;
  errorMessage: string | null;
}

interface Bidder {
  bidderCode: string;
  status: 'responded' | 'timeout' | 'error' | 'no_bid';
  latency: number | null;
  cpm: number | null;
  won: boolean;
  errorMessage: string | null;
  bidResponse: any;
}

interface AuctionWaterfall {
  auctionId: string;
  adUnitCode: string;
  pageUrl: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  events: AuctionEvent[];
  bidders: Bidder[];
  winner: {
    bidderCode: string;
    cpm: number;
    currency: string;
  } | null;
  totalBids: number;
  timeoutCount: number;
  errorCount: number;
}

export function AuctionInspectorPage() {
  const { publisherId } = useParams<{ publisherId: string }>();
  const { token } = useAuthStore();
  const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<AuctionWaterfall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterAdUnit, setFilterAdUnit] = useState('');
  const [filterBidder, setFilterBidder] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [showPayload, setShowPayload] = useState<{ type: 'request' | 'response'; data: any } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchLiveAuctions();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLiveAuctions, 2000); // Refresh every 2 seconds
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [publisherId, token, autoRefresh, filterAdUnit, filterBidder, filterDomain]);

  const fetchLiveAuctions = async () => {
    if (!publisherId) return;

    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterAdUnit) params.append('adUnit', filterAdUnit);
      if (filterBidder) params.append('bidder', filterBidder);
      if (filterDomain) params.append('domain', filterDomain);

      const response = await fetch(`/api/publishers/${publisherId}/auction-inspector/live?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAuctions(data.auctions);
      }
    } catch (err) {
      console.error('Failed to fetch auctions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuctionDetail = async (auctionId: string) => {
    if (!publisherId) return;

    try {
      const response = await fetch(`/api/publishers/${publisherId}/auction-inspector/auctions/${auctionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedAuction(data);
      }
    } catch (err) {
      console.error('Failed to fetch auction detail:', err);
    }
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      auction_init: 'bg-blue-100 text-blue-800',
      bid_requested: 'bg-purple-100 text-purple-800',
      bid_response: 'bg-green-100 text-green-800',
      bid_timeout: 'bg-yellow-100 text-yellow-800',
      bid_won: 'bg-emerald-100 text-emerald-800',
      bid_error: 'bg-red-100 text-red-800',
      auction_end: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

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

  if (isLoading && auctions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Auction Inspector</h1>
          <p className="mt-1 text-sm text-gray-500">
            Watch auctions happen in real-time and debug header bidding issues
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="text-gray-700">Auto-refresh</span>
          </label>
          <button
            onClick={fetchLiveAuctions}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Ad Unit</label>
            <input
              type="text"
              value={filterAdUnit}
              onChange={(e) => setFilterAdUnit(e.target.value)}
              placeholder="e.g., banner-1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Bidder</label>
            <input
              type="text"
              value={filterBidder}
              onChange={(e) => setFilterBidder(e.target.value)}
              placeholder="e.g., rubicon"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Domain</label>
            <input
              type="text"
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              placeholder="e.g., example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Auctions List */}
        <div className="col-span-12 lg:col-span-5 space-y-3">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Live Auctions
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({auctions.length} in last 5 min)
                </span>
              </h3>
            </div>

            <div className="divide-y divide-gray-200 max-h-[calc(100vh-400px)] overflow-y-auto">
              {auctions.length === 0 ? (
                <div className="p-12 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No live auctions</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Auctions will appear here in real-time when they occur
                  </p>
                </div>
              ) : (
                auctions.map((auction) => (
                  <div
                    key={auction.auctionId}
                    onClick={() => fetchAuctionDetail(auction.auctionId)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                      selectedAuction?.auctionId === auction.auctionId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {auction.adUnitCode}
                          </span>
                          {auction.winner && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Won
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {auction.domain || auction.pageUrl || 'Unknown domain'}
                        </p>
                      </div>
                      {auction.winner && (
                        <div className="text-right ml-2">
                          <div className="text-sm font-bold text-green-600">
                            ${auction.winner.cpm.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">{auction.winner.bidderCode}</div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{auction.totalBids} bid(s)</span>
                      <span>{auction.duration ? `${auction.duration}ms` : 'In progress...'}</span>
                      <span>{new Date(auction.startTime).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Auction Detail */}
        <div className="col-span-12 lg:col-span-7">
          {selectedAuction ? (
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Auction Waterfall</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedAuction.adUnitCode} • {selectedAuction.duration ? `${selectedAuction.duration}ms` : 'In progress'}
                    </p>
                  </div>
                  {selectedAuction.winner && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        ${selectedAuction.winner.cpm.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">{selectedAuction.winner.bidderCode}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 max-h-[calc(100vh-400px)] overflow-y-auto">
                {/* Bidders Summary */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Bidders ({selectedAuction.bidders.length})</h4>
                  <div className="space-y-2">
                    {selectedAuction.bidders.map((bidder) => (
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
                            onClick={() => setShowPayload({ type: 'response', data: bidder.bidResponse })}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                          >
                            View Response
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event Timeline */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Event Timeline ({selectedAuction.events.length})</h4>
                  <div className="space-y-2">
                    {selectedAuction.events.map((event, idx) => (
                      <div key={event.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEventTypeColor(event.eventType)}`}>
                                {event.eventType}
                              </span>
                              {event.bidderCode && (
                                <span className="text-sm text-gray-700">{event.bidderCode}</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              {event.cpm && (
                                <span className="font-semibold text-green-600">${parseFloat(event.cpm).toFixed(2)}</span>
                              )}
                              {event.latencyMs !== null && (
                                <span>{event.latencyMs}ms</span>
                              )}
                              <span>{new Date(event.timestamp).toLocaleTimeString()}.{new Date(event.timestamp).getMilliseconds()}</span>
                            </div>
                          </div>
                          {event.errorMessage && (
                            <div className="mt-1 text-xs text-red-600">
                              {event.errorMessage}
                            </div>
                          )}
                          <div className="mt-1 flex items-center space-x-2">
                            {event.bidRequest && (
                              <button
                                onClick={() => setShowPayload({ type: 'request', data: event.bidRequest })}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Request
                              </button>
                            )}
                            {event.bidResponse && (
                              <button
                                onClick={() => setShowPayload({ type: 'response', data: event.bidResponse })}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Response
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Select an auction</h3>
              <p className="mt-2 text-sm text-gray-500">
                Click on an auction from the list to view detailed waterfall
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payload Modal */}
      {showPayload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {showPayload.type === 'request' ? 'Bid Request' : 'Bid Response'}
                </h2>
                <button
                  onClick={() => setShowPayload(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(showPayload.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
