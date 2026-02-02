import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
const ThrowError = ({ message }: { message?: string }) => {
  throw new Error(message || 'Test error');
};

// Suppress console.error for error boundary tests
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error UI when error is thrown', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should display custom error message', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="Custom error message" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should render reload button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('should reload page when reload button is clicked', async () => {
    const user = userEvent.setup();

    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock },
    });

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /reload page/i });
    await user.click(reloadButton);

    expect(reloadMock).toHaveBeenCalled();
  });

  it('should log error to console', () => {
    const consoleErrorMock = vi.fn();
    console.error = consoleErrorMock;

    render(
      <ErrorBoundary>
        <ThrowError message="Logged error" />
      </ErrorBoundary>
    );

    expect(consoleErrorMock).toHaveBeenCalled();
  });

  it('should catch errors from nested components', () => {
    const NestedComponent = () => (
      <div>
        <div>
          <ThrowError message="Nested error" />
        </div>
      </div>
    );

    render(
      <ErrorBoundary>
        <NestedComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Nested error')).toBeInTheDocument();
  });

  it('should display fallback when error message is not available', () => {
    const ThrowWithoutMessage = () => {
      throw { notAnError: true }; // Non-Error object
    };

    render(
      <ErrorBoundary>
        <ThrowWithoutMessage />
      </ErrorBoundary>
    );

    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });

  it('should apply correct styling to error container', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const container = screen.getByText('Something went wrong').closest('div');
    expect(container).toHaveClass('bg-white', 'p-8', 'rounded-lg', 'shadow-lg');
  });

  it('should render multiple children when no error', () => {
    render(
      <ErrorBoundary>
        <div>First child</div>
        <div>Second child</div>
        <div>Third child</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
    expect(screen.getByText('Third child')).toBeInTheDocument();
  });

  it('should catch error from first failing component', () => {
    render(
      <ErrorBoundary>
        <div>Safe component</div>
        <ThrowError message="First error" />
        <div>This will not render</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('First error')).toBeInTheDocument();
    expect(screen.queryByText('Safe component')).not.toBeInTheDocument();
    expect(screen.queryByText('This will not render')).not.toBeInTheDocument();
  });
});
