import { describe, it, expect } from 'vitest';
import { isValidUUID, validateUUID } from '../validation';

describe('isValidUUID', () => {
  it('should validate correct UUID v4', () => {
    // Valid UUIDv4: version digit must be 4, variant must be 8, 9, a, or b
    expect(isValidUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
  });

  it('should validate another valid UUID v4', () => {
    expect(isValidUUID('550e8400-e29b-41d4-8716-446655440000')).toBe(true);
  });

  it('should reject invalid UUID', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  it('should reject short string', () => {
    expect(isValidUUID('123')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('should reject SQL injection attempts', () => {
    expect(isValidUUID("'; DROP TABLE publishers; --")).toBe(false);
  });

  it('should reject UUID with wrong version', () => {
    // UUID v1 (version digit is not 4)
    expect(isValidUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });

  it('should reject UUID with wrong variant', () => {
    // Invalid variant (4th group doesn't start with 8, 9, a, or b)
    expect(isValidUUID('550e8400-e29b-41d4-2716-446655440000')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isValidUUID('123E4567-E89B-42D3-A456-426614174000')).toBe(true);
    expect(isValidUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
  });

  it('should reject UUID without dashes', () => {
    expect(isValidUUID('123e4567e89b12d3a456426614174000')).toBe(false);
  });

  it('should reject UUID with extra characters', () => {
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000-extra')).toBe(false);
  });
});

describe('validateUUID', () => {
  it('should not throw for valid UUID', () => {
    expect(() => validateUUID('123e4567-e89b-42d3-a456-426614174000')).not.toThrow();
  });

  it('should throw for invalid UUID', () => {
    expect(() => validateUUID('invalid')).toThrow('Invalid id: must be a valid UUID');
  });

  it('should use custom parameter name in error', () => {
    expect(() => validateUUID('invalid', 'Publisher ID')).toThrow('Invalid Publisher ID: must be a valid UUID');
  });

  it('should use custom parameter name for Website ID', () => {
    expect(() => validateUUID('not-uuid', 'Website ID')).toThrow('Invalid Website ID: must be a valid UUID');
  });

  it('should use default parameter name when not provided', () => {
    expect(() => validateUUID('bad-uuid')).toThrow('Invalid id: must be a valid UUID');
  });

  it('should accept valid UUIDs with custom parameter name', () => {
    expect(() => validateUUID('550e8400-e29b-41d4-8716-446655440000', 'User ID')).not.toThrow();
  });

  it('should throw for empty string', () => {
    expect(() => validateUUID('')).toThrow('Invalid id: must be a valid UUID');
  });

  it('should throw for SQL injection attempts', () => {
    expect(() => validateUUID("'; DROP TABLE users; --", 'User ID')).toThrow('Invalid User ID: must be a valid UUID');
  });
});
