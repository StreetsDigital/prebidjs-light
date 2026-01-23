import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">pbjs_engine</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.name || user?.email}
              <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                {user?.role}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Admin Dashboard
          </h2>
          <p className="text-gray-600">
            Welcome to the pbjs_engine admin dashboard. This is where you can
            manage publishers, ad units, bidders, and more.
          </p>

          {/* Quick stats placeholder */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Total Publishers
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                0
              </dd>
            </div>
            <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Active Ad Units
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                0
              </dd>
            </div>
            <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Today's Impressions
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                0
              </dd>
            </div>
            <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Revenue (Today)
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                $0
              </dd>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
