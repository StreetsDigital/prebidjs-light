import { useState, useEffect } from 'react';
import { Plus, ExternalLink, Trash2, X } from 'lucide-react';

interface Bidder {
  bidderCode: string;
  params: any;
  timeoutOverride?: number;
  priority: number;
}

interface AvailableBidder {
  id: string;
  code: string;
  name: string;
  description?: string;
  isBuiltIn: boolean;
  isClientSide: boolean;
  isServerSide: boolean;
  documentationUrl?: string;
}

interface ConfigWizardBiddersProps {
  publisherId: string;
  bidders: Bidder[];
  onChange: (bidders: Bidder[]) => void;
}

export default function ConfigWizardBidders({ publisherId, bidders, onChange }: ConfigWizardBiddersProps) {
  const [availableBidders, setAvailableBidders] = useState<AvailableBidder[]>([]);
  const [showAddBidderModal, setShowAddBidderModal] = useState(false);
  const [newBidderCode, setNewBidderCode] = useState('');
  const [isAddingBidder, setIsAddingBidder] = useState(false);
  const [addBidderError, setAddBidderError] = useState('');
  const [isLoadingBidders, setIsLoadingBidders] = useState(true);

  useEffect(() => {
    fetchAvailableBidders();
  }, [publisherId]);

  const fetchAvailableBidders = async () => {
    setIsLoadingBidders(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/available-bidders`);
      if (!response.ok) throw new Error('Failed to fetch bidders');
      const result = await response.json();
      setAvailableBidders(result.data || []);
    } catch (error) {
      console.error('Error fetching bidders:', error);
      setAvailableBidders([]);
    } finally {
      setIsLoadingBidders(false);
    }
  };

  const handleAddCustomBidder = async () => {
    if (!newBidderCode.trim()) {
      setAddBidderError('Please enter a bidder code');
      return;
    }

    setIsAddingBidder(true);
    setAddBidderError('');

    try {
      const response = await fetch(`/api/publishers/${publisherId}/available-bidders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidderCode: newBidderCode.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add bidder');
      }

      await fetchAvailableBidders();
      setShowAddBidderModal(false);
      setNewBidderCode('');
    } catch (error: any) {
      setAddBidderError(error.message);
    } finally {
      setIsAddingBidder(false);
    }
  };

  const handleDeleteCustomBidder = async (bidderId: string) => {
    if (!confirm('Are you sure you want to remove this custom bidder?')) {
      return;
    }

    try {
      const response = await fetch(`/api/publishers/${publisherId}/available-bidders/${bidderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete bidder');

      await fetchAvailableBidders();
    } catch (error) {
      console.error('Error deleting bidder:', error);
      alert('Failed to delete custom bidder');
    }
  };

  const toggleBidder = (bidderCode: string) => {
    const exists = bidders.find(b => b.bidderCode === bidderCode);
    if (exists) {
      onChange(bidders.filter(b => b.bidderCode !== bidderCode));
    } else {
      onChange([
        ...bidders,
        {
          bidderCode,
          params: {},
          timeoutOverride: undefined,
          priority: 0,
        },
      ]);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Select which bidders to enable for this configuration:
          </p>
          <button
            onClick={() => setShowAddBidderModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Add Custom Bidder
          </button>
        </div>

        {isLoadingBidders ? (
          <div className="text-center p-8 text-gray-500">
            Loading bidders...
          </div>
        ) : (
          <>
            {availableBidders.map((bidder) => {
              const isSelected = bidders.some(b => b.bidderCode === bidder.code);
              return (
                <div
                  key={bidder.code}
                  className={`p-4 border-2 rounded-lg transition ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => toggleBidder(bidder.code)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleBidder(bidder.code);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{bidder.name}</span>
                          <span className="text-sm text-gray-500">({bidder.code})</span>
                          {bidder.isBuiltIn && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                              Built-in
                            </span>
                          )}
                          {bidder.isClientSide && bidder.isServerSide && (
                            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                              Client + Server
                            </span>
                          )}
                          {bidder.isServerSide && !bidder.isClientSide && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                              Server-side
                            </span>
                          )}
                          {bidder.isClientSide && !bidder.isServerSide && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                              Client-side
                            </span>
                          )}
                        </div>
                        {bidder.description && (
                          <p className="text-xs text-gray-500 mt-1">{bidder.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {bidder.documentationUrl && (
                        <a
                          href={bidder.documentationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Params
                        </a>
                      )}
                      {!bidder.isBuiltIn && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomBidder(bidder.id);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                          title="Remove custom bidder"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {availableBidders.length === 0 && (
              <div className="text-center p-8 text-gray-500">
                No bidders available. Click "Add Custom Bidder" to add one.
              </div>
            )}

            {bidders.length === 0 && (
              <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                No bidders selected. Select at least one bidder to enable bidding.
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Custom Bidder Modal */}
      {showAddBidderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Add Custom Bidder</h3>
              <button
                onClick={() => {
                  setShowAddBidderModal(false);
                  setNewBidderCode('');
                  setAddBidderError('');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="Close add bidder modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="bidder-code" className="block text-sm font-semibold text-gray-700 mb-2">
                  Prebid.js Bidder Code *
                </label>
                <input
                  id="bidder-code"
                  type="text"
                  value={newBidderCode}
                  onChange={(e) => {
                    setNewBidderCode(e.target.value);
                    setAddBidderError('');
                  }}
                  placeholder="e.g., ix, sovrn, sharethrough"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCustomBidder();
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the exact bidder code from Prebid.js documentation
                </p>
              </div>

              {addBidderError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {addBidderError}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Tip:</strong> You can find bidder codes in the{' '}
                  <a
                    href="https://docs.prebid.org/dev-docs/bidders.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-900"
                  >
                    Prebid.js documentation
                  </a>
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddBidderModal(false);
                  setNewBidderCode('');
                  setAddBidderError('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomBidder}
                disabled={isAddingBidder || !newBidderCode.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingBidder ? 'Adding...' : 'Add Bidder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
