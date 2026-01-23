import { Routes, Route, Navigate } from 'react-router-dom';

// Placeholder components - will be implemented
const Login = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
        pbjs_engine
      </h1>
      <p className="text-center text-gray-600">Login page - Coming soon</p>
    </div>
  </div>
);

const Dashboard = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
    <p className="text-gray-600 mt-2">Welcome to pbjs_engine admin dashboard</p>
  </div>
);

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-gray-600 mt-2">Page not found</p>
    </div>
  </div>
);

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes - will add auth guard */}
      <Route path="/admin/dashboard" element={<Dashboard />} />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
