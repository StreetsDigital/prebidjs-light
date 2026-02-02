interface ConfigWizardBasicProps {
  formData: {
    name: string;
    description: string;
    status: 'draft' | 'active' | 'paused';
    isDefault: boolean;
    blockWrapper: boolean;
  };
  onChange: (data: Partial<ConfigWizardBasicProps['formData']>) => void;
}

export default function ConfigWizardBasic({ formData, onChange }: ConfigWizardBasicProps) {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="config-name" className="block text-sm font-semibold text-gray-700 mb-2">
          Config Name *
        </label>
        <input
          id="config-name"
          type="text"
          value={formData.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g., UK Mobile Premium"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div>
        <label htmlFor="config-description" className="block text-sm font-semibold text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="config-description"
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
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
                onChange={() => onChange({ status: status as any })}
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
          onChange={(e) => onChange({ isDefault: e.target.checked })}
          className="rounded text-purple-600 focus:ring-purple-500"
        />
        <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">
          Set as default config (fallback for unmatched traffic)
        </label>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="blockWrapper"
            checked={formData.blockWrapper}
            onChange={(e) => onChange({ blockWrapper: e.target.checked })}
            className="mt-1 rounded text-red-600 focus:ring-red-500"
          />
          <div className="flex-1">
            <label htmlFor="blockWrapper" className="text-sm font-medium text-gray-700 cursor-pointer">
              Block wrapper initialization
            </label>
            <p className="text-xs text-gray-500 mt-1">
              When this config matches, the wrapper will NOT load Prebid.js. Useful for blocking specific geos, bots, or unwanted traffic.
            </p>
            {formData.blockWrapper && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-800 font-medium">
                  ⚠️ WARNING: This config will prevent Prebid.js from loading when matched. Make sure you have proper targeting rules configured.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
