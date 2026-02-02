import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useAuthStore,
  useUser,
  useToken,
  useIsAuthenticated,
  useIsImpersonating,
} from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useAuthStore.getState().logout();
    });

    // Clear localStorage
    localStorage.clear();

    // Reset fetch mock
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should have default initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isImpersonating).toBe(false);
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin' as const,
      };

      const mockToken = 'mock-jwt-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: mockUser, token: mockToken }),
      });

      const { result } = renderHook(() => useAuthStore());

      let loginResult: boolean = false;
      await act(async () => {
        loginResult = await result.current.login('test@example.com', 'password123');
      });

      expect(loginResult).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle login failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Invalid credentials' }),
      });

      const { result } = renderHook(() => useAuthStore());

      let loginResult: boolean = true;
      await act(async () => {
        loginResult = await result.current.login('test@example.com', 'wrong-password');
      });

      expect(loginResult).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      global.fetch = vi.fn().mockReturnValue(loginPromise);

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('test@example.com', 'password');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveLogin!({
          ok: true,
          json: async () => ({
            user: { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' },
            token: 'token',
          }),
        });
        await loginPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should send correct request to login endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' },
          token: 'token',
        }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      );
    });
  });

  describe('Logout', () => {
    it('should clear user state on logout', async () => {
      const { result } = renderHook(() => useAuthStore());

      // First login
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' },
          token: 'token',
        }),
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should call logout endpoint', () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.logout();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/logout'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Check auth', () => {
    it('should validate existing token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin' as const,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      const { result } = renderHook(() => useAuthStore());

      // Set token first
      act(() => {
        result.current.setToken('existing-token');
      });

      let isValid: boolean = false;
      await act(async () => {
        isValid = await result.current.checkAuth();
      });

      expect(isValid).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should return false when token is invalid', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setToken('invalid-token');
      });

      let isValid: boolean = true;
      await act(async () => {
        isValid = await result.current.checkAuth();
      });

      expect(isValid).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return false when no token exists', async () => {
      const { result } = renderHook(() => useAuthStore());

      let isValid: boolean = true;
      await act(async () => {
        isValid = await result.current.checkAuth();
      });

      expect(isValid).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Impersonation', () => {
    it('should start impersonation successfully', async () => {
      const originalUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'super_admin' as const,
      };

      const targetUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'publisher' as const,
      };

      // Setup initial authenticated state
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setUser(originalUser);
        result.current.setToken('admin-token');
      });

      // Mock impersonation response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: targetUser,
          token: 'impersonation-token',
          impersonation: { sessionId: 'session-123' },
        }),
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.impersonateUser('user-1');
      });

      expect(success).toBe(true);
      expect(result.current.user).toEqual(targetUser);
      expect(result.current.token).toBe('impersonation-token');
      expect(result.current.isImpersonating).toBe(true);
      expect(result.current.originalUser).toEqual(originalUser);
      expect(result.current.impersonationSessionId).toBe('session-123');
    });

    it('should stop impersonation and restore original user', async () => {
      const originalUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'super_admin' as const,
      };

      const { result } = renderHook(() => useAuthStore());

      // Setup impersonation state
      act(() => {
        result.current.setUser({
          id: 'user-1',
          email: 'user@example.com',
          name: 'User',
          role: 'publisher',
        });
        result.current.setToken('impersonation-token');
        useAuthStore.setState({
          isImpersonating: true,
          originalUser,
          impersonationSessionId: 'session-123',
        });
      });

      // Mock stop impersonation response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: originalUser,
          token: 'admin-token',
        }),
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.stopImpersonation();
      });

      expect(success).toBe(true);
      expect(result.current.user).toEqual(originalUser);
      expect(result.current.token).toBe('admin-token');
      expect(result.current.isImpersonating).toBe(false);
      expect(result.current.originalUser).toBeNull();
      expect(result.current.impersonationSessionId).toBeNull();
    });

    it('should handle impersonation failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setToken('admin-token');
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.impersonateUser('user-1');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Unauthorized');
      expect(result.current.isImpersonating).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should clear error manually', async () => {
      const { result } = renderHook(() => useAuthStore());

      // Set an error via failed login
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Test error' }),
      });

      await act(async () => {
        await result.current.login('test@example.com', 'wrong');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Selector hooks', () => {
    it('should provide useUser selector', () => {
      const { result } = renderHook(() => useUser());

      expect(result.current).toBeNull();
    });

    it('should provide useToken selector', () => {
      const { result } = renderHook(() => useToken());

      expect(result.current).toBeNull();
    });

    it('should provide useIsAuthenticated selector', () => {
      const { result } = renderHook(() => useIsAuthenticated());

      expect(result.current).toBe(false);
    });

    it('should provide useIsImpersonating selector', () => {
      const { result } = renderHook(() => useIsImpersonating());

      expect(result.current).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should persist token and user to localStorage', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin' as const,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: mockUser, token: 'test-token' }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      const stored = localStorage.getItem('auth-storage');
      expect(stored).toBeTruthy();

      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.token).toBe('test-token');
        expect(parsed.state.user).toEqual(mockUser);
      }
    });
  });
});
