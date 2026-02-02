import { useState } from 'react';

/**
 * Custom hook for managing loading state and errors
 * @param {boolean} initialState - Initial loading state (default: false)
 * @returns {{isLoading: boolean, error: string | null, setError: Function, withLoading: Function}}
 * @property {boolean} isLoading - Current loading state
 * @property {string | null} error - Current error message or null
 * @property {Function} setError - Manually set error message
 * @property {Function} withLoading - Wrapper function that handles loading state for async operations
 * @example
 * const { isLoading, error, withLoading } = useLoadingState();
 * const handleSubmit = () => withLoading(async () => {
 *   await api.save(data);
 * });
 */
export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState<string | null>(null);

  const withLoading = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, setError, withLoading };
}
