import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute';
import { AdminLayout, PublisherLayout } from './components/layout';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { ChatPage, DashboardPage, PublishersPage, PublisherDetailPage, PublisherCreatePage, UsersPage, ModulesPage, AnalyticsPage, AuditLogsPage, ProfilePage, SystemSettingsPage, ABTestsPage, ABTestAnalyticsPage, BidderHealthPage, OptimizationRulesPage, AuctionInspectorPage, RevenueForecastingPage, NotificationsPage, CustomReportsPage, YieldAdvisorPage } from './pages/admin';
import { PublisherDashboard, AdUnitsPage, BiddersPage, GetCodePage } from './pages/publisher';
import { NotFound } from './pages/NotFound';

// Placeholder components for routes that aren't implemented yet
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
    <p className="text-gray-600">This page is under construction.</p>
  </div>
);

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />

      {/* Protected admin routes with layout */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="publishers" element={<PublishersPage />} />
        <Route path="publishers/new" element={<PublisherCreatePage />} />
        <Route path="publishers/:id" element={<PublisherDetailPage />} />
        <Route path="publishers/:publisherId/ab-tests" element={<ABTestsPage />} />
        <Route path="publishers/:publisherId/ab-tests/:testId/analytics" element={<ABTestAnalyticsPage />} />
        <Route path="publishers/:publisherId/bidder-health" element={<BidderHealthPage />} />
        <Route path="publishers/:publisherId/optimization-rules" element={<OptimizationRulesPage />} />
        <Route path="publishers/:publisherId/auction-inspector" element={<AuctionInspectorPage />} />
        <Route path="publishers/:publisherId/revenue-forecasting" element={<RevenueForecastingPage />} />
        <Route path="publishers/:publisherId/notifications" element={<NotificationsPage />} />
        <Route path="publishers/:publisherId/custom-reports" element={<CustomReportsPage />} />
        <Route path="publishers/:publisherId/yield-advisor" element={<YieldAdvisorPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
      </Route>

      {/* System routes - super_admin only with layout */}
      <Route
        path="/system"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="settings" replace />} />
        <Route path="settings" element={<SystemSettingsPage />} />
        <Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
      </Route>

      {/* Publisher portal routes with layout */}
      <Route
        path="/publisher"
        element={
          <ProtectedRoute allowedRoles={['publisher']}>
            <PublisherLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PublisherDashboard />} />
        <Route path="ad-units" element={<AdUnitsPage />} />
        <Route path="bidders" element={<BiddersPage />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="get-code" element={<GetCodePage />} />
        <Route path="analytics" element={<PlaceholderPage title="Analytics" />} />
        <Route path="support" element={<PlaceholderPage title="Support" />} />
        <Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
