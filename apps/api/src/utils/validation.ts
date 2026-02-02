/**
 * Input validation utilities for API routes
 */

/**
 * Validate UUID format (v4)
 * @param {string} value - String to validate
 * @returns {boolean} True if value is a valid UUIDv4
 * @example
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000') // true
 * isValidUUID('invalid-uuid') // false
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validate UUID or throw error
 * @param {string} value - String to validate
 * @param {string} paramName - Name of parameter for error message (default: 'id')
 * @throws {Error} If value is not a valid UUID
 * @example
 * validateUUID('550e8400-e29b-41d4-a716-446655440000', 'Publisher ID'); // No error
 * validateUUID('invalid', 'Website ID'); // Throws: Invalid Website ID: must be a valid UUID
 */
export function validateUUID(value: string, paramName: string = 'id'): void {
  if (!isValidUUID(value)) {
    throw new Error(`Invalid ${paramName}: must be a valid UUID`);
  }
}

/**
 * Fastify schema for UUID parameters
 * @description Use this in Fastify route schemas to validate UUID path/query parameters
 * @example
 * fastify.get('/:id', {
 *   schema: {
 *     params: {
 *       type: 'object',
 *       properties: { id: uuidParamSchema }
 *     }
 *   }
 * }, handler);
 */
export const uuidParamSchema = {
  type: 'string',
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
};
