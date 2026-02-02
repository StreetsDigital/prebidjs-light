/**
 * Safe JSON parsing utilities
 *
 * Provides safe wrappers around JSON.parse to prevent crashes from malformed JSON.
 * Always returns a fallback value instead of throwing errors.
 */

/**
 * Safely parse JSON with fallback value
 * @param jsonString - String to parse
 * @param defaultValue - Value to return if parsing fails
 * @returns Parsed value or default
 */
export function safeJsonParse<T = any>(
  jsonString: string | null | undefined,
  defaultValue: T = null as T
): T {
  if (!jsonString) {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('JSON parse error:', error, 'Input:', jsonString?.substring(0, 100));
    return defaultValue;
  }
}

/**
 * Safely parse JSON array
 * @param jsonString - String to parse
 * @param defaultValue - Array to return if parsing fails (defaults to empty array)
 * @returns Parsed array or default
 */
export function safeJsonParseArray<T = any>(
  jsonString: string | null | undefined,
  defaultValue: T[] = []
): T[] {
  return safeJsonParse<T[]>(jsonString, defaultValue);
}

/**
 * Safely parse JSON object
 * @param jsonString - String to parse
 * @param defaultValue - Object to return if parsing fails (defaults to empty object)
 * @returns Parsed object or default
 */
export function safeJsonParseObject<T extends object = any>(
  jsonString: string | null | undefined,
  defaultValue: T = {} as T
): T {
  return safeJsonParse<T>(jsonString, defaultValue);
}
