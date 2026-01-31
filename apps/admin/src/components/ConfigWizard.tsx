import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Plus, ExternalLink, Trash2 } from 'lucide-react';
import TargetingBuilder from './TargetingBuilder';

interface ConfigWizardProps {
  publisherId: string;
  config?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function ConfigWizard({ publisherId, config, onClose, onSave }: ConfigWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    description: '',
    status: 'draft' as 'draft' | 'active' | 'paused',
    isDefault: false,

    // Step 2: Wrapper Settings
    bidderTimeout: 1500,
    priceGranularity: 'medium',
    enableSendAllBids: true,
    bidderSequence: 'random',
    debugMode: false,

    // Step 3: Bidders
    bidders: [] as any[],

    // Step 4: Targeting Rules
    targetingRules: {
      conditions: [] as any[],
      matchType: 'all' as 'all' | 'any',
      priority: 0,
    },
  });

  const [availableBidders, setAvailableBidders] = useState<any[]>([]);
  const [showAddBidderModal, setShowAddBidderModal] = useState(false);
  const [newBidderCode, setNewBidderCode] = useState('');
  const [isAddingBidder, setIsAddingBidder] = useState(false);
  const [addBidderError, setAddBidderError] = useState('');
  const [isLoadingBidders, setIsLoadingBidders] = useState(true);

  // Fetch available bidders on mount
  useEffect(() => {
    fetchAvailableBidders();
  }, [publisherId]);

  useEffect(() => {
    if (config) {
      // Load existing config for editing
      setFormData({
        name: config.name || '',
        description: config.description || '',
        status: config.status || 'draft',
        isDefault: config.isDefault || false,
        bidderTimeout: config.bidderTimeout || 1500,
        priceGranularity: config.priceGranularity || 'medium',
        enableSendAllBids: config.enableSendAllBids !== false,
        bidderSequence: config.bidderSequence || 'random',
        debugMode: config.debugMode || false,
        bidders: config.bidders ? JSON.parse(config.bidders) : [],
        targetingRules: {
          conditions: config.rules?.[0]?.conditions ? JSON.parse(config.rules[0].conditions) : [],
          matchType: config.rules?.[0]?.matchType || 'all',
          priority: config.rules?.[0]?.priority || 0,
        },
      });
    }
  }, [config]);

  const fetchAvailableBidders = async () => {
    setIsLoadingBidders(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/bidders`);
      if (!response.ok) throw new Error('Failed to fetch bidders');
      const result = await response.json();
      setAvailableBidders(result.data || []);
    } catch (error) {
      console.error('Error fetching bidders:', error);
      // Fallback to empty array
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
      const response = await fetch(`/api/publishers/${publisherId}/bidders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidderCode: newBidderCode.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add bidder');
      }

      // Refresh bidder list
      await fetchAvailableBidders();

      // Close modal and reset
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
      const response = await fetch(`/api/publishers/${publisherId}/bidders/${bidderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete bidder');

      // Refresh bidder list
      await fetchAvailableBidders();
    } catch (error) {
      console.error('Error deleting bidder:', error);
      alert('Failed to delete custom bidder');
    }
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        bidders: formData.bidders.length > 0 ? formData.bidders : undefined,
        targetingRules: formData.targetingRules.conditions.length > 0 ? formData.targetingRules : undefined,
      };

      const url = config
        ? `/api/publishers/${publisherId}/configs/${config.id}`
        : `/api/publishers/${publisherId}/configs`;

      const method = config ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save config');

      onSave();
    } catch (err) {
      console.error('Error saving config:', err);
      alert('Failed to save config. Please try again.');
    }
  };

  const toggleBidder = (bidderCode: string) => {
    const exists = formData.bidders.find(b => b.bidderCode === bidderCode);
    if (exists) {
      setFormData({
        ...formData,
        bidders: formData.bidders.filter(b => b.bidderCode !== bidderCode),
      });
    } else {
      setFormData({
        ...formData,
        bidders: [
          ...formData.bidders,
          {
            bidderCode,
            params: {},
            timeoutOverride: undefined,
            priority: 0,
          },
        ],
      });
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.bidderTimeout > 0;
      case 3:
        return true; // Bidders are optional
      case 4:
        return true; // Targeting is optional
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {config ? 'Edit Config' : 'New Wrapper Config'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {step} of 4
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-purple-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Basic Info</span>
            <span>Settings</span>
            <span>Bidders</span>
            <span>Targeting</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Config Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., UK Mobile Premium"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., High-value configuration for UK mobile users"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex gap-4">
                  {['draft', 'active', 'paused'].map((status) => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.status === status}
                        onChange={() => setFormData({ ...formData, status: status as any })}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span className="capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">
                  Set as default config (fallback for unmatched traffic)
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Wrapper Settings */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bidder Timeout (ms)
                </label>
                <input
                  type="number"
                  value={formData.bidderTimeout}
                  onChange={(e) => setFormData({ ...formData, bidderTimeout: parseInt(e.target.value) || 0 })}
                  min="500"
                  max="5000"
                  step="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price Granularity
                </label>
                <select
                  value={formData.priceGranularity}
                  onChange={(e) => setFormData({ ...formData, priceGranularity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="auto">Auto</option>
                  <option value="dense">Dense</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableSendAllBids"
                  checked={formData.enableSendAllBids}
                  onChange={(e) => setFormData({ ...formData, enableSendAllBids: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="enableSendAllBids" className="text-sm font-medium text-gray-700">
                  Enable Send All Bids
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bidder Sequence
                </label>
                <div className="flex gap-4">
                  {['random', 'fixed'].map((seq) => (
                    <label key={seq} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.bidderSequence === seq}
                        onChange={() => setFormData({ ...formData, bidderSequence: seq })}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span className="capitalize">{seq}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="debugMode"
                  checked={formData.debugMode}
                  onChange={(e) => setFormData({ ...formData, debugMode: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="debugMode" className="text-sm font-medium text-gray-700">
                  Enable Debug Mode (console logging)
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Bidders */}
          {step === 3 && (
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
                    const isSelected = formData.bidders.some(b => b.bidderCode === bidder.code);
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

                  {formData.bidders.length === 0 && (
                    <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      No bidders selected. Select at least one bidder to enable bidding.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 4: Targeting Rules */}
          {step === 4 && (
            <TargetingBuilder
              conditions={formData.targetingRules.conditions}
              matchType={formData.targetingRules.matchType}
              priority={formData.targetingRules.priority}
              onChange={(rules) => setFormData({ ...formData, targetingRules: rules })}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex gap-2">
            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!formData.name.trim()}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Save Config
              </button>
            )}
          </div>
        </div>
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
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Prebid.js Bidder Code *
                </label>
                <input
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
    </div>
  );
}
