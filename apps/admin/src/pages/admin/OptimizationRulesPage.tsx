import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { OptimizationRule, RuleExecution, Condition, Action } from '../../types/optimization';
import { RuleCard } from '../../components/RuleCard';
import { RuleModal } from '../../components/RuleModal';
import { RuleTestModal } from '../../components/RuleTestModal';

export function OptimizationRulesPage() {
  const { publisherId } = useParams<{ publisherId: string }>();
  const { token } = useAuthStore();
  const [rules, setRules] = useState<OptimizationRule[]>([]);
  const [executions, setExecutions] = useState<RuleExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<OptimizationRule | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    fetchRules();
    fetchExecutions();
  }, [publisherId, token]);

  const fetchRules = async () => {
    if (!publisherId) return;

    try {
      const response = await fetch(`/api/publishers/${publisherId}/optimization-rules`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExecutions = async () => {
    if (!publisherId) return;

    try {
      const response = await fetch(`/api/publishers/${publisherId}/optimization-rules-executions?limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExecutions(data);
      }
    } catch (err) {
      console.error('Failed to fetch executions:', err);
    }
  };

  const handleToggleRule = async (rule: OptimizationRule) => {
    try {
      const response = await fetch(`/api/publishers/${publisherId}/optimization-rules/${rule.id}/toggle`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleDeleteRule = async (rule: OptimizationRule) => {
    if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) return;

    try {
      const response = await fetch(`/api/publishers/${publisherId}/optimization-rules/${rule.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleTestRule = async (rule: OptimizationRule) => {
    try {
      const response = await fetch(`/api/publishers/${publisherId}/optimization-rules/${rule.id}/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
        setShowTestModal(true);
      }
    } catch (err) {
      console.error('Failed to test rule:', err);
    }
  };

  const getRuleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      auto_disable_bidder: 'Auto-Disable Bidder',
      auto_adjust_timeout: 'Auto-Adjust Timeout',
      auto_adjust_floor: 'Auto-Adjust Floor Price',
      auto_enable_bidder: 'Auto-Enable Bidder',
      alert_notification: 'Alert & Notification',
      traffic_allocation: 'Traffic Allocation',
    };
    return labels[type] || type;
  };

  const getRuleTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      auto_disable_bidder: 'bg-red-100 text-red-800',
      auto_adjust_timeout: 'bg-blue-100 text-blue-800',
      auto_adjust_floor: 'bg-green-100 text-green-800',
      auto_enable_bidder: 'bg-purple-100 text-purple-800',
      alert_notification: 'bg-yellow-100 text-yellow-800',
      traffic_allocation: 'bg-indigo-100 text-indigo-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getResultBadge = (result: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      success: { bg: 'bg-green-100', text: 'text-green-800' },
      failure: { bg: 'bg-red-100', text: 'text-red-800' },
      skipped: { bg: 'bg-gray-100', text: 'text-gray-800' },
    };
    const badge = badges[result] || badges.skipped;
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
        {result}
      </span>
    );
  };

  const formatCondition = (condition: Condition) => {
    const metricLabels: Record<string, string> = {
      timeout_rate: 'Timeout Rate',
      response_rate: 'Response Rate',
      avg_latency: 'Avg Latency',
      revenue: 'Revenue',
      win_rate: 'Win Rate',
      fill_rate: 'Fill Rate',
    };

    const metricLabel = metricLabels[condition.metric] || condition.metric;
    const target = condition.target ? ` for ${condition.target}` : '';

    return `${metricLabel}${target} ${condition.operator} ${condition.value} (${condition.timeWindow})`;
  };

  const formatAction = (action: Action) => {
    const actionLabels: Record<string, string> = {
      disable_bidder: 'Disable Bidder',
      enable_bidder: 'Enable Bidder',
      adjust_timeout: 'Adjust Timeout',
      adjust_floor: 'Adjust Floor Price',
      send_alert: 'Send Alert',
      adjust_traffic: 'Adjust Traffic',
    };

    const actionLabel = actionLabels[action.type] || action.type;
    const target = action.target ? ` (${action.target})` : '';
    const value = action.value !== undefined ? `: ${action.value}` : '';

    return `${actionLabel}${target}${value}`;
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
          <h1 className="text-2xl font-bold text-gray-900">Optimization Rules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Automate your configuration with intelligent rules that optimize performance 24/7
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRule(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Rule
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
            <h3 className="text-sm font-medium text-blue-800">Intelligent Automation</h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>Rules monitor your metrics and automatically take action when conditions are met.</p>
              <p className="mt-1">
                Examples: Disable bidders with high timeout rates, adjust timeouts based on performance, send alerts when revenue drops.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Rules</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{rules.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Rules</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {rules.filter(r => r.enabled).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Executions</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {rules.reduce((sum, r) => sum + r.executionCount, 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {executions.length > 0
                  ? Math.round((executions.filter(e => e.result === 'success').length / executions.length) * 100)
                  : 0}%
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Rules</h3>
        </div>

        {rules.length === 0 ? (
          <div className="p-12 text-center">
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No rules yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Get started by creating your first optimization rule
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Rule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={handleToggleRule}
                onEdit={(rule) => {
                  setEditingRule(rule);
                  setShowCreateModal(true);
                }}
                onDelete={handleDeleteRule}
                onTest={handleTestRule}
                formatCondition={formatCondition}
                formatAction={formatAction}
                getRuleTypeLabel={getRuleTypeLabel}
                getRuleTypeColor={getRuleTypeColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Executions */}
      {executions.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Executions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {executions.slice(0, 10).map((execution) => (
                  <tr key={execution.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(execution.executedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{execution.ruleName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRuleTypeColor(execution.ruleType)}`}>
                        {getRuleTypeLabel(execution.ruleType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {execution.actionsPerformed.length} action(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getResultBadge(execution.result)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Test Result Modal */}
      <RuleTestModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        testResult={testResult}
        formatCondition={formatCondition}
        formatAction={formatAction}
      />

      {/* Create/Edit Modal */}
      <RuleModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingRule(null);
        }}
        onSuccess={() => {
          fetchRules();
          setShowCreateModal(false);
          setEditingRule(null);
        }}
        publisherId={publisherId || ''}
        editingRule={editingRule}
      />
    </div>
  );
}
