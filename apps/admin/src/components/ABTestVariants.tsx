import { useState } from 'react';

export interface Variant {
  name: string;
  trafficPercent: number;
  isControl: boolean;
  bidderTimeout: string;
  priceGranularity: string;
  enableSendAllBids: boolean | null;
  bidderSequence: string;
  additionalBidders: Array<{
    bidderCode: string;
    enabled: boolean;
    params: string;
    timeoutOverride: string;
    priority: string;
  }>;
}

interface Props {
  variants: Variant[];
  onVariantsChange: (variants: Variant[]) => void;
}

export function ABTestVariants({ variants, onVariantsChange }: Props) {
  const [showBidderForm, setShowBidderForm] = useState<number | null>(null);
  const [newBidder, setNewBidder] = useState({
    bidderCode: '',
    enabled: true,
    params: '{}',
    timeoutOverride: '',
    priority: '0',
  });

  const totalTraffic = variants.reduce((sum, v) => sum + v.trafficPercent, 0);
  const isTrafficValid = totalTraffic === 100;

  const addVariant = () => {
    const remaining = 100 - totalTraffic;
    if (remaining > 0) {
      onVariantsChange([
        ...variants,
        {
          name: `Variant ${String.fromCharCode(65 + variants.length - 1)}`,
          trafficPercent: remaining,
          isControl: false,
          bidderTimeout: '',
          priceGranularity: '',
          enableSendAllBids: null,
          bidderSequence: '',
          additionalBidders: [],
        },
      ]);
    }
  };

  const removeVariant = (index: number) => {
    if (variants.length > 2) {
      onVariantsChange(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    onVariantsChange(updated);
  };

  const distributeTrafficEvenly = () => {
    const perVariant = Math.floor(100 / variants.length);
    const remainder = 100 - perVariant * variants.length;

    const updated = variants.map((v, i) => ({
      ...v,
      trafficPercent: i === 0 ? perVariant + remainder : perVariant,
    }));
    onVariantsChange(updated);
  };

  const addBidderToVariant = (variantIndex: number) => {
    try {
      const parsedParams = JSON.parse(newBidder.params);
      const updated = [...variants];
      updated[variantIndex].additionalBidders.push({
        bidderCode: newBidder.bidderCode,
        enabled: newBidder.enabled,
        params: newBidder.params,
        timeoutOverride: newBidder.timeoutOverride,
        priority: newBidder.priority,
      });
      onVariantsChange(updated);
      setShowBidderForm(null);
      setNewBidder({
        bidderCode: '',
        enabled: true,
        params: '{}',
        timeoutOverride: '',
        priority: '0',
      });
    } catch (err) {
      alert('Invalid JSON in bidder params');
    }
  };

  const removeBidderFromVariant = (variantIndex: number, bidderIndex: number) => {
    const updated = [...variants];
    updated[variantIndex].additionalBidders = updated[variantIndex].additionalBidders.filter(
      (_, i) => i !== bidderIndex
    );
    onVariantsChange(updated);
  };

  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Traffic Split</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure traffic percentage for each variant (must total 100%)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={distributeTrafficEvenly}
            className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
          >
            Distribute Evenly
          </button>
          <span
            className={`text-sm font-medium px-3 py-1.5 rounded ${
              isTrafficValid
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            Total: {totalTraffic}%
          </span>
        </div>
      </div>

      {/* Variants */}
      <div className="space-y-4">
        {variants.map((variant, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${
              variant.isControl ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  value={variant.name}
                  onChange={(e) => updateVariant(index, 'name', e.target.value)}
                  className="text-lg font-semibold bg-transparent border-0 border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-0 w-full"
                  placeholder="Variant name"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={variant.isControl}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Uncheck all other controls
                        const updated = variants.map((v, i) => ({
                          ...v,
                          isControl: i === index,
                        }));
                        onVariantsChange(updated);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Control</span>
                </label>
                {variants.length > 2 && !variant.isControl && (
                  <button
                    onClick={() => removeVariant(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Traffic Slider */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Traffic Allocation</label>
                <span className="text-sm font-semibold text-blue-600">{variant.trafficPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={variant.trafficPercent}
                onChange={(e) => updateVariant(index, 'trafficPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Config Overrides */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Bidder Timeout (ms)
                </label>
                <input
                  type="number"
                  value={variant.bidderTimeout}
                  onChange={(e) => updateVariant(index, 'bidderTimeout', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 1500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Price Granularity
                </label>
                <select
                  value={variant.priceGranularity}
                  onChange={(e) => updateVariant(index, 'priceGranularity', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Default</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="auto">Auto</option>
                  <option value="dense">Dense</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Bidder Sequence
                </label>
                <select
                  value={variant.bidderSequence}
                  onChange={(e) => updateVariant(index, 'bidderSequence', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Default</option>
                  <option value="random">Random</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Send All Bids
                </label>
                <select
                  value={variant.enableSendAllBids === null ? '' : variant.enableSendAllBids.toString()}
                  onChange={(e) => updateVariant(index, 'enableSendAllBids', e.target.value === '' ? null : e.target.value === 'true')}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Default</option>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>

            {/* Additional Bidders */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">Additional Bidders</label>
                <button
                  onClick={() => setShowBidderForm(showBidderForm === index ? null : index)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add Bidder
                </button>
              </div>

              {variant.additionalBidders.length > 0 && (
                <div className="space-y-1 mb-2">
                  {variant.additionalBidders.map((bidder, bidderIndex) => (
                    <div key={bidderIndex} className="flex items-center justify-between bg-white rounded px-2 py-1 text-xs">
                      <span className="font-medium">{bidder.bidderCode}</span>
                      <button
                        onClick={() => removeBidderFromVariant(index, bidderIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showBidderForm === index && (
                <div className="bg-white rounded-lg border border-gray-300 p-3 space-y-2">
                  <input
                    type="text"
                    value={newBidder.bidderCode}
                    onChange={(e) => setNewBidder({ ...newBidder, bidderCode: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    placeholder="Bidder code (e.g., rubicon)"
                  />
                  <textarea
                    value={newBidder.params}
                    onChange={(e) => setNewBidder({ ...newBidder, params: e.target.value })}
                    rows={2}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded font-mono"
                    placeholder='Params JSON: {"accountId": "123"}'
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => addBidderToVariant(index)}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowBidderForm(null)}
                      className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {totalTraffic < 100 && (
          <button
            onClick={addVariant}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 font-medium"
          >
            + Add Variant
          </button>
        )}
      </div>
    </div>
  );
}
