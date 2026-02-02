/**
 * Type-safe property access helpers
 *
 * These utilities provide safer alternatives to `as any` type assertions
 * by offering runtime validation and proper TypeScript typing.
 */

/**
 * Type-safe property access
 *
 * @example
 * const value = getProperty(obj, 'name'); // Properly typed
 */
export function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

/**
 * Safe type assertion with validation
 *
 * @example
 * const user = assertType(data, isUser);
 */
export function assertType<T>(value: unknown, validator: (v: unknown) => v is T): T {
  if (!validator(value)) {
    throw new TypeError('Type assertion failed');
  }
  return value;
}

/**
 * Type guard for objects with specific properties
 *
 * @example
 * if (hasProperty(obj, 'deletedAt')) {
 *   console.log(obj.deletedAt); // Safe access
 * }
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

/**
 * Type guard for checking if a value has specific properties
 *
 * @example
 * if (hasProperties(obj, ['id', 'name'])) {
 *   console.log(obj.id, obj.name); // Safe access
 * }
 */
export function hasProperties<K extends string>(
  obj: unknown,
  keys: K[]
): obj is Record<K, unknown> {
  if (typeof obj !== 'object' || obj === null) return false;
  return keys.every(key => key in obj);
}

/**
 * Safe partial update type for database operations
 * Allows undefined values for optional fields while maintaining type safety
 */
export type PartialUpdate<T> = {
  [P in keyof T]?: T[P] | null;
};

/**
 * Type guard for soft-delete fields
 */
export interface SoftDeletable {
  deletedAt?: string | null;
}

/**
 * Check if an object has a deletedAt property (for soft deletes)
 */
export function isSoftDeletable(obj: unknown): obj is SoftDeletable {
  return hasProperty(obj, 'deletedAt');
}

/**
 * Filter out soft-deleted records
 */
export function filterActive<T extends SoftDeletable>(records: T[]): T[] {
  return records.filter(record => !record.deletedAt);
}

/**
 * Filter only soft-deleted records
 */
export function filterDeleted<T extends SoftDeletable>(records: T[]): T[] {
  return records.filter(record => record.deletedAt != null);
}

/**
 * Safe JSON parse with type validation
 */
export function safeJsonParse<T>(
  value: string | null | undefined,
  validator: (v: unknown) => v is T,
  defaultValue: T
): T {
  if (!value) return defaultValue;

  try {
    const parsed = JSON.parse(value);
    if (validator(parsed)) {
      return parsed;
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Extract error message safely from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

/**
 * Type guard for Error objects
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard for objects with message property
 */
export function hasMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}
