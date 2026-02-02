interface AuctionFiltersProps {
  filterAdUnit: string;
  filterBidder: string;
  filterDomain: string;
  onAdUnitChange: (value: string) => void;
  onBidderChange: (value: string) => void;
  onDomainChange: (value: string) => void;
}

export function AuctionFilters({
  filterAdUnit,
  filterBidder,
  filterDomain,
  onAdUnitChange,
  onBidderChange,
  onDomainChange,
}: AuctionFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Ad Unit</label>
          <input
            type="text"
            value={filterAdUnit}
            onChange={(e) => onAdUnitChange(e.target.value)}
            placeholder="e.g., banner-1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Bidder</label>
          <input
            type="text"
            value={filterBidder}
            onChange={(e) => onBidderChange(e.target.value)}
            placeholder="e.g., rubicon"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Domain</label>
          <input
            type="text"
            value={filterDomain}
            onChange={(e) => onDomainChange(e.target.value)}
            placeholder="e.g., example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>
    </div>
  );
}
