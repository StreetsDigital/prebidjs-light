import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoadingState } from '../useLoadingState';

describe('useLoadingState', () => {
  it('should initialize with loading false', () => {
    const { result } = renderHook(() => useLoadingState());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should initialize with custom initial state', () => {
    const { result } = renderHook(() => useLoadingState(true));

    expect(result.current.isLoading).toBe(true);
  });

  it('should set loading during async operation', async () => {
    const { result } = renderHook(() => useLoadingState());

    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    let loadingDuringExecution = false;

    act(() => {
      result.current.withLoading(async () => {
        loadingDuringExecution = result.current.isLoading;
        await promise;
        return 'success';
      });
    });

    // Should be loading during execution
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise!();
      await promise;
    });

    // Should not be loading after completion
    expect(result.current.isLoading).toBe(false);
  });

  it('should return result from async operation', async () => {
    const { result } = renderHook(() => useLoadingState());

    let returnedValue: string | null = null;

    await act(async () => {
      returnedValue = await result.current.withLoading(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      });
    });

    expect(returnedValue).toBe('success');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should capture errors from async operation', async () => {
    const { result } = renderHook(() => useLoadingState());

    await act(async () => {
      await result.current.withLoading(async () => {
        throw new Error('Test error');
      });
    });

    expect(result.current.error).toBe('Test error');
    expect(result.current.isLoading).toBe(false);
  });

  it('should return null when error occurs', async () => {
    const { result } = renderHook(() => useLoadingState());

    let returnedValue: any = 'not-null';

    await act(async () => {
      returnedValue = await result.current.withLoading(async () => {
        throw new Error('Test error');
      });
    });

    expect(returnedValue).toBeNull();
  });

  it('should handle non-Error exceptions', async () => {
    const { result } = renderHook(() => useLoadingState());

    await act(async () => {
      await result.current.withLoading(async () => {
        throw 'string error';
      });
    });

    expect(result.current.error).toBe('An error occurred');
  });

  it('should clear previous error on new operation', async () => {
    const { result } = renderHook(() => useLoadingState());

    // First operation throws error
    await act(async () => {
      await result.current.withLoading(async () => {
        throw new Error('First error');
      });
    });

    expect(result.current.error).toBe('First error');

    // Second operation succeeds
    await act(async () => {
      await result.current.withLoading(async () => {
        return 'success';
      });
    });

    expect(result.current.error).toBeNull();
  });

  it('should allow manual error setting', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setError('Manual error');
    });

    expect(result.current.error).toBe('Manual error');
  });

  it('should handle multiple sequential operations', async () => {
    const { result } = renderHook(() => useLoadingState());

    await act(async () => {
      await result.current.withLoading(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'first';
      });
    });

    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.withLoading(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'second';
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should maintain loading state through errors', async () => {
    const { result } = renderHook(() => useLoadingState());

    await act(async () => {
      await result.current.withLoading(async () => {
        throw new Error('Test error');
      });
    });

    // Loading should be false even after error
    expect(result.current.isLoading).toBe(false);
  });
});
