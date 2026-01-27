import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ABTestCreateModal } from '../../components/ABTestCreateModal';

interface ABTest {
  id: string;
  publisherId: string;
  name: string;
  description: string | null;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: string | null;
  endDate: string | null;
  parentTestId: string | null;
  parentVariantId: string | null;
  level: number;
  createdAt: string;
  variants: ABTestVariant[];
}

interface ABTestVariant {
  id: string;
  testId: string;
  name: string;
  trafficPercent: number;
  isControl: boolean;
  bidderTimeout: number | null;
  priceGranularity: string | null;
  enableSendAllBids: boolean | null;
  bidderSequence: string | null;
  floorsConfig: any;
  bidderOverrides: any;
  additionalBidders: any;
}

export function ABTestsPage() {
  const { publisherId } = useParams<{ publisherId: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<{ testId: string; variantId: string } | null>(null);

  useEffect(() => {
    fetchTests();
  }, [publisherId, token]);

  const fetchTests = async () => {
    if (!publisherId) return;

    try {
      const response = await fetch(`/api/publishers/${publisherId}/ab-tests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTests(data);
      }
    } catch (err) {
      console.error('Failed to fetch A/B tests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTest = (parentTestId?: string, parentVariantId?: string) => {
    setSelectedParent(parentTestId && parentVariantId ? { testId: parentTestId, variantId: parentVariantId } : null);
    setShowCreateModal(true);
  };

  const handleViewAnalytics = (testId: string) => {
    navigate(`/admin/publishers/${publisherId}/ab-tests/${testId}/analytics`);
  };

  const handleToggleStatus = async (test: ABTest) => {
    const newStatus = test.status === 'running' ? 'paused' : 'running';

    try {
      const response = await fetch(`/api/publishers/${publisherId}/ab-tests/${test.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchTests();
      }
    } catch (err) {
      console.error('Failed to update test status:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      running: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
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

  // Group tests by level for hierarchical display
  const rootTests = tests.filter(t => !t.parentTestId);

  const renderTestTree = (test: ABTest, depth: number = 0) => {
    const indent = depth * 32;

    return (
      <div key={test.id} style={{ marginLeft: `${indent}px` }} className="mb-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                {depth > 0 && (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <h3 className="text-base font-semibold text-gray-900">{test.name}</h3>
                {getStatusBadge(test.status)}
                {depth > 0 && (
                  <span className="text-xs text-gray-500">Level {test.level} (Nested)</span>
                )}
              </div>
              {test.description && (
                <p className="text-sm text-gray-600 mt-1">{test.description}</p>
              )}
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>{test.variants.length} variants</span>
                {test.startDate && (
                  <span>Started: {new Date(test.startDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleToggleStatus(test)}
                className={`px-3 py-1.5 text-sm rounded ${
                  test.status === 'running'
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {test.status === 'running' ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={() => handleViewAnalytics(test.id)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Analytics
              </button>
            </div>
          </div>

          {/* Variants with nested test buttons */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {test.variants.map((variant) => {
              const nestedTests = tests.filter(
                t => t.parentTestId === test.id && t.parentVariantId === variant.id
              );

              return (
                <div key={variant.id} className="bg-gray-50 rounded p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{variant.name}</span>
                    {variant.isControl && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Control</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Traffic: {variant.trafficPercent}%</div>
                    {variant.bidderTimeout && <div>Timeout: {variant.bidderTimeout}ms</div>}
                    {variant.additionalBidders && (
                      <div className="text-green-600 font-medium">
                        +{variant.additionalBidders.length} new bidders
                      </div>
                    )}
                  </div>

                  {nestedTests.length > 0 && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      {nestedTests.length} nested test{nestedTests.length !== 1 ? 's' : ''}
                    </div>
                  )}

                  <button
                    onClick={() => handleCreateTest(test.id, variant.id)}
                    className="mt-2 w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                  >
                    + Add Nested Test
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Render nested tests recursively */}
        {tests
          .filter(t => t.parentTestId === test.id)
          .map(nestedTest => renderTestTree(nestedTest, depth + 1))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">A/B Tests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Experiment with configurations and measure performance impact
          </p>
        </div>
        <button
          onClick={() => handleCreateTest()}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create A/B Test
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Nested A/B Testing</h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>You can create nested tests within any variant to run multi-level experiments.</p>
              <p className="mt-1">Example: Test timeout settings, then within the winner, test new bidders.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tests Tree */}
      {rootTests.length > 0 ? (
        <div className="space-y-4">
          {rootTests.map(test => renderTestTree(test))}
        </div>
      ) : (
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No A/B tests yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating your first A/B test to optimize performance
          </p>
          <button
            onClick={() => handleCreateTest()}
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create A/B Test
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && publisherId && (
        <ABTestCreateModal
          publisherId={publisherId}
          parentTestId={selectedParent?.testId}
          parentVariantId={selectedParent?.variantId}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedParent(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedParent(null);
            fetchTests();
          }}
        />
      )}
    </div>
  );
}
