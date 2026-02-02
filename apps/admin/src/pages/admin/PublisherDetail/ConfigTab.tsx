interface ConfigVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  changes: string;
  config: {
    bidderTimeout: number;
    priceGranularity: string;
    sendAllBids: boolean;
    bidderSequence: string;
    debugMode: boolean;
  };
}

interface UserIdModule {
  code: string;
  name: string;
  description: string;
  enabled: boolean;
  config: Record<string, string>;
  configSchema: { key: string; label: string; required: boolean; type?: 'text' | 'url' | 'number' }[];
}

interface ConsentManagementConfig {
  gdpr?: {
    enabled: boolean;
    cmpApi?: string;
    timeout?: number;
    defaultGdprScope?: boolean;
  };
  usp?: {
    enabled: boolean;
    cmpApi?: string;
    timeout?: number;
  };
}

interface FloorRule {
  id: string;
  type: 'mediaType' | 'bidder' | 'adUnit';
  value: string;
  floor: number;
}

interface PriceFloorsConfig {
  enabled: boolean;
  defaultFloor: number;
  currency: string;
  enforcement: {
    floorDeals: boolean;
    bidAdjustment: boolean;
  };
  rules: FloorRule[];
}

interface ConfigTabProps {
  currentConfig: {
    bidderTimeout: number;
    priceGranularity: string;
    sendAllBids: boolean;
    bidderSequence: string;
    debugMode: boolean;
  } | null;
  currentVersion: number;
  showVersionHistory: boolean;
  selectedVersion: ConfigVersion | null;
  configVersions: ConfigVersion[];
  userIdModules: UserIdModule[];
  consentManagement: ConsentManagementConfig | null;
  priceFloors: PriceFloorsConfig | null;
  onExportConfig: () => void;
  onImportConfigClick: () => void;
  onEditConfigClick: () => void;
  onVersionHistoryClick: () => void;
  onUserIdModuleConfigClick: (module: UserIdModule) => void;
  onUserIdModuleToggle: (moduleCode: string) => void;
  onConsentConfigClick: () => void;
  onPriceFloorsConfigClick: () => void;
  onVersionSelect: (version: ConfigVersion) => void;
  onVersionHistoryBack: () => void;
  onRollbackClick: (version: ConfigVersion) => void;
  formatVersionDate: (dateString: string) => string;
}

