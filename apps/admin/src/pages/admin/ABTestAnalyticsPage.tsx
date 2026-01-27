import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface VariantMetrics {
  variantId: string;
  variantName: string;
  isControl: boolean;
  impressions: number;
  auctionsCount: number;
  totalRevenue: number;
  avgCpm: number;
  fillRate: number;
  winRate: number;
  avgLatency: number;
  timeoutRate: number;
  bidDensity: number;
  renderSuccessRate: number;
  uniqueBidders: number;
}

interface ComparisonMetric {
  metric: string;
  control: number;
  variant: number;
  difference: number;
  percentChange: number;
  isSignificant: boolean;
}

interface AnalyticsData {
  test: {
    id: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
  };
  dateRange: {
    start: string;
    end: string;
  };
  variants: VariantMetrics[];
  comparisons: Record<string, ComparisonMetric[]>;
  summary: {
    hasSignificantResults: boolean;
    bestPerformingVariant: string;
  };
}

export function ABTestAnalyticsPage() {
  const { publisherId, testId } = useParams<{ publisherId: string; testId: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string>('all');

  useEffect(() => {
    fetchAnalytics();
  }, [publisherId, testId, token]);

  const fetchAnalytics = async () => {
    if (!publisherId || !testId) return;

    try {
      const response = await fetch(
        `/api/publishers/${publisherId}/ab-tests/${testId}/analytics`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals);
  };

  const formatCurrency = (num: number) => {
    return `$${num.toFixed(2)}`;
  };

  const formatPercent = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  const getChangeColor = (percentChange: number, lowerIsBetter: boolean = false) => {
    const isPositive = lowerIsBetter ? percentChange < 0 : percentChange > 0;
    if (Math.abs(percentChange) < 1) return 'text-gray-600';
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = (percentChange: number, lowerIsBetter: boolean = false) => {
    const isPositive = lowerIsBetter ? percentChange < 0 : percentChange > 0;
    if (Math.abs(percentChange) < 1) return null;

    return isPositive ? (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  const controlVariant = analytics.variants.find(v => v.isControl);
  const testVariants = analytics.variants.filter(v => !v.isControl);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/admin/publishers/${publisherId}`)}
          className="text-sm text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Publisher
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{analytics.test.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              A/B Test Analytics - {new Date(analytics.dateRange.start).toLocaleDateString()} to{' '}
              {new Date(analytics.dateRange.end).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              analytics.test.status === 'running'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {analytics.test.status}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      {analytics.summary.hasSignificantResults && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Significant Results Detected</h3>
              <div className="mt-1 text-sm text-green-700">
                <p>
                  Best performing variant: <strong>{analytics.summary.bestPerformingVariant}</strong>
                </p>
                <p className="mt-1">Review the metrics below to make your decision.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variant Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics.variants.map((variant) => (
          <div
            key={variant.variantId}
            className={`bg-white rounded-lg shadow p-4 ${
              variant.isControl ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{variant.variantName}</h3>
              {variant.isControl && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Control</span>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Impressions</span>
                <span className="font-medium">{variant.impressions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Revenue</span>
                <span className="font-medium">{formatCurrency(variant.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">eCPM</span>
                <span className="font-medium">{formatCurrency(variant.avgCpm)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fill Rate</span>
                <span className="font-medium">{formatPercent(variant.fillRate)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Comparisons */}
      {controlVariant && testVariants.map((testVariant) => {
        const comparisons = analytics.comparisons[testVariant.variantId] || [];

        return (
          <div key={testVariant.variantId} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {testVariant.variantName} vs {controlVariant.variantName} (Control)
              </h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Metric
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Control
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variant
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Significant
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {comparisons.map((comparison) => {
                      const lowerIsBetter = comparison.metric.includes('Latency') || comparison.metric.includes('Timeout');
                      const changeColor = getChangeColor(comparison.percentChange, lowerIsBetter);
                      const changeIcon = getChangeIcon(comparison.percentChange, lowerIsBetter);

                      return (
                        <tr key={comparison.metric} className={comparison.isSignificant ? 'bg-yellow-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {comparison.metric}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                            {comparison.metric.includes('Revenue') || comparison.metric.includes('eCPM')
                              ? formatCurrency(comparison.control)
                              : comparison.metric.includes('%')
                              ? formatPercent(comparison.control)
                              : formatNumber(comparison.control)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                            {comparison.metric.includes('Revenue') || comparison.metric.includes('eCPM')
                              ? formatCurrency(comparison.variant)
                              : comparison.metric.includes('%')
                              ? formatPercent(comparison.variant)
                              : formatNumber(comparison.variant)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${changeColor}`}>
                            <div className="flex items-center justify-end space-x-1">
                              {changeIcon}
                              <span>{formatPercent(Math.abs(comparison.percentChange))}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {comparison.isSignificant ? (
                              <svg className="w-5 h-5 text-yellow-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Metric Explanations */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-2">Key Metrics</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li><strong>eCPM:</strong> Effective cost per 1000 impressions</li>
                    <li><strong>Fill Rate:</strong> % of auctions that resulted in a win</li>
                    <li><strong>Bid Density:</strong> Average bids per auction</li>
                    <li><strong>Render Success:</strong> % of wins that rendered successfully</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-2">Performance Metrics</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li><strong>Latency:</strong> Average bid response time</li>
                    <li><strong>Timeout Rate:</strong> % of bids that timed out</li>
                    <li><strong>Win Rate:</strong> % of bids that won the auction</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
