import React from 'react';

/**
 * AdUnitsTab Props Interface
 */
export interface AdUnitsTabProps {
  websites: Website[];
  adUnitsByWebsite: Record<string, AdUnit[]>;
  onAddAdUnit: (websiteId: string) => void;
  onEditAdUnit: (adUnit: AdUnit) => void;
  onDuplicateAdUnit: (adUnit: AdUnit) => void;
  onDeleteAdUnit: (adUnit: AdUnit) => void;
  onNavigateToWebsites: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

/**
 * Website Interface
 */
interface Website {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'paused' | 'disabled';
  notes: string | null;
  adUnitCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * AdUnit Interface
 */
interface AdUnit {
  id: string;
  websiteId: string;
  code: string;
  name: string;
  sizes: string[];
  mediaTypes: string[];
  status: 'active' | 'paused';
  floorPrice: string | null;
  sizeMapping: SizeMappingRule[] | null;
  videoConfig?: VideoConfig;
}

/**
 * SizeMappingRule Interface
 */
interface SizeMappingRule {
  minViewport: [number, number];
  sizes: number[][];
}

/**
 * VideoConfig Interface
 */
interface VideoConfig {
  playerSize: string;
  context: 'instream' | 'outstream' | 'adpod';
  mimes: string[];
  protocols: number[];
  playbackMethods: number[];
  minDuration?: number;
  maxDuration?: number;
}

/**
 * AdUnitsTab Component
 *
 * Displays ad units organized by website with ability to add, edit, duplicate, and delete ad units.
 *
 * @param props - Component props including websites, ad units, and event handlers
 * @returns React component for managing ad units
 */
export function AdUnitsTab({
  websites,
  adUnitsByWebsite,
  onAddAdUnit,
  onEditAdUnit,
  onDuplicateAdUnit,
  onDeleteAdUnit,
  onNavigateToWebsites,
  getStatusBadge,
}: AdUnitsTabProps) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Ad Units by Website</h2>
        <p className="text-sm text-gray-500">
          Ad units are organized by website. Each ad unit belongs to a specific website.
        </p>
      </div>

      {websites.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No websites yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create a website first, then you can add ad units to it.
          </p>
          <div className="mt-4">
            <button
              onClick={onNavigateToWebsites}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Go to Websites Tab
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {websites.map((website) => {
            const websiteAdUnits = adUnitsByWebsite[website.id] || [];
            return (
              <div key={website.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Website Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{website.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        {website.domain}
                        <span className="ml-3 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {websiteAdUnits.length} {websiteAdUnits.length === 1 ? 'unit' : 'units'}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddAdUnit(website.id)}
                      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    >
                      <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                      </svg>
                      Add Ad Unit
                    </button>
                  </div>
                </div>

                {/* Ad Units List */}
                <div className="p-4">
                  {websiteAdUnits.length === 0 ? (
                    <div className="text-center py-8">
                      <svg
                        className="mx-auto h-10 w-10 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                        />
                      </svg>
                      <h4 className="mt-2 text-sm font-medium text-gray-900">No ad units yet</h4>
                      <p className="mt-1 text-xs text-gray-500">
                        Create your first ad unit for {website.name}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {websiteAdUnits.map((unit) => (
                        <div
                          key={unit.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">{unit.name}</h3>
                              <p className="text-sm text-gray-500">
                                <code className="bg-gray-100 px-1 rounded">{unit.code}</code>
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(unit.status)}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditAdUnit(unit);
                                }}
                                className="text-blue-500 hover:text-blue-700"
                                title="Edit ad unit"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicateAdUnit(unit);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                                title="Duplicate ad unit"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteAdUnit(unit);
                                }}
                                className="text-red-500 hover:text-red-700"
                                title="Delete ad unit"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase">Sizes</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {unit.sizes.map((size) => (
                                  <span
                                    key={size}
                                    className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                                  >
                                    {size}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase">Media Types</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {unit.mediaTypes.map((type) => (
                                  <span
                                    key={type}
                                    className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                                  >
                                    {type}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {unit.floorPrice && (
                              <div>
                                <span className="text-xs font-medium text-gray-500 uppercase">Floor Price</span>
                                <div className="mt-1">
                                  <span className="inline-flex items-center rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                    ${unit.floorPrice} CPM
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