export function ConfigTab({
  currentConfig,
  currentVersion,
  showVersionHistory,
  selectedVersion,
  configVersions,
  userIdModules,
  consentManagement,
  priceFloors,
  onExportConfig,
  onImportConfigClick,
  onEditConfigClick,
  onVersionHistoryClick,
  onUserIdModuleConfigClick,
  onUserIdModuleToggle,
  onConsentConfigClick,
  onPriceFloorsConfigClick,
  onVersionSelect,
  onVersionHistoryBack,
  onRollbackClick,
  formatVersionDate,
}: ConfigTabProps) {
  return (
    <div className="space-y-6">
      {/* Main Config View */}
      {!showVersionHistory && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Prebid Configuration</h2>
              <p className="text-sm text-gray-500">
                Configure Prebid.js settings for this publisher.
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onExportConfig}
                className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                <svg className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Config
              </button>
              <button
                type="button"
                onClick={onImportConfigClick}
                className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                <svg className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Config
              </button>
              <button
                type="button"
                onClick={onEditConfigClick}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                <svg className="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Config
              </button>
              <button
                type="button"
                onClick={onVersionHistoryClick}
                className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                <svg className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Version History
              </button>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Bidder Timeout</dt>
              <dd className="mt-1 text-sm text-gray-900">{currentConfig?.bidderTimeout || 1500}ms</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Price Granularity</dt>
              <dd className="mt-1 text-sm text-gray-900">{currentConfig?.priceGranularity || 'medium'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Send All Bids</dt>
              <dd className="mt-1 text-sm text-gray-900">{currentConfig?.sendAllBids ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Bidder Sequence</dt>
              <dd className="mt-1 text-sm text-gray-900">{currentConfig?.bidderSequence || 'random'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Debug Mode</dt>
              <dd className="mt-1 text-sm text-gray-900">{currentConfig?.debugMode ? 'Enabled' : 'Disabled'}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* User ID Modules Section */}
      {!showVersionHistory && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900">User ID Modules</h2>
            <p className="text-sm text-gray-500">
              Configure identity modules for cross-device user identification.
            </p>
          </div>
          <div className="space-y-4">
            {userIdModules.map((module) => (
              <div
                key={module.code}
                className={`border rounded-lg p-4 ${module.enabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${module.enabled ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <span className={`font-semibold text-sm ${module.enabled ? 'text-blue-600' : 'text-gray-600'}`}>
                        {module.code.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">{module.name}</h3>
                      <p className="text-xs text-gray-500">{module.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => onUserIdModuleConfigClick(module)}
                      className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Configure
                    </button>
                    <button
                      type="button"
                      onClick={() => onUserIdModuleToggle(module.code)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${module.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                      role="switch"
                      aria-checked={module.enabled}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${module.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>
                {module.enabled && Object.keys(module.config).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(module.config).map(([key, value]) => (
                        <div key={key}>
                          <dt className="font-medium text-gray-500">{key}</dt>
                          <dd className="text-gray-900">{value || <span className="text-gray-400 italic">Not set</span>}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consent Management Section */}
      {!showVersionHistory && (
        <div id="consent-section" className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Consent Management</h2>
              <p className="text-sm text-gray-500">
                Configure GDPR TCF and US Privacy (CCPA) consent settings.
              </p>
            </div>
            <button
              type="button"
              onClick={onConsentConfigClick}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              <svg className="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Configure
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* GDPR Section */}
            <div className={`border rounded-lg p-4 ${consentManagement?.gdpr?.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">GDPR TCF 2.0</h3>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${consentManagement?.gdpr?.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {consentManagement?.gdpr?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {consentManagement?.gdpr?.enabled && (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">CMP API</dt>
                    <dd className="text-gray-900">{consentManagement.gdpr.cmpApi || 'iab'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Timeout</dt>
                    <dd className="text-gray-900">{consentManagement.gdpr.timeout || 10000}ms</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Default Scope</dt>
                    <dd className="text-gray-900">{consentManagement.gdpr.defaultGdprScope ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
              )}
            </div>
            {/* USP Section */}
            <div className={`border rounded-lg p-4 ${consentManagement?.usp?.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">US Privacy (CCPA)</h3>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${consentManagement?.usp?.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {consentManagement?.usp?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {consentManagement?.usp?.enabled && (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">CMP API</dt>
                    <dd className="text-gray-900">{consentManagement.usp.cmpApi || 'iab'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Timeout</dt>
                    <dd className="text-gray-900">{consentManagement.usp.timeout || 10000}ms</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Price Floors Section */}
      {!showVersionHistory && (
        <div id="floors-section" className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Price Floors</h2>
              <p className="text-sm text-gray-500">
                Configure minimum bid prices for ad units and bidders.
              </p>
            </div>
            <button
              type="button"
              onClick={onPriceFloorsConfigClick}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              <svg className="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Configure
            </button>
          </div>

          {/* Floors Status Card */}
          <div className={`border rounded-lg p-4 ${priceFloors?.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Price Floors Module</h3>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priceFloors?.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {priceFloors?.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {priceFloors?.enabled ? (
              <div className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Default Floor</dt>
                    <dd className="text-gray-900 font-medium">${priceFloors.defaultFloor?.toFixed(2) || '0.00'} {priceFloors.currency || 'USD'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Floor Deals</dt>
                    <dd className="text-gray-900">{priceFloors.enforcement?.floorDeals ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Bid Adjustment</dt>
                    <dd className="text-gray-900">{priceFloors.enforcement?.bidAdjustment ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Custom Rules</dt>
                    <dd className="text-gray-900">{priceFloors.rules?.length || 0} rules</dd>
                  </div>
                </dl>

                {/* Show rules if any */}
                {priceFloors.rules && priceFloors.rules.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Floor Rules</h4>
                    <div className="space-y-2">
                      {priceFloors.rules.map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm border border-green-100">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                              rule.type === 'mediaType' ? 'bg-purple-100 text-purple-700' :
                              rule.type === 'bidder' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {rule.type === 'mediaType' ? 'Media Type' : rule.type === 'bidder' ? 'Bidder' : 'Ad Unit'}
                            </span>
                            <span className="text-gray-900">{rule.value}</span>
                          </div>
                          <span className="font-medium text-gray-900">${rule.floor.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Enable price floors to set minimum bid prices for better yield optimization.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Version History View */}
      {showVersionHistory && !selectedVersion && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <button
              type="button"
              onClick={onVersionHistoryBack}
              className="mr-3 text-gray-500 hover:text-gray-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-medium text-gray-900">Version History</h2>
              <p className="text-sm text-gray-500">
                View and manage previous configuration versions.
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {/* Current version */}
            {currentConfig && (
              <div
                className="py-4 hover:bg-gray-50 cursor-pointer rounded-lg px-2 -mx-2"
                onClick={() => onVersionSelect({
                  id: 'current',
                  version: currentVersion,
                  createdAt: new Date().toISOString(),
                  createdBy: 'Current',
                  changes: 'Current configuration',
                  config: currentConfig,
                })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 text-green-700">
                      <span className="text-sm font-semibold">v{currentVersion}</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        Current configuration
                        <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Current
                        </span>
                      </p>
                      <p className="text-sm text-gray-500">Active configuration</p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            )}
            {/* Historical versions */}
            {configVersions.map((version) => (
              <div
                key={version.id}
                className="py-4 hover:bg-gray-50 cursor-pointer rounded-lg px-2 -mx-2"
                onClick={() => onVersionSelect(version)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600">
                      <span className="text-sm font-semibold">v{version.version}</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {version.changes}
                      </p>
                      <p className="text-sm text-gray-500">
                        by {version.createdBy} • {formatVersionDate(version.createdAt)}
                      </p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Version Detail View */}
      {showVersionHistory && selectedVersion && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <button
                type="button"
                onClick={onVersionHistoryBack}
                className="mr-3 text-gray-500 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Version {selectedVersion.version}
                  {selectedVersion.id === configVersions[0]?.id && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Current
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedVersion.changes}
                </p>
              </div>
            </div>
            {selectedVersion.id !== configVersions[0]?.id && (
              <button
                type="button"
                onClick={() => onRollbackClick(selectedVersion)}
                className="inline-flex items-center rounded-md bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-700 shadow-sm ring-1 ring-inset ring-yellow-600/20 hover:bg-yellow-100"
              >
                <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Rollback to this version
              </button>
            )}
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">
              Created by <span className="font-medium text-gray-900">{selectedVersion.createdBy}</span>
              {' '}on {formatVersionDate(selectedVersion.createdAt)}
            </p>
          </div>

          <h3 className="text-sm font-medium text-gray-900 mb-3">Configuration Settings</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div className="bg-gray-50 rounded-lg p-3">
              <dt className="text-sm font-medium text-gray-500">Bidder Timeout</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedVersion.config.bidderTimeout}ms</dd>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <dt className="text-sm font-medium text-gray-500">Price Granularity</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedVersion.config.priceGranularity}</dd>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <dt className="text-sm font-medium text-gray-500">Send All Bids</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedVersion.config.sendAllBids ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <dt className="text-sm font-medium text-gray-500">Bidder Sequence</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedVersion.config.bidderSequence}</dd>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <dt className="text-sm font-medium text-gray-500">Debug Mode</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedVersion.config.debugMode ? 'Enabled' : 'Disabled'}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
