import { useState } from 'react';

interface Bidder {
  id: string;
  name: string;
  code: string;
  description: string;
  enabled: boolean;
  avgBidTime: string;
  winRate: string;
}

// Mock bidders data
const MOCK_BIDDERS: Bidder[] = [
  {
    id: '1',
    name: 'AppNexus',
    code: 'appnexus',
    description: 'Premium programmatic advertising platform',
    enabled: true,
    avgBidTime: '45ms',
    winRate: '23%',
  },
  {
    id: '2',
    name: 'Rubicon Project',
    code: 'rubicon',
    description: 'Global advertising exchange',
    enabled: true,
    avgBidTime: '62ms',
    winRate: '18%',
  },
  {
    id: '3',
    name: 'Index Exchange',
    code: 'ix',
    description: 'Real-time advertising exchange',
    enabled: false,
    avgBidTime: '38ms',
    winRate: '15%',
  },
  {
    id: '4',
    name: 'OpenX',
    code: 'openx',
    description: 'Independent advertising exchange',
    enabled: true,
    avgBidTime: '55ms',
    winRate: '12%',
  },
  {
    id: '5',
    name: 'PubMatic',
    code: 'pubmatic',
    description: 'Digital advertising technology',
    enabled: false,
    avgBidTime: '48ms',
    winRate: '10%',
  },
];

export function BiddersPage() {
  const [bidders, setBidders] = useState<Bidder[]>(MOCK_BIDDERS);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBidders = bidders.filter(
    (bidder) =>
      bidder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bidder.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enabledCount = bidders.filter((b) => b.enabled).length;

  const handleToggle = (bidderId: string) => {
    setBidders((prev) =>
      prev.map((b) =>
        b.id === bidderId ? { ...b, enabled: !b.enabled } : b
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bidders</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure which demand partners participate in your auctions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Active Bidders</p>
          <p className="text-2xl font-semibold text-gray-900">{enabledCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Available Bidders</p>
          <p className="text-2xl font-semibold text-gray-900">{bidders.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Avg. Response Time</p>
          <p className="text-2xl font-semibold text-gray-900">50ms</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-4">
        <input
          type="text"
          placeholder="Search bidders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
        />
      </div>

      {/* Bidders List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {filteredBidders.map((bidder) => (
            <li key={bidder.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-600">
                      {bidder.code.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {bidder.name}
                    </h3>
                    <p className="text-sm text-gray-500">{bidder.description}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-400">
                        Avg bid: {bidder.avgBidTime}
                      </span>
                      <span className="text-xs text-gray-400">
                        Win rate: {bidder.winRate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Configure
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={bidder.enabled}
                    onClick={() => handleToggle(bidder.id)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                      bidder.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        bidder.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {filteredBidders.length === 0 && (
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
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No bidders found</h3>
            <p className="mt-2 text-sm text-gray-500">
              No bidders match your search criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
