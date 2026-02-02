/**
 * API Client Utility
 *
 * Provides centralized API request handling with:
 * - Request cancellation support
 * - AbortController management
 * - Centralized base URL configuration
 * - Type-safe request methods
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class ApiClient {
  private abortControllers = new Map<string, AbortController>();

  /**
   * Make an API request with optional cancellation support
   *
   * @param endpoint - API endpoint (e.g., '/api/users')
   * @param options - Fetch options
   * @param cancelKey - Optional key for request cancellation. If provided, any previous request with the same key will be cancelled
   * @returns Promise with parsed JSON response
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    cancelKey?: string
  ): Promise<T> {
    // Cancel previous request with same key
    if (cancelKey) {
      this.cancel(cancelKey);
      const controller = new AbortController();
      this.abortControllers.set(cancelKey, controller);
      options.signal = controller.signal;
    }

    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, options);

      // Clean up abort controller after successful request
      if (cancelKey) {
        this.abortControllers.delete(cancelKey);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      // Clean up abort controller on error
      if (cancelKey) {
        this.abortControllers.delete(cancelKey);
      }

      // Re-throw unless it's an abort error
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, don't treat as error
        throw error;
      }

      throw error;
    }
  }

  /**
   * Cancel a specific request by key
   *
   * @param key - The cancellation key used when making the request
   */
  cancel(key: string): void {
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  /**
   * Get the configured API base URL
   */
  getBaseUrl(): string {
    return API_BASE_URL;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export base URL for direct use
export { API_BASE_URL };
