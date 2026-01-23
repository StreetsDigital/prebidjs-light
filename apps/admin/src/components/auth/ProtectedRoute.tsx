import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center">
        <svg
          className="animate-spin h-10 w-10 text-blue-600"
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
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, isHydrated, token, checkAuth, logout } = useAuthStore();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      if (!isHydrated) return;

      if (!token || !isAuthenticated) {
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      // Verify the token is still valid with the backend
      const valid = await checkAuth();
      if (!valid) {
        // Token is invalid or expired, log out
        logout();
      }
      setIsValid(valid);
      setIsValidating(false);
    };

    validateSession();
  }, [isHydrated, token, isAuthenticated, checkAuth, logout]);

  // Wait for zustand to rehydrate from localStorage
  if (!isHydrated || isValidating) {
    return <LoadingSpinner />;
  }

  // If not authenticated or session invalid, redirect to login
  if (!isAuthenticated || !isValid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified, check if user has the required role
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'publisher') {
      return <Navigate to="/publisher/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isHydrated } = useAuthStore();
  const location = useLocation();

  // Wait for zustand to rehydrate from localStorage
  if (!isHydrated) {
    return <LoadingSpinner />;
  }

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    // Get the intended destination from location state
    const from = (location.state as { from?: Location })?.from?.pathname;

    // Redirect based on role
    if (user?.role === 'publisher') {
      return <Navigate to={from || '/publisher/dashboard'} replace />;
    }
    return <Navigate to={from || '/admin/dashboard'} replace />;
  }

  return <>{children}</>;
}
