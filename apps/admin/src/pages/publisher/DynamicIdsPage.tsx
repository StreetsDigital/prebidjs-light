import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface BidderParams {
  [key: string]: string;
}

interface AdUnitDynamicIds {
  mediaTypes: any;
  bidders: Record<string, BidderParams>;
  hasDynamicIds: boolean;
  bidderCount: number;
}

interface WrapperConfig {
  id: string;
  name: string;
  status: string;
  bidders?: string; // JSON string of bidder array
  adUnits?: string; // JSON string of ad units
}

interface PublisherBidder {
  bidderCode: string;
  params: any;
}

interface BidderParamSchema {
  required: string[];
  optional: string[];
}

const API_URL = import.meta.env.VITE_API_URL || '';

export function DynamicIdsPage() {
  const { user, token } = useAuthStore();
  const [configs, setConfigs] = useState<WrapperConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [dynamicIds, setDynamicIds] = useState<Record<string, AdUnitDynamicIds>>({});
  const [publisherBidders, setPublisherBidders] = useState<PublisherBidder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state for editing
  const [editingAdUnit, setEditingAdUnit] = useState<string | null>(null);
  const [editingBidder, setEditingBidder] = useState<string | null>(null);
  const [editParams, setEditParams] = useState<Record<string, string>>({});
  const [paramSchema, setParamSchema] = useState<BidderParamSchema | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add bidder modal
  const [showAddBidder, setShowAddBidder] = useState(false);
  const [addBidderCode, setAddBidderCode] = useState('');
  const [addBidderAdUnit, setAddBidderAdUnit] = useState('');

  const publisherId = user?.publisherId;

  // Fetch wrapper configs
  const fetchConfigs = useCallback(async () => {
    if (!publisherId) return;
    try {
      const response = await fetch(`${API_URL}/api/publishers/${publisherId}/configs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch configs');
      const data = await response.json();
      setConfigs(data.data || []);

      // Auto-select first config
      if (data.data?.length > 0 && !selectedConfigId) {
        setSelectedConfigId(data.data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch configs');
    }
  }, [publisherId, token, selectedConfigId]);

  // Fetch dynamic IDs for selected config
  const fetchDynamicIds = useCallback(async () => {
    if (!publisherId || !selectedConfigId) return;
    try {
      const response = await fetch(
        `${API_URL}/api/publishers/${publisherId}/configs/${selectedConfigId}/dynamic-ids`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch dynamic IDs');
      const data = await response.json();
      setDynamicIds(data.data || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dynamic IDs');
    }
  }, [publisherId, selectedConfigId, token]);

  // Fetch publisher bidders from selected config
  const fetchPublisherBidders = useCallback(async () => {
    if (!selectedConfigId || configs.length === 0) return;
    const config = configs.find(c => c.id === selectedConfigId);
    if (config?.bidders) {
      try {
        const bidders = typeof config.bidders === 'string'
          ? JSON.parse(config.bidders)
          : config.bidders;
        setPublisherBidders(Array.isArray(bidders) ? bidders : []);
      } catch {
        setPublisherBidders([]);
      }
    } else {
      setPublisherBidders([]);
    }
  }, [selectedConfigId, configs]);

  // Fetch param schema for a bidder
  const fetchParamSchema = async (bidderCode: string) => {
    try {
      const response = await fetch(`${API_URL}/api/bidders/param-schema/${bidderCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setParamSchema(data.data?.schema || null);
      }
    } catch {
      setParamSchema(null);
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchConfigs();
      setIsLoading(false);
    };
    load();
  }, [fetchConfigs]);

  useEffect(() => {
    if (selectedConfigId) {
      fetchDynamicIds();
      fetchPublisherBidders();
    }
  }, [selectedConfigId, fetchDynamicIds, fetchPublisherBidders]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Open edit modal for a bidder's params on an ad unit
  const handleEditBidder = async (adUnitCode: string, bidderCode: string, currentParams: BidderParams) => {
    setEditingAdUnit(adUnitCode);
    setEditingBidder(bidderCode);
    setEditParams({ ...currentParams });
    await fetchParamSchema(bidderCode);
  };

  // Save bidder params
  const handleSaveParams = async () => {
    if (!publisherId || !selectedConfigId || !editingAdUnit || !editingBidder) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/api/publishers/${publisherId}/configs/${selectedConfigId}/dynamic-ids/${editingAdUnit}/${editingBidder}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ params: editParams }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSuccessMessage(`Dynamic IDs saved for ${editingBidder} on ${editingAdUnit}`);
      setEditingAdUnit(null);
      setEditingBidder(null);
      setEditParams({});
      setParamSchema(null);
      await fetchDynamicIds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save params');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove a bidder's dynamic IDs from an ad unit
  const handleRemoveBidder = async (adUnitCode: string, bidderCode: string) => {
    if (!publisherId || !selectedConfigId) return;
    if (!confirm(`Remove dynamic IDs for ${bidderCode} on ${adUnitCode}? This will revert to publisher-level defaults.`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/publishers/${publisherId}/configs/${selectedConfigId}/dynamic-ids/${adUnitCode}/${bidderCode}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to remove');

      setSuccessMessage(`Dynamic IDs removed for ${bidderCode} on ${adUnitCode}`);
      await fetchDynamicIds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove bidder');
    }
  };

  // Add a new bidder to an ad unit
  const handleAddBidder = async () => {
    if (!addBidderCode || !addBidderAdUnit) return;
    setEditingAdUnit(addBidderAdUnit);
    setEditingBidder(addBidderCode);
    setEditParams({});
    await fetchParamSchema(addBidderCode);
    setShowAddBidder(false);
    setAddBidderCode('');
    setAddBidderAdUnit('');
  };

  // Remove all dynamic IDs for an ad unit
  const handleClearAdUnit = async (adUnitCode: string) => {
    if (!publisherId || !selectedConfigId) return;
    if (!confirm(`Remove ALL dynamic IDs for ${adUnitCode}? All bidders will revert to publisher-level defaults.`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/publishers/${publisherId}/configs/${selectedConfigId}/dynamic-ids/${adUnitCode}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to clear');

      setSuccessMessage(`All dynamic IDs cleared for ${adUnitCode}`);
      await fetchDynamicIds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear ad unit');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const adUnitCodes = Object.keys(dynamicIds);
  const selectedConfig = configs.find(c => c.id === selectedConfigId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dynamic IDs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure per-ad-unit bidder parameters. Each ad unit can have its own placement IDs,
          site IDs, and other bidder-specific params instead of using publisher-level defaults.
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <span className="sr-only">Dismiss</span>
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Config Selector */}
      <div className="bg-white shadow rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Wrapper Config</label>
        <div className="flex items-center space-x-4">
          <select
            value={selectedConfigId}
            onChange={(e) => setSelectedConfigId(e.target.value)}
            className="block w-full max-w-md rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
          >
            <option value="">Select a config...</option>
            {configs.map(config => (
              <option key={config.id} value={config.id}>
                {config.name} ({config.status})
              </option>
            ))}
          </select>
          {selectedConfig && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              selectedConfig.status === 'active' ? 'bg-green-100 text-green-800' :
              selectedConfig.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {selectedConfig.status}
            </span>
          )}
        </div>
      </div>

      {/* Publisher Bidders Reference */}
      {publisherBidders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Publisher-Level Bidders (Defaults)</h3>
          <div className="flex flex-wrap gap-2">
            {publisherBidders.map(b => (
              <span key={b.bidderCode} className="inline-flex items-center rounded bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                {b.bidderCode}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-blue-600">
            These bidders apply to all ad units by default. Dynamic IDs override their params per ad unit.
          </p>
        </div>
      )}

      {/* Ad Units with Dynamic IDs */}
      {selectedConfigId && adUnitCodes.length > 0 ? (
        <div className="space-y-4">
          {adUnitCodes.map(adUnitCode => {
            const adUnit = dynamicIds[adUnitCode];
            const bidderEntries = Object.entries(adUnit.bidders || {});

            return (
              <div key={adUnitCode} className="bg-white shadow rounded-lg overflow-hidden">
                {/* Ad Unit Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{adUnitCode}</code>
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {adUnit.hasDynamicIds
                        ? `${adUnit.bidderCount} bidder${adUnit.bidderCount !== 1 ? 's' : ''} with custom IDs`
                        : 'Using publisher-level defaults'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setShowAddBidder(true);
                        setAddBidderAdUnit(adUnitCode);
                      }}
                      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    >
                      + Add Bidder
                    </button>
                    {adUnit.hasDynamicIds && (
                      <button
                        onClick={() => handleClearAdUnit(adUnitCode)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Bidder Params Table */}
                {bidderEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Bidder
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Parameters
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bidderEntries.map(([bidderCode, params]) => (
                          <tr key={bidderCode} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded flex items-center justify-center">
                                  <span className="text-xs font-bold text-indigo-700">
                                    {bidderCode.substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-3">
                                  <span className="text-sm font-medium text-gray-900">{bidderCode}</span>
                                  {publisherBidders.some(b => b.bidderCode === bidderCode) && (
                                    <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">
                                      overrides default
                                    </span>
                                  )}
                                  {!publisherBidders.some(b => b.bidderCode === bidderCode) && (
                                    <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
                                      ad-unit only
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(params).map(([key, value]) => (
                                  <span key={key} className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">
                                    <span className="text-gray-500">{key}:</span>
                                    <span className="ml-1 text-gray-900">{String(value)}</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <button
                                onClick={() => handleEditBidder(adUnitCode, bidderCode, params)}
                                className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRemoveBidder(adUnitCode, bidderCode)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-gray-500">
                      No dynamic IDs configured. Using publisher-level bidder defaults.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click "Add Bidder" to customize bidder params for this ad unit.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : selectedConfigId ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No ad units in this config</h3>
          <p className="mt-2 text-sm text-gray-500">
            Add ad units to this wrapper config to start configuring dynamic IDs.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">Select a wrapper config</h3>
          <p className="mt-2 text-sm text-gray-500">
            Choose a wrapper config above to manage its ad unit dynamic IDs.
          </p>
        </div>
      )}

      {/* Edit Bidder Params Modal */}
      {editingAdUnit && editingBidder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => {
              setEditingAdUnit(null);
              setEditingBidder(null);
              setEditParams({});
              setParamSchema(null);
            }} />

            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 z-10">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Edit Dynamic IDs
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                <code className="bg-gray-100 px-1 rounded">{editingBidder}</code> on{' '}
                <code className="bg-gray-100 px-1 rounded">{editingAdUnit}</code>
              </p>

              {/* Schema hint */}
              {paramSchema && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-xs font-medium text-blue-800 mb-1">Known parameters for {editingBidder}:</p>
                  {paramSchema.required.length > 0 && (
                    <p className="text-xs text-blue-700">
                      Required: {paramSchema.required.join(', ')}
                    </p>
                  )}
                  {paramSchema.optional.length > 0 && (
                    <p className="text-xs text-blue-600">
                      Optional: {paramSchema.optional.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* Param inputs */}
              <div className="space-y-3">
                {Object.entries(editParams).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={key}
                      readOnly
                      className="block w-1/3 rounded-md border-0 py-1.5 text-gray-900 bg-gray-50 shadow-sm ring-1 ring-inset ring-gray-300 sm:text-sm px-3 font-mono"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setEditParams(prev => ({ ...prev, [key]: e.target.value }))}
                      className="block w-2/3 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm px-3 font-mono"
                      placeholder="value"
                    />
                    <button
                      onClick={() => {
                        const newParams = { ...editParams };
                        delete newParams[key];
                        setEditParams(newParams);
                      }}
                      className="text-red-400 hover:text-red-600 flex-shrink-0"
                      title="Remove parameter"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Add new param row */}
                <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                  <input
                    type="text"
                    id="new-param-key"
                    placeholder="param_name"
                    className="block w-1/3 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm px-3 font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const key = (e.target as HTMLInputElement).value.trim();
                        if (key && !editParams.hasOwnProperty(key)) {
                          setEditParams(prev => ({ ...prev, [key]: '' }));
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('new-param-key') as HTMLInputElement;
                      const key = input?.value.trim();
                      if (key && !editParams.hasOwnProperty(key)) {
                        setEditParams(prev => ({ ...prev, [key]: '' }));
                        input.value = '';
                      }
                    }}
                    className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    + Add Param
                  </button>

                  {/* Quick-add from schema */}
                  {paramSchema && (
                    <div className="flex gap-1">
                      {[...paramSchema.required, ...paramSchema.optional]
                        .filter(key => !editParams.hasOwnProperty(key))
                        .map(key => (
                          <button
                            key={key}
                            onClick={() => setEditParams(prev => ({ ...prev, [key]: '' }))}
                            className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                            title={`Add ${key}`}
                          >
                            +{key}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setEditingAdUnit(null);
                    setEditingBidder(null);
                    setEditParams({});
                    setParamSchema(null);
                  }}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveParams}
                  disabled={isSaving || Object.keys(editParams).length === 0}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Dynamic IDs'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Bidder Modal */}
      {showAddBidder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => {
              setShowAddBidder(false);
              setAddBidderCode('');
            }} />

            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add Bidder Dynamic IDs
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Add per-ad-unit parameters for a bidder on{' '}
                <code className="bg-gray-100 px-1 rounded">{addBidderAdUnit}</code>
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bidder Code</label>
                  <input
                    type="text"
                    value={addBidderCode}
                    onChange={(e) => setAddBidderCode(e.target.value.toLowerCase())}
                    placeholder="e.g., appnexus, rubicon, ix"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm px-3 font-mono"
                  />
                </div>

                {/* Suggested bidders from publisher level */}
                {publisherBidders.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Quick add from publisher bidders:</p>
                    <div className="flex flex-wrap gap-1">
                      {publisherBidders
                        .filter(b => !dynamicIds[addBidderAdUnit]?.bidders?.[b.bidderCode])
                        .map(b => (
                          <button
                            key={b.bidderCode}
                            onClick={() => setAddBidderCode(b.bidderCode)}
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                              addBidderCode === b.bidderCode
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {b.bidderCode}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAddBidder(false);
                    setAddBidderCode('');
                  }}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBidder}
                  disabled={!addBidderCode}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Configure Params
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
