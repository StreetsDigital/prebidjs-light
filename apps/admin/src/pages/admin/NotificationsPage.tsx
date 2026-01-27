import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

interface NotificationChannel {
  id: string;
  publisherId: string;
  name: string;
  type: 'email' | 'slack' | 'discord' | 'teams' | 'sms' | 'webhook' | 'pagerduty';
  config: any;
  enabled: boolean;
  verified: boolean;
  lastTestAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NotificationRule {
  id: string;
  publisherId: string;
  name: string;
  description: string | null;
  eventType: string;
  conditions: any;
  channels: string[];
  severity: 'info' | 'warning' | 'critical';
  cooldownMinutes: number;
  enabled: boolean;
  escalationPolicyId: string | null;
  lastTriggered: string | null;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Notification {
  id: string;
  publisherId: string;
  ruleId: string | null;
  channelId: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data: any;
  status: 'pending' | 'sent' | 'failed' | 'acknowledged';
  errorMessage: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface EscalationPolicy {
  id: string;
  publisherId: string;
  name: string;
  description: string | null;
  levels: Array<{ delayMinutes: number; channels: string[] }>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'channels' | 'rules' | 'history' | 'escalation' | 'stats';

export function NotificationsPage() {
  const { publisherId } = useParams<{ publisherId: string }>();
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<TabType>('channels');

  // State
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [policies, setPolicies] = useState<EscalationPolicy[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<EscalationPolicy | null>(null);

  useEffect(() => {
    if (activeTab === 'channels') fetchChannels();
    if (activeTab === 'rules') fetchRules();
    if (activeTab === 'history') fetchNotifications();
    if (activeTab === 'escalation') fetchPolicies();
    if (activeTab === 'stats') fetchStats();
  }, [activeTab, publisherId]);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/notification-channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setChannels(data.channels || []);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/notification-rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/escalation-policies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPolicies(data.policies || []);
    } catch (error) {
      console.error('Failed to fetch policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/publishers/${publisherId}/notification-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const testChannel = async (channel: NotificationChannel) => {
    try {
      const response = await fetch(`/api/publishers/${publisherId}/notification-channels/${channel.id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      alert(data.success ? data.message : `Test failed: ${data.message}`);
      fetchChannels();
    } catch (error) {
      alert('Test failed');
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!confirm('Delete this channel?')) return;
    try {
      await fetch(`/api/publishers/${publisherId}/notification-channels/${channelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchChannels();
    } catch (error) {
      alert('Delete failed');
    }
  };

  const toggleRule = async (rule: NotificationRule) => {
    try {
      await fetch(`/api/publishers/${publisherId}/notification-rules/${rule.id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRules();
    } catch (error) {
      alert('Toggle failed');
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await fetch(`/api/publishers/${publisherId}/notification-rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRules();
    } catch (error) {
      alert('Delete failed');
    }
  };

  const acknowledgeNotification = async (notification: Notification) => {
    try {
      await fetch(`/api/publishers/${publisherId}/notifications/${notification.id}/acknowledge`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ acknowledgedBy: 'admin' }),
      });
      fetchNotifications();
    } catch (error) {
      alert('Acknowledge failed');
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email':
        return '📧';
      case 'slack':
        return '💬';
      case 'discord':
        return '🎮';
      case 'teams':
        return '👥';
      case 'sms':
        return '📱';
      case 'webhook':
        return '🔗';
      case 'pagerduty':
        return '🚨';
      default:
        return '📢';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'acknowledged':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification System</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure alerts, manage channels, and track notifications
          </p>
        </div>
        <Link
          to={`/admin/publishers/${publisherId}`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          ← Back to Publisher
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'channels' as TabType, label: 'Channels', icon: '📢' },
            { id: 'rules' as TabType, label: 'Alert Rules', icon: '⚠️' },
            { id: 'history' as TabType, label: 'History', icon: '📊' },
            { id: 'escalation' as TabType, label: 'Escalation', icon: '🔺' },
            { id: 'stats' as TabType, label: 'Statistics', icon: '📈' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            {/* CHANNELS TAB */}
            {activeTab === 'channels' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Notification Channels</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure where to send alerts - email, Slack, SMS, and more
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingChannel(null);
                      setShowChannelModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    + Add Channel
                  </button>
                </div>

                {channels.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">No channels configured</p>
                    <p className="mt-1">Add your first notification channel to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {channels.map((channel) => (
                      <div
                        key={channel.id}
                        className={`border-2 rounded-lg p-4 ${
                          channel.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{getChannelIcon(channel.type)}</span>
                            <div>
                              <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                              <p className="text-xs text-gray-500 capitalize">{channel.type}</p>
                            </div>
                          </div>
                          {channel.verified && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              ✓ Verified
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 mb-4 text-sm">
                          {channel.type === 'email' && (
                            <p className="text-gray-600">
                              📧 {channel.config.emails?.length || 0} recipient(s)
                            </p>
                          )}
                          {channel.type === 'sms' && (
                            <p className="text-gray-600">
                              📱 {channel.config.phoneNumbers?.length || 0} number(s)
                            </p>
                          )}
                          {(channel.type === 'slack' || channel.type === 'discord' || channel.type === 'teams') && (
                            <p className="text-gray-600">🔗 Webhook configured</p>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => testChannel(channel)}
                            className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                          >
                            Test
                          </button>
                          <button
                            onClick={() => {
                              setEditingChannel(channel);
                              setShowChannelModal(true);
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteChannel(channel.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-100 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* RULES TAB */}
            {activeTab === 'rules' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Alert Rules</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Define when and how to send notifications
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingRule(null);
                      setShowRuleModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    + Create Rule
                  </button>
                </div>

                {rules.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">No alert rules configured</p>
                    <p className="mt-1">Create your first rule to start receiving notifications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className={`border-l-4 ${
                          rule.severity === 'critical'
                            ? 'border-red-500'
                            : rule.severity === 'warning'
                            ? 'border-yellow-500'
                            : 'border-blue-500'
                        } bg-white shadow rounded-lg p-6`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(rule.severity)}`}>
                                {rule.severity.toUpperCase()}
                              </span>
                              {rule.enabled ? (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Disabled
                                </span>
                              )}
                            </div>
                            {rule.description && (
                              <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                            )}
                            <div className="space-y-2 text-sm">
                              <p className="text-gray-600">
                                <span className="font-medium">Event:</span> {rule.eventType.replace(/_/g, ' ')}
                              </p>
                              <p className="text-gray-600">
                                <span className="font-medium">Condition:</span>{' '}
                                {rule.conditions.comparison} {rule.conditions.threshold} (over {rule.conditions.timeWindow})
                              </p>
                              <p className="text-gray-600">
                                <span className="font-medium">Channels:</span> {rule.channels.length} configured
                              </p>
                              <p className="text-gray-600">
                                <span className="font-medium">Cooldown:</span> {rule.cooldownMinutes} minutes
                              </p>
                              {rule.triggerCount > 0 && (
                                <p className="text-gray-600">
                                  <span className="font-medium">Triggered:</span> {rule.triggerCount} time(s)
                                  {rule.lastTriggered && ` (last: ${new Date(rule.lastTriggered).toLocaleString()})`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => toggleRule(rule)}
                              className={`px-3 py-1.5 text-xs font-medium rounded ${
                                rule.enabled
                                  ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200'
                                  : 'text-green-600 bg-green-100 hover:bg-green-200'
                              }`}
                            >
                              {rule.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingRule(rule);
                                setShowRuleModal(true);
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteRule(rule.id)}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-100 rounded hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Notification History</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Track all sent notifications and their status
                  </p>
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">No notifications yet</p>
                    <p className="mt-1">Notifications will appear here when your rules trigger</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(notification.severity)}`}>
                                {notification.severity}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(notification.status)}`}>
                                {notification.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(notification.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">{notification.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                            {notification.errorMessage && (
                              <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                Error: {notification.errorMessage}
                              </p>
                            )}
                          </div>
                          {notification.status === 'sent' && !notification.acknowledgedBy && (
                            <button
                              onClick={() => acknowledgeNotification(notification)}
                              className="ml-4 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                            >
                              Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ESCALATION TAB */}
            {activeTab === 'escalation' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Escalation Policies</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Define escalation paths for critical alerts
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPolicy(null);
                      setShowPolicyModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    + Create Policy
                  </button>
                </div>

                {policies.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">No escalation policies</p>
                    <p className="mt-1">Create policies to automatically escalate critical alerts</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {policies.map((policy) => (
                      <div key={policy.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{policy.name}</h3>
                            {policy.description && (
                              <p className="text-sm text-gray-600 mt-1">{policy.description}</p>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            policy.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {policy.enabled ? 'Active' : 'Disabled'}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">Escalation Levels:</h4>
                          {policy.levels.map((level, idx) => (
                            <div key={idx} className="flex items-center space-x-4 text-sm">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="font-semibold text-blue-600">{idx + 1}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-gray-900">
                                  After <span className="font-medium">{level.delayMinutes} minutes</span>
                                </p>
                                <p className="text-gray-600">
                                  Notify {level.channels.length} channel(s)
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STATS TAB */}
            {activeTab === 'stats' && stats && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Notification Statistics</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Overview of notifications sent in the last 30 days
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-sm text-blue-800 mt-1">Total Notifications</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-green-600">{stats.byStatus.sent}</div>
                    <div className="text-sm text-green-800 mt-1">Successfully Sent</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-red-600">{stats.byStatus.failed}</div>
                    <div className="text-sm text-red-800 mt-1">Failed</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-purple-600">{stats.byStatus.acknowledged}</div>
                    <div className="text-sm text-purple-800 mt-1">Acknowledged</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="font-medium text-gray-900 mb-4">By Severity</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Info</span>
                        <span className="font-semibold text-blue-600">{stats.bySeverity.info}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Warning</span>
                        <span className="font-semibold text-yellow-600">{stats.bySeverity.warning}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Critical</span>
                        <span className="font-semibold text-red-600">{stats.bySeverity.critical}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="font-medium text-gray-900 mb-4">By Event Type</h3>
                    <div className="space-y-2">
                      {Object.entries(stats.byEventType).map(([eventType, count]) => (
                        <div key={eventType} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{eventType.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-gray-900">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Channel Modal - Placeholder */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingChannel ? 'Edit Channel' : 'Add Channel'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Channel configuration UI would go here
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowChannelModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowChannelModal(false)}
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
