import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { PrebidMarketplaceModal } from '../../components/PrebidMarketplaceModal';
import ComponentConfigModal from '../../components/ComponentConfigModal';

interface Bidder {
  id?: string;
  name: string;
  code: string;
  description?: string;
  isBuiltIn: boolean;
  isClientSide: boolean;
  isServerSide: boolean;
  documentationUrl?: string;
}

export function BiddersPage() {
  const { user } = useAuthStore();
  const publisherId = user?.publisherId;

  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingBidder, setDeletingBidder] = useState<string | null>(null);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedBidder, setSelectedBidder] = useState<Bidder | null>(null);

  // Fetch bidders from API
  useEffect(() => {
    if (!publisherId) return;

    const fetchBidders = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `http://localhost:3001/api/publishers/${publisherId}/available-bidders`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch bidders');
        }

        const { data } = await response.json();
        setBidders(data);
      } catch (err) {
        console.error('Error fetching bidders:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bidders');
      } finally {
        setLoading(false);
      }
    };

    fetchBidders();
  }, [publisherId]);

  const filteredBidders = bidders.filter(
    (bidder) =>
      bidder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bidder.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (bidder: Bidder) => {
    if (!publisherId) return;

    const confirmMessage = bidder.isBuiltIn
      ? `Remove ${bidder.name}? This will hide it from your bidder list.`
      : `Delete ${bidder.name}? This will remove it permanently.`;

    if (!confirm(confirmMessage)) return;

    try {
      setDeletingBidder(bidder.code);

      // For built-in bidders, use bidder code; for custom bidders, use ID
      const identifier = bidder.isBuiltIn ? bidder.code : bidder.id;

      const response = await fetch(
        `http://localhost:3001/api/publishers/${publisherId}/available-bidders/${identifier}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete bidder');
      }

      // Optimistically update UI
      setBidders((prev) => prev.filter((b) => b.code !== bidder.code));
    } catch (err) {
      console.error('Error deleting bidder:', err);
      alert('Failed to delete bidder. Please try again.');
    } finally {
      setDeletingBidder(null);
    }
  };

  // Handle adding component from marketplace
  const handleAddComponent = async (component: any, type: 'bidder' | 'module' | 'analytics') => {
    if (!publisherId) return;

    if (type !== 'bidder') {
      alert('Only bidders can be added from this page. Modules and Analytics coming soon!');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/publishers/${publisherId}/available-bidders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: component.code,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add bidder');
      }

      // Refresh bidders list
      const fetchResponse = await fetch(
        `http://localhost:3001/api/publishers/${publisherId}/available-bidders`
      );
      const { data } = await fetchResponse.json();
      setBidders(data);
    } catch (err) {
      console.error('Error adding bidder:', err);
      alert(err instanceof Error ? err.message : 'Failed to add bidder');
      throw err; // Re-throw to let modal handle the error
    }
  };

  // Get capability badge
  const getCapabilityBadge = (bidder: Bidder) => {
    if (bidder.isClientSide && bidder.isServerSide) {
      return (
        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
          Client + Server
        </span>
      );
    }
    if (bidder.isClientSide) {
      return (
        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          Client-side
        </span>
      );
    }
    if (bidder.isServerSide) {
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
          Server-side
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bidders</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading bidders</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-red-600 hover:text-red-500 font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bidders</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure which demand partners participate in your auctions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsMarketplaceOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Browse Bidders
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Bidders</p>
          <p className="text-2xl font-semibold text-gray-900">{bidders.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Built-in Bidders</p>
          <p className="text-2xl font-semibold text-gray-900">
            {bidders.filter((b) => b.isBuiltIn).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Custom Bidders</p>
          <p className="text-2xl font-semibold text-gray-900">
            {bidders.filter((b) => !b.isBuiltIn).length}
          </p>
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
        {filteredBidders.length === 0 ? (
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {searchQuery ? 'No bidders found' : 'No bidders added yet'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery
                ? 'No bidders match your search criteria.'
                : 'Click "Browse Bidders" to add bidders to your account.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredBidders.map((bidder) => (
              <li key={bidder.code} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-600">
                        {bidder.code.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {bidder.name}
                        </h3>
                        {bidder.isBuiltIn && (
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                            Built-in
                          </span>
                        )}
                        {getCapabilityBadge(bidder)}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {bidder.description || `Bidder code: ${bidder.code}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 ml-4">
                    {bidder.documentationUrl && (
                      <a
                        href={bidder.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Docs
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBidder(bidder);
                        setConfigModalOpen(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Configure
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(bidder)}
                      disabled={deletingBidder === bidder.code}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingBidder === bidder.code ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Marketplace Modal */}
      <PrebidMarketplaceModal
        isOpen={isMarketplaceOpen}
        onClose={() => setIsMarketplaceOpen(false)}
        onAdd={handleAddComponent}
        addedBidders={bidders.map((b) => b.code)}
      />

      {/* Configuration Modal */}
      {selectedBidder && publisherId && (
        <ComponentConfigModal
          isOpen={configModalOpen}
          onClose={() => {
            setConfigModalOpen(false);
            setSelectedBidder(null);
          }}
          componentType="bidder"
          componentCode={selectedBidder.code}
          componentName={selectedBidder.name}
          publisherId={publisherId}
          onSave={() => {
            // Configuration saved successfully
            // Could reload bidders here if we need to show updated config
          }}
        />
      )}
    </div>
  );
}
