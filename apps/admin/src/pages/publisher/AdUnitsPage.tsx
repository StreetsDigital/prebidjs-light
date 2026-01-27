import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface Website {
  id: string;
  domain: string;
  status: 'active' | 'paused';
}

interface AdUnit {
  id: string;
  websiteId: string;
  code: string;
  name: string;
  mediaTypes: {
    banner?: { sizes: number[][] };
    video?: { playerSize?: number[] };
    native?: object;
  } | null;
  status: 'active' | 'paused';
}

export function AdUnitsPage() {
  const { user, token } = useAuthStore();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [adUnitsByWebsite, setAdUnitsByWebsite] = useState<Record<string, AdUnit[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWebsites, setExpandedWebsites] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.publisherId) {
        setError('No publisher assigned to this account');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch websites
        const websitesResponse = await fetch(`/api/publishers/${user.publisherId}/websites`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!websitesResponse.ok) {
          throw new Error('Failed to fetch websites');
        }

        const websitesData = await websitesResponse.json();
        const websitesList = websitesData.websites || [];
        setWebsites(websitesList);

        // Expand all websites by default
        setExpandedWebsites(new Set(websitesList.map((w: Website) => w.id)));

        // Fetch ad units for each website
        const adUnitsByWebsiteTemp: Record<string, AdUnit[]> = {};

        for (const website of websitesList) {
          const adUnitsResponse = await fetch(`/api/websites/${website.id}/ad-units`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (adUnitsResponse.ok) {
            const adUnitsData = await adUnitsResponse.json();
            adUnitsByWebsiteTemp[website.id] = adUnitsData.adUnits || [];
          } else {
            adUnitsByWebsiteTemp[website.id] = [];
          }
        }

        setAdUnitsByWebsite(adUnitsByWebsiteTemp);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.publisherId, token]);

  const toggleWebsite = (websiteId: string) => {
    const newExpanded = new Set(expandedWebsites);
    if (newExpanded.has(websiteId)) {
      newExpanded.delete(websiteId);
    } else {
      newExpanded.add(websiteId);
    }
    setExpandedWebsites(newExpanded);
  };

  const filterAdUnits = (units: AdUnit[]) => {
    if (!searchQuery) return units;
    return units.filter(
      (unit) =>
        unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      disabled: 'bg-red-100 text-red-800',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  const getSizes = (unit: AdUnit): string[] => {
    if (!unit.mediaTypes?.banner?.sizes) return [];
    return unit.mediaTypes.banner.sizes.map((s) => `${s[0]}x${s[1]}`);
  };

  const getMediaTypesList = (unit: AdUnit): string[] => {
    if (!unit.mediaTypes) return [];
    return Object.keys(unit.mediaTypes);
  };

  const getTotalAdUnits = () => {
    return Object.values(adUnitsByWebsite).reduce((sum, units) => sum + units.length, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ad Units</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your ad placements across {websites.length} website{websites.length !== 1 ? 's' : ''} ({getTotalAdUnits()} total ad units).
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-4">
        <input
          type="text"
          placeholder="Search ad units by name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
        />
      </div>

      {/* Websites with Ad Units */}
      <div className="space-y-4">
        {websites.map((website) => {
          const websiteAdUnits = adUnitsByWebsite[website.id] || [];
          const filteredUnits = filterAdUnits(websiteAdUnits);
          const isExpanded = expandedWebsites.has(website.id);

          // Hide website if search doesn't match any ad units
          if (searchQuery && filteredUnits.length === 0) {
            return null;
          }

          return (
            <div key={website.id} className="bg-white rounded-lg shadow">
              {/* Website Header */}
              <button
                onClick={() => toggleWebsite(website.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <svg
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      isExpanded ? 'transform rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">{website.domain}</h3>
                    <p className="text-sm text-gray-500">
                      {filteredUnits.length} ad unit{filteredUnits.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusBadge(website.status)}
                </div>
              </button>

              {/* Ad Units Grid */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  {filteredUnits.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {filteredUnits.map((unit) => (
                        <div
                          key={unit.id}
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-base font-semibold text-gray-900">{unit.name}</h4>
                              <p className="text-sm text-gray-500 mt-1">
                                <code className="bg-white px-1 py-0.5 rounded text-xs">{unit.code}</code>
                              </p>
                            </div>
                            {getStatusBadge(unit.status)}
                          </div>

                          <div className="mt-3 space-y-2">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Sizes</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {getSizes(unit).length > 0 ? (
                                  getSizes(unit).map((size) => (
                                    <span
                                      key={size}
                                      className="inline-flex items-center rounded bg-white px-2 py-0.5 text-xs font-medium text-gray-600"
                                    >
                                      {size}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-400">No sizes configured</span>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Media Types</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {getMediaTypesList(unit).map((type) => (
                                  <span
                                    key={type}
                                    className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                                  >
                                    {type}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                              type="button"
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                            >
                              Get Code
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-gray-500">No ad units for this website yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {websites.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
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
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No websites found</h3>
          <p className="mt-2 text-sm text-gray-500">
            Contact your account manager to set up websites for your publisher account.
          </p>
        </div>
      )}

      {/* No Results State */}
      {websites.length > 0 && getTotalAdUnits() === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
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
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No ad units found</h3>
          <p className="mt-2 text-sm text-gray-500">
            Contact your account manager to configure ad units for your websites.
          </p>
        </div>
      )}
    </div>
  );
}
