import { useAuthStore } from '../stores/authStore';

export function ImpersonationBanner() {
  const { isImpersonating, user, originalUser, stopImpersonation, isLoading } = useAuthStore();

  if (!isImpersonating || !user || !originalUser) {
    return null;
  }

  const handleStopImpersonation = async () => {
    const success = await stopImpersonation();
    if (success) {
      // Optionally redirect to admin dashboard
      window.location.href = '/admin/users';
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      super_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      publisher: 'bg-green-100 text-green-800',
    };
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      publisher: 'Publisher',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  return (
    <div className="bg-yellow-50 border-b-2 border-yellow-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-yellow-800">
                Viewing as:
              </span>
              <span className="text-sm font-semibold text-yellow-900">
                {user.name}
              </span>
              <span className="text-sm text-yellow-700">({user.email})</span>
              {getRoleBadge(user.role)}
            </div>
          </div>
          <button
            type="button"
            onClick={handleStopImpersonation}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-700"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Stopping...
              </>
            ) : (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                  />
                </svg>
                Stop Impersonation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
