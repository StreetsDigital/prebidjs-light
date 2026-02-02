import { Link } from 'react-router-dom';

/**
 * Props for the NotificationsTab component
 */
interface NotificationsTabProps {
  /** Publisher object containing id and other details */
  publisher: {
    id: string;
    name: string;
  };
}

/**
 * NotificationsTab Component
 *
 * Displays the Alerts & Notifications tab content for a publisher.
 * Shows information about the notification system, alert types, and channels.
 * Provides a link to manage notifications for the publisher.
 *
 * @param props - Component props
 * @returns The notifications tab UI
 */
export function NotificationsTab({ publisher }: NotificationsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Notification System</h2>
            <p className="text-sm text-gray-500 mt-1">
              Get alerts for revenue drops, errors, timeouts, and custom events via email, Slack, SMS, and more
            </p>
          </div>
          <Link
            to={`/admin/publishers/${publisher.id}/notifications`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Manage Notifications
          </Link>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-purple-800">Stay Informed, Stay in Control</h3>
              <div className="mt-1 text-sm text-purple-700">
                <p>Set up automated alerts to catch problems before they impact revenue. Get notified instantly via your preferred channels.</p>
                <p className="mt-1">
                  Support for email, Slack, Discord, Microsoft Teams, SMS, webhooks, and PagerDuty integration.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="font-semibold text-gray-900">Smart Alerts</h3>
            </div>
            <p className="text-sm text-gray-600">
              Set up intelligent alerts based on revenue, fill rate, timeout rate, errors, and more.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <h3 className="font-semibold text-gray-900">Multiple Channels</h3>
            </div>
            <p className="text-sm text-gray-600">
              Email, Slack, Discord, Teams, SMS, webhooks, and PagerDuty - choose how you want to be notified.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="font-semibold text-gray-900">Escalation Policies</h3>
            </div>
            <p className="text-sm text-gray-600">
              Define escalation paths for critical alerts - ensure the right people are notified at the right time.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="font-medium text-gray-900 mb-4">Alert Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">Revenue Drop</div>
              <div className="text-xs text-gray-600 mt-1">When revenue drops</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">Fill Rate</div>
              <div className="text-xs text-gray-600 mt-1">Low fill rate alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">Timeouts</div>
              <div className="text-xs text-gray-600 mt-1">Bidder timeout spikes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">Errors</div>
              <div className="text-xs text-gray-600 mt-1">Error rate increases</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
