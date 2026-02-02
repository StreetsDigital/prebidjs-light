import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { NotificationFilters } from '../../components/notifications/NotificationFilters';
import { NotificationChannelCard } from '../../components/notifications/NotificationChannelCard';
import { NotificationRuleCard } from '../../components/notifications/NotificationRuleCard';
import { NotificationCard } from '../../components/notifications/NotificationCard';
import { EscalationPolicyCard } from '../../components/notifications/EscalationPolicyCard';
import { NotificationStats } from '../../components/notifications/NotificationStats';
import { NotificationModal } from '../../components/notifications/NotificationModal';

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
      <NotificationFilters activeTab={activeTab} onTabChange={setActiveTab} />

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
                      <NotificationChannelCard
                        key={channel.id}
                        channel={channel}
                        onTest={() => testChannel(channel)}
                        onEdit={() => {
                          setEditingChannel(channel);
                          setShowChannelModal(true);
                        }}
                        onDelete={() => deleteChannel(channel.id)}
                      />
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
                      <NotificationRuleCard
                        key={rule.id}
                        rule={rule}
                        onToggle={() => toggleRule(rule)}
                        onEdit={() => {
                          setEditingRule(rule);
                          setShowRuleModal(true);
                        }}
                        onDelete={() => deleteRule(rule.id)}
                      />
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
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onAcknowledge={() => acknowledgeNotification(notification)}
                      />
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
                      <EscalationPolicyCard key={policy.id} policy={policy} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STATS TAB */}
            {activeTab === 'stats' && stats && (
              <div className="p-6">
                <NotificationStats stats={stats} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <NotificationModal
        isOpen={showChannelModal}
        title={editingChannel ? 'Edit Channel' : 'Add Channel'}
        onClose={() => setShowChannelModal(false)}
      />

      <NotificationModal
        isOpen={showRuleModal}
        title={editingRule ? 'Edit Rule' : 'Create Rule'}
        onClose={() => setShowRuleModal(false)}
      />

      <NotificationModal
        isOpen={showPolicyModal}
        title={editingPolicy ? 'Edit Policy' : 'Create Policy'}
        onClose={() => setShowPolicyModal(false)}
      />
    </div>
  );
}
