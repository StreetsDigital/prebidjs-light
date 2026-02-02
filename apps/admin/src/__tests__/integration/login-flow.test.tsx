import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from '../../stores/authStore';
import { act } from '@testing-library/react';

// Mock login component
function LoginForm() {
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    await login(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          required
        />
      </div>
      {error && <div role="alert">{error}</div>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

describe('Login Flow Integration', () => {
  beforeEach(() => {
    // Reset store
    act(() => {
      useAuthStore.getState().logout();
    });
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should complete full login flow successfully', async () => {
    const user = userEvent.setup();

    const mockUser = {
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin' as const,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: mockUser,
        token: 'jwt-token-123',
      }),
    });

    render(<LoginForm />);

    // Fill in email
    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'admin@example.com');

    // Fill in password
    const passwordInput = screen.getByLabelText('Password');
    await user.type(passwordInput, 'password123');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /login/i });
    await user.click(submitButton);

    // Wait for successful login
    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('jwt-token-123');
    });
  });

  it('should show error message on login failure', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        message: 'Invalid credentials',
      }),
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'wrong@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('should disable submit button during login', async () => {
    const user = userEvent.setup();

    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });

    global.fetch = vi.fn().mockReturnValue(loginPromise);

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password');

    const submitButton = screen.getByRole('button', { name: /login/i });
    await user.click(submitButton);

    // Button should be disabled during login
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // Resolve login
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

    // Button should be enabled again
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should send correct credentials to API', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'admin' },
        token: 'token',
      }),
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'mypassword123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'mypassword123',
          }),
        })
      );
    });
  });

  it('should handle network errors gracefully', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });
});
