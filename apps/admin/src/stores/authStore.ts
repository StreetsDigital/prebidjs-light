import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'super_admin' | 'admin' | 'publisher';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  publisherId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  // Impersonation state
  isImpersonating: boolean;
  originalUser: User | null;
  impersonationSessionId: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearError: () => void;
  setHydrated: () => void;
  impersonateUser: (userId: string) => Promise<boolean>;
  stopImpersonation: () => Promise<boolean>;
}

const API_URL = import.meta.env.VITE_API_URL || '';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
      error: null,
      // Impersonation state
      isImpersonating: false,
      originalUser: null,
      impersonationSessionId: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Login failed');
          }

          const data = await response.json();
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
            isAuthenticated: false,
          });
          return false;
        }
      },

      logout: () => {
        // Call logout endpoint
        const { token } = get();
        fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).catch(() => {
          // Ignore errors during logout
        });

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false });
          return false;
        }

        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
          });

          if (!response.ok) {
            set({ user: null, token: null, isAuthenticated: false });
            return false;
          }

          const data = await response.json();
          set({ user: data.user, isAuthenticated: true });
          return true;
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
          return false;
        }
      },

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      clearError: () => set({ error: null }),
      setHydrated: () => set({ isHydrated: true }),

      impersonateUser: async (userId: string) => {
        set({ isLoading: true, error: null });
        const { token: currentToken, user: currentUser } = get();

        try {
          const response = await fetch(`${API_URL}/api/auth/impersonate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${currentToken}`,
            },
            credentials: 'include',
            body: JSON.stringify({ userId }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Impersonation failed');
          }

          const data = await response.json();
          set({
            user: data.user,
            token: data.token,
            isImpersonating: true,
            originalUser: currentUser,
            impersonationSessionId: data.impersonation.sessionId,
            isLoading: false,
          });
          return true;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Impersonation failed',
          });
          return false;
        }
      },

      stopImpersonation: async () => {
        set({ isLoading: true, error: null });
        const { token } = get();

        try {
          const response = await fetch(`${API_URL}/api/auth/stop-impersonation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to stop impersonation');
          }

          const data = await response.json();
          set({
            user: data.user,
            token: data.token,
            isImpersonating: false,
            originalUser: null,
            impersonationSessionId: null,
            isLoading: false,
          });
          return true;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to stop impersonation',
          });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isImpersonating: state.isImpersonating,
        originalUser: state.originalUser,
        impersonationSessionId: state.impersonationSessionId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
