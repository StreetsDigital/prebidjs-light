import { Link } from 'react-router-dom';

interface ABTestVariant {
  id: string;
  name: string;
  trafficPercent: number;
  isControl: boolean;
  bidderTimeout?: number;
  priceGranularity?: string;
  enableSendAllBids?: boolean;
  bidderSequence?: string;
  floorsConfig?: any;
  bidderOverrides?: any;
}

interface ABTest {
  id: string;
  publisherId: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: string;
  endDate?: string;
  variants: ABTestVariant[];
  createdAt: string;
  updatedAt: string;
}

interface Publisher {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  domains: string[];
  status: 'active' | 'paused' | 'disabled';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ABTestsTabProps {
  publisher: Publisher;
  abTests: ABTest[];
  onCreateAbTest: () => void;
  onEditAbTest: (test: ABTest) => void;
  onDeleteAbTest: (test: ABTest) => void;
  onStatusChange: (test: ABTest, status: 'running' | 'paused' | 'completed') => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export function ABTestsTab({
  publisher,
  abTests,
  onCreateAbTest,
  onEditAbTest,
  onDeleteAbTest,
  onStatusChange,
  getStatusBadge,
}: ABTestsTabProps) {
  return (
    <div className="space-y-6">
      {/* A/B Tests Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">A/B Tests</h2>
            <p className="text-sm text-gray-500">
              Split traffic between different wrapper configurations to compare performance.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateAbTest}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Create A/B Test
          </button>
        </div>

        {/* Active Test Banner */}
        {abTests.some(t => t.status === 'running') && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-green-800">
                A/B test is currently running: {abTests.find(t => t.status === 'running')?.name}
              </span>
            </div>
          </div>
        )}

        {/* A/B Tests List */}
        {abTests.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No A/B tests</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create an A/B test to experiment with different configurations.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {abTests.map(test => (
              <div key={test.id} className="py-4 first:pt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900">{test.name}</h3>
                      {getStatusBadge(test.status)}
                    </div>
                    {test.description && (
                      <p className="mt-1 text-sm text-gray-500">{test.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      Created {new Date(test.createdAt).toLocaleDateString()} •{' '}
                      {test.variants.length} variants
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {test.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => onStatusChange(test, 'running')}
                        className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500"
                      >
                        Start
                      </button>
                    )}
                    {test.status === 'running' && (
                      <button
                        type="button"
                        onClick={() => onStatusChange(test, 'paused')}
                        className="inline-flex items-center rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-500"
                      >
                        Pause
                      </button>
                    )}
                    {test.status === 'paused' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onStatusChange(test, 'running')}
                          className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500"
                        >
                          Resume
                        </button>
                        <button
                          type="button"
                          onClick={() => onStatusChange(test, 'completed')}
                          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                        >
                          Complete
                        </button>
                      </>
                    )}
                    {(test.status === 'draft' || test.status === 'paused') && (
                      <button
                        type="button"
                        onClick={() => onEditAbTest(test)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteAbTest(test)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Variants Table */}
                <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Config Overrides</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {test.variants.map(variant => (
                        <tr key={variant.id}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{variant.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${variant.trafficPercent}%` }}
                                ></div>
                              </div>
                              {variant.trafficPercent}%
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {variant.isControl ? (
                              <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                                Control
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                Variant
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {variant.isControl ? (
                              <span className="text-gray-400">Base config</span>
                            ) : (
                              <span>
                                {variant.bidderTimeout && `Timeout: ${variant.bidderTimeout}ms`}
                                {variant.priceGranularity && ` Granularity: ${variant.priceGranularity}`}
                                {!variant.bidderTimeout && !variant.priceGranularity && (
                                  <span className="text-gray-400">No overrides</span>
                                )}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How A/B Testing Works */}
      <div className="bg-blue-50 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-4">How A/B Testing Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <span className="text-blue-600 font-semibold">1</span>
              </div>
              <h4 className="font-medium text-blue-900">Create Variants</h4>
            </div>
            <p className="text-sm text-blue-700 ml-11">
              Define multiple config variants with different settings (timeout, price granularity, etc.)
            </p>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <span className="text-blue-600 font-semibold">2</span>
              </div>
              <h4 className="font-medium text-blue-900">Split Traffic</h4>
            </div>
            <p className="text-sm text-blue-700 ml-11">
              Set traffic percentages for each variant. Users are randomly assigned to a variant.
            </p>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <span className="text-blue-600 font-semibold">3</span>
              </div>
              <h4 className="font-medium text-blue-900">Analyze Results</h4>
            </div>
            <p className="text-sm text-blue-700 ml-11">
              Compare performance metrics between variants using the Analytics tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
