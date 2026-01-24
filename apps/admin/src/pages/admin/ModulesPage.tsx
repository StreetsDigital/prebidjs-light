import { useState } from 'react';
import { FormModal } from '../../components/ui';

interface BidderModule {
  id: string;
  name: string;
  code: string;
  description: string;
  enabled: boolean;
  config: Record<string, string>;
}

const AVAILABLE_BIDDERS: BidderModule[] = [
  {
    id: '1',
    name: 'AppNexus',
    code: 'appnexus',
    description: 'AppNexus (Xandr) bidder adapter for programmatic advertising.',
    enabled: true,
    config: { placementId: '12345678' },
  },
  {
    id: '2',
    name: 'Rubicon Project',
    code: 'rubicon',
    description: 'Rubicon Project bidder adapter for premium inventory.',
    enabled: false,
    config: { accountId: '', siteId: '', zoneId: '' },
  },
  {
    id: '3',
    name: 'OpenX',
    code: 'openx',
    description: 'OpenX bidder adapter for display and video advertising.',
    enabled: true,
    config: { delDomain: 'example-d.openx.net', unit: '123456' },
  },
  {
    id: '4',
    name: 'PubMatic',
    code: 'pubmatic',
    description: 'PubMatic bidder adapter for header bidding.',
    enabled: false,
    config: { publisherId: '', adSlot: '' },
  },
  {
    id: '5',
    name: 'Index Exchange',
    code: 'ix',
    description: 'Index Exchange bidder adapter for real-time bidding.',
    enabled: false,
    config: { siteId: '' },
  },
];

export function ModulesPage() {
  const [bidders, setBidders] = useState<BidderModule[]>(AVAILABLE_BIDDERS);
  const [configModal, setConfigModal] = useState<{
    isOpen: boolean;
    bidder: BidderModule | null;
  }>({
    isOpen: false,
    bidder: null,
  });
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBidders = bidders.filter(
    (bidder) =>
      bidder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bidder.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfigureClick = (bidder: BidderModule) => {
    setConfigForm({ ...bidder.config });
    setConfigModal({ isOpen: true, bidder });
  };

  const handleConfigClose = () => {
    setConfigModal({ isOpen: false, bidder: null });
    setConfigForm({});
  };

  const handleConfigSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configModal.bidder) return;

    setBidders((prev) =>
      prev.map((b) =>
        b.id === configModal.bidder?.id ? { ...b, config: configForm } : b
      )
    );
    handleConfigClose();
  };

  const toggleBidder = (bidderId: string) => {
    setBidders((prev) =>
      prev.map((b) => (b.id === bidderId ? { ...b, enabled: !b.enabled } : b))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage bidder adapters and Prebid.js modules.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="max-w-md">
          <label htmlFor="search" className="sr-only">
            Search bidders
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search bidders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
          />
        </div>
      </div>

      {/* Bidders List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Bidder Adapters</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure bidder adapters for header bidding integration.
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {filteredBidders.map((bidder) => (
            <li key={bidder.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {bidder.code.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {bidder.name}
                      </p>
                      <span className="ml-2 inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                        {bidder.code}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {bidder.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 ml-4">
                  <button
                    type="button"
                    onClick={() => toggleBidder(bidder.id)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                      bidder.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={bidder.enabled}
                    aria-label={`Toggle ${bidder.name}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        bidder.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfigureClick(bidder)}
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Configure
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {filteredBidders.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            No bidders found matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      <FormModal
        isOpen={configModal.isOpen}
        onClose={handleConfigClose}
        title={`Configure ${configModal.bidder?.name || 'Bidder'}`}
      >
        <form onSubmit={handleConfigSave} className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            {configModal.bidder?.description}
          </p>
          {configModal.bidder &&
            Object.keys(configModal.bidder.config).map((key) => (
              <div key={key}>
                <label
                  htmlFor={key}
                  className="block text-sm font-medium text-gray-700 capitalize"
                >
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <input
                  type="text"
                  id={key}
                  value={configForm[key] || ''}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder={`Enter ${key}`}
                />
              </div>
            ))}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleConfigClose}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
