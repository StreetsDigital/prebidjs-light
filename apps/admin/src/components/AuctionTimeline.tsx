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

interface AuctionTimelineProps {
  events: AuctionEvent[];
  onShowPayload: (type: 'request' | 'response', data: any) => void;
}

export function AuctionTimeline({ events, onShowPayload }: AuctionTimelineProps) {
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

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Event Timeline ({events.length})</h4>
      <div className="space-y-2">
        {events.map((event) => (
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
                    onClick={() => onShowPayload('request', event.bidRequest)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Request
                  </button>
                )}
                {event.bidResponse && (
                  <button
                    onClick={() => onShowPayload('response', event.bidResponse)}
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
  );
}
