import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

interface YieldRecommendation {
  id: string;
  publisherId: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  dataSnapshot: any;
  estimatedImpact: any;
  targetEntity: string | null;
  recommendedAction: any;
  status: 'pending' | 'implemented' | 'dismissed' | 'expired';
  implementedAt: string | null;
  implementedBy: string | null;
  dismissedAt: string | null;
  dismissedBy: string | null;
  dismissReason: string | null;
  actualImpact: any;
  measurementPeriod: any;
  confidence: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function YieldAdvisorPage() {
  const { publisherId } = useParams<{ publisherId: string }>();
  const token = useAuthStore((state) => state.token);

  const [recommendations, setRecommendations] = useState<YieldRecommendation[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'implemented'>('all');

  useEffect(() => {
    fetchRecommendations();
    fetchStats();
  }, [publisherId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/yield-recommendations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/publishers/${publisherId}/yield-recommendations/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const generateRecommendations = async () => {
    setGenerating(true);
    try {
      await fetch(`/api/publishers/${publisherId}/yield-recommendations/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days: 7 }),
      });
      fetchRecommendations();
      fetchStats();
    } catch (error) {
      alert('Failed to generate recommendations');
    } finally {
      setGenerating(false);
    }
  };

  const implementRecommendation = async (rec: YieldRecommendation) => {
    if (!confirm(`Implement this recommendation?\n\n${rec.title}\n\n${rec.description}`)) return;

    try {
      await fetch(`/api/publishers/${publisherId}/yield-recommendations/${rec.id}/implement`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ implementedBy: 'admin' }),
      });
      fetchRecommendations();
      fetchStats();
      alert('Recommendation implemented successfully!');
    } catch (error) {
      alert('Failed to implement recommendation');
    }
  };

  const dismissRecommendation = async (rec: YieldRecommendation) => {
    const reason = prompt('Why are you dismissing this recommendation?');
    if (!reason) return;

    try {
      await fetch(`/api/publishers/${publisherId}/yield-recommendations/${rec.id}/dismiss`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dismissedBy: 'admin', reason }),
      });
      fetchRecommendations();
      fetchStats();
    } catch (error) {
      alert('Failed to dismiss recommendation');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (filter === 'all') return true;
    return rec.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yield Optimization Advisor</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered recommendations to maximize your revenue
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={generateRecommendations}
            disabled={generating}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {generating ? '🔄 Analyzing...' : '🤖 Generate Recommendations'}
          </button>
          <Link
            to={`/admin/publishers/${publisherId}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 shadow">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-800 mt-1">Total Recommendations</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 shadow">
            <div className="text-3xl font-bold text-yellow-600">{stats.byStatus.pending}</div>
            <div className="text-sm text-yellow-800 mt-1">Pending Actions</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 shadow">
            <div className="text-3xl font-bold text-green-600">{stats.byStatus.implemented}</div>
            <div className="text-sm text-green-800 mt-1">Implemented</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 shadow">
            <div className="text-3xl font-bold text-purple-600">${stats.totalEstimatedImpact.toFixed(0)}</div>
            <div className="text-sm text-purple-800 mt-1">Est. Revenue Impact</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          {['all', 'pending', 'implemented'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
            Loading recommendations...
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
            <p className="text-lg font-medium">No recommendations</p>
            <p className="mt-2">Click "Generate Recommendations" to analyze your setup</p>
          </div>
        ) : (
          filteredRecommendations.map((rec) => (
            <div
              key={rec.id}
              className={`bg-white shadow rounded-lg p-6 border-l-4 ${getPriorityColor(rec.priority)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPriorityColor(rec.priority)}`}>
                      {rec.priority.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {rec.type.replace(/_/g, ' ')}
                    </span>
                    {rec.status !== 'pending' && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        rec.status === 'implemented' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {rec.status}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{rec.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{rec.description}</p>

                  {rec.estimatedImpact && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Est. Revenue Impact:</span>
                          <div className="font-semibold text-gray-900">
                            ${rec.estimatedImpact.revenueChange?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Percent Change:</span>
                          <div className="font-semibold text-gray-900">
                            {rec.estimatedImpact.percentChange?.toFixed(1) || '0'}%
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Confidence:</span>
                          <div className="font-semibold text-gray-900 capitalize">{rec.confidence}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {rec.actualImpact && (
                    <div className="bg-green-50 rounded-lg p-4 mb-4">
                      <div className="text-sm font-medium text-green-800 mb-2">✓ Measured Impact</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Revenue Change:</span>
                          <div className="font-semibold text-gray-900">
                            ${rec.actualImpact.revenueChange?.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Percent Change:</span>
                          <div className="font-semibold text-gray-900">
                            {rec.actualImpact.percentChange?.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {rec.status === 'pending' && (
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => implementRecommendation(rec)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Implement
                    </button>
                    <button
                      onClick={() => dismissRecommendation(rec)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
