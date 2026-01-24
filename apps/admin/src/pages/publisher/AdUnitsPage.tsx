import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface AdUnit {
  id: string;
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
  const [adUnits, setAdUnits] = useState<AdUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchAdUnits = async () => {
      if (!user?.publisherId) {
        setError('No publisher assigned to this account');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/publishers/${user.publisherId}/ad-units`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch ad units');
        }

        const data = await response.json();
        setAdUnits(data.adUnits);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdUnits();
  }, [user?.publisherId, token]);

  const filteredAdUnits = adUnits.filter(
    (unit) =>
      unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            Manage your ad placements and configurations.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          <svg
            className="-ml-0.5 mr-1.5 h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
          </svg>
          Create Ad Unit
        </button>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-4">
        <input
          type="text"
          placeholder="Search ad units..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
        />
      </div>

      {/* Ad Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAdUnits.map((unit) => (
          <div
            key={unit.id}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{unit.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <code className="bg-gray-100 px-1 rounded">{unit.code}</code>
                </p>
              </div>
              {getStatusBadge(unit.status)}
            </div>

            <div className="mt-4 space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Sizes</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {getSizes(unit).length > 0 ? (
                    getSizes(unit).map((size) => (
                      <span
                        key={size}
                        className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
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

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end space-x-2">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
              <button
                type="button"
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Get Code
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredAdUnits.length === 0 && (
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
            {searchQuery
              ? 'No ad units match your search.'
              : 'Get started by creating your first ad unit.'}
          </p>
        </div>
      )}
    </div>
  );
}
