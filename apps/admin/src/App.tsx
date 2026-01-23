import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NotFound } from './pages/NotFound';

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

      {/* Protected admin routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Placeholder for other admin routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Publisher portal routes (placeholder) */}
      <Route
        path="/publisher/*"
        element={
          <ProtectedRoute allowedRoles={['publisher']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* System routes - super_admin only */}
      <Route
        path="/system/*"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
