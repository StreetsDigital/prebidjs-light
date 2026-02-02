import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Package, Check, X, Clock, Download, Play } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '${API_BASE_URL}';

interface Build {
  id: string;
  version: string;
  status: 'pending' | 'building' | 'success' | 'failed';
  cdnUrl?: string;
  fileSize?: number;
  isActive: boolean;
  createdAt: string;
  completedAt?: string;
}

export function BuildsPage() {
  const { user } = useAuthStore();
  const publisherId = user?.publisherId;

  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    if (!publisherId) return;
    fetchBuilds();
  }, [publisherId]);

  const fetchBuilds = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/publishers/${publisherId}/builds`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch builds');
      }

      const { data } = await response.json();
      setBuilds(data);
    } catch (err) {
      console.error('Error fetching builds:', err);
      setError(err instanceof Error ? err.message : 'Failed to load builds');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBuild = async () => {
    if (!publisherId) return;

    if (!confirm('Generate a new Prebid.js build with your current components?')) {
      return;
    }

    try {
      setBuilding(true);

      const response = await fetch(
        `${API_BASE_URL}/api/publishers/${publisherId}/builds`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to trigger build');
      }

      const { data } = await response.json();

      // Poll for build completion
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(
          `${API_BASE_URL}/api/publishers/${publisherId}/builds/${data.buildId}`
        );

        if (statusResponse.ok) {
          const { data: build } = await statusResponse.json();

          if (build.status === 'success' || build.status === 'failed') {
            clearInterval(pollInterval);
            clearTimeout(timeoutId);
            setBuilding(false);
            fetchBuilds();

            if (build.status === 'success') {
              alert('Build completed successfully!');
            } else {
              alert('Build failed. Please try again.');
            }
          }
        }
      }, 2000);

      // Timeout after 60 seconds
      const timeoutId = setTimeout(() => {
        clearInterval(pollInterval);
        setBuilding(false);
        fetchBuilds();
      }, 60000);
    } catch (err) {
      console.error('Error triggering build:', err);
      alert('Failed to trigger build');
      setBuilding(false);
    }
  };

  const handleActivateBuild = async (buildId: string) => {
    if (!publisherId) return;

    if (!confirm('Activate this build? It will become your active Prebid.js bundle.')) {
      return;
    }

    try {
      setActivating(buildId);

      const response = await fetch(
        `${API_BASE_URL}/api/publishers/${publisherId}/builds/${buildId}/activate`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to activate build');
      }

      alert('Build activated successfully!');
      fetchBuilds();
    } catch (err) {
      console.error('Error activating build:', err);
      alert('Failed to activate build');
    } finally {
      setActivating(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <X className="w-5 h-5 text-red-600" />;
      case 'building':
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      success: 'bg-green-50 text-green-700 ring-green-700/10',
      failed: 'bg-red-50 text-red-700 ring-red-700/10',
      building: 'bg-yellow-50 text-yellow-700 ring-yellow-700/10',
      pending: 'bg-gray-50 text-gray-700 ring-gray-700/10',
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    return (bytes / 1024).toFixed(2) + ' KB';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Prebid.js Builds</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  const activeBuild = builds.find((b) => b.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prebid.js Builds</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage custom Prebid.js bundles with your selected components
          </p>
        </div>
        <button
          onClick={handleTriggerBuild}
          disabled={building}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {building ? (
            <>
              <Clock className="animate-spin -ml-1 mr-2 h-5 w-5" />
              Building...
            </>
          ) : (
            <>
              <Package className="-ml-1 mr-2 h-5 w-5" />
              Generate Build
            </>
          )}
        </button>
      </div>

      {/* Active Build */}
      {activeBuild && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">Active Build</h3>
              <p className="text-sm text-blue-700">
                Version {activeBuild.version} • {formatFileSize(activeBuild.fileSize)}
              </p>
            </div>
            {activeBuild.cdnUrl && (
              <a
                href={activeBuild.cdnUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </a>
            )}
          </div>
        </div>
      )}

      {/* Builds List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {builds.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No builds yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Click "Generate Build" to create your first custom Prebid.js bundle
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {builds.map((build) => (
                <tr key={build.id} className={build.isActive ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(build.status)}
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {build.version}
                      </span>
                      {build.isActive && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Active
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadge(
                        build.status
                      )}`}
                    >
                      {build.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(build.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(build.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {build.status === 'success' && !build.isActive && (
                        <button
                          onClick={() => handleActivateBuild(build.id)}
                          disabled={activating === build.id}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          {activating === build.id ? 'Activating...' : 'Activate'}
                        </button>
                      )}
                      {build.cdnUrl && (
                        <a
                          href={build.cdnUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
