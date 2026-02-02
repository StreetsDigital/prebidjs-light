/**
 * Browser Compatibility Checking Utility
 *
 * Checks for required browser APIs and displays warnings for unsupported browsers.
 */

export interface CompatibilityResult {
  isCompatible: boolean;
  issues: string[];
}

/**
 * Check if the browser supports all required APIs
 */
export function checkBrowserCompatibility(): CompatibilityResult {
  const issues: string[] = [];

  // Check for required APIs
  if (!window.fetch) {
    issues.push('Fetch API not supported');
  }

  if (!window.AbortController) {
    issues.push('AbortController not supported');
  }

  if (!window.EventSource) {
    issues.push('Server-Sent Events (EventSource) not supported');
  }

  if (!window.localStorage) {
    issues.push('LocalStorage not supported');
  }

  // Check for Promise support (required for modern async operations)
  if (!window.Promise) {
    issues.push('Promise not supported');
  }

  // Check for basic ES6+ features
  try {
    // Arrow functions
    const arrowTest = () => true;
    // const/let
    const constTest = 1;
    // Template literals
    const templateTest = `test`;
  } catch (e) {
    issues.push('ES6+ features not fully supported');
  }

  return {
    isCompatible: issues.length === 0,
    issues,
  };
}

/**
 * Show a compatibility warning banner if browser is incompatible
 * Returns true if browser is compatible, false otherwise
 */
export function showCompatibilityWarning(): boolean {
  const { isCompatible, issues } = checkBrowserCompatibility();

  if (!isCompatible) {
    console.warn('Browser compatibility issues detected:', issues);

    // Create warning banner
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background-color: #FEF3C7;
      border-bottom: 2px solid #F59E0B;
      color: #92400E;
      padding: 12px 16px;
      text-align: center;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

    banner.innerHTML = `
      <strong>Browser Compatibility Warning:</strong>
      Your browser may not support all features.
      Please update to the latest version of Chrome, Firefox, Safari, or Edge for the best experience.
      <button
        onclick="this.parentElement.remove()"
        style="margin-left: 16px; padding: 4px 12px; background: #92400E; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
      >
        Dismiss
      </button>
    `;

    // Add banner to page
    if (document.body) {
      document.body.insertBefore(banner, document.body.firstChild);
    } else {
      // If body doesn't exist yet, wait for it
      document.addEventListener('DOMContentLoaded', () => {
        document.body.insertBefore(banner, document.body.firstChild);
      });
    }
  }

  return isCompatible;
}

/**
 * Get a user-friendly message for browser compatibility issues
 */
export function getCompatibilityMessage(result: CompatibilityResult): string {
  if (result.isCompatible) {
    return 'Your browser is fully compatible.';
  }

  const issueList = result.issues.map(issue => `• ${issue}`).join('\n');
  return `Your browser has the following compatibility issues:\n\n${issueList}\n\nPlease update your browser for the best experience.`;
}

/**
 * Check if a specific API is available
 */
export function hasAPI(apiName: 'fetch' | 'EventSource' | 'localStorage' | 'AbortController' | 'Promise'): boolean {
  switch (apiName) {
    case 'fetch':
      return typeof window.fetch === 'function';
    case 'EventSource':
      return typeof window.EventSource === 'function';
    case 'localStorage':
      return typeof window.localStorage === 'object';
    case 'AbortController':
      return typeof window.AbortController === 'function';
    case 'Promise':
      return typeof window.Promise === 'function';
    default:
      return false;
  }
}
