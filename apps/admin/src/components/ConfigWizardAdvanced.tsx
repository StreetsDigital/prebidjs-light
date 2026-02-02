interface ConfigWizardAdvancedProps {
  formData: {
    bidderTimeout: number;
    priceGranularity: string;
    enableSendAllBids: boolean;
    bidderSequence: string;
    debugMode: boolean;
  };
  onChange: (data: Partial<ConfigWizardAdvancedProps['formData']>) => void;
}

export default function ConfigWizardAdvanced({ formData, onChange }: ConfigWizardAdvancedProps) {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="bidder-timeout" className="block text-sm font-semibold text-gray-700 mb-2">
          Bidder Timeout (ms)
        </label>
        <input
          id="bidder-timeout"
          type="number"
          value={formData.bidderTimeout}
          onChange={(e) => onChange({ bidderTimeout: parseInt(e.target.value) || 0 })}
          min="500"
          max="5000"
          step="100"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div>
        <label htmlFor="price-granularity" className="block text-sm font-semibold text-gray-700 mb-2">
          Price Granularity
        </label>
        <select
          id="price-granularity"
          value={formData.priceGranularity}
          onChange={(e) => onChange({ priceGranularity: e.target.value })}
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
          onChange={(e) => onChange({ enableSendAllBids: e.target.checked })}
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
                onChange={() => onChange({ bidderSequence: seq })}
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
          onChange={(e) => onChange({ debugMode: e.target.checked })}
          className="rounded text-purple-600 focus:ring-purple-500"
        />
        <label htmlFor="debugMode" className="text-sm font-medium text-gray-700">
          Enable Debug Mode (console logging)
        </label>
      </div>
    </div>
  );
}
