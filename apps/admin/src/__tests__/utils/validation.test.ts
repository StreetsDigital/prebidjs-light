import { describe, it, expect } from 'vitest';

/**
 * Common validation utilities used across the application
 */

// Email validation
export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';
  if (!email.includes('@')) return 'Invalid email format';
  if (!email.includes('.')) return 'Invalid email format';
  if (email.length < 5) return 'Email is too short';
  return null;
}

// Password validation
export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password is too long';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}

// URL validation
export function validateUrl(url: string): string | null {
  if (!url) return 'URL is required';
  try {
    new URL(url);
    return null;
  } catch {
    return 'Invalid URL format';
  }
}

// Domain validation
export function validateDomain(domain: string): string | null {
  if (!domain) return 'Domain is required';
  if (domain.includes('://')) return 'Domain should not include protocol';
  if (domain.includes('/')) return 'Domain should not include path';
  if (!domain.includes('.')) return 'Invalid domain format';
  if (domain.startsWith('.') || domain.endsWith('.')) return 'Invalid domain format';
  return null;
}

// Required field validation
export function validateRequired(value: any, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  return null;
}

// Number range validation
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): string | null {
  if (isNaN(value)) return `${fieldName} must be a number`;
  if (value < min) return `${fieldName} must be at least ${min}`;
  if (value > max) return `${fieldName} must be at most ${max}`;
  return null;
}

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('test@example.com')).toBeNull();
      expect(validateEmail('user.name@company.co.uk')).toBeNull();
      expect(validateEmail('admin+tag@domain.org')).toBeNull();
    });

    it('should reject empty email', () => {
      expect(validateEmail('')).toBe('Email is required');
    });

    it('should reject email without @', () => {
      expect(validateEmail('notanemail.com')).toBe('Invalid email format');
    });

    it('should reject email without domain', () => {
      expect(validateEmail('test@')).toBe('Invalid email format');
    });

    it('should reject very short emails', () => {
      expect(validateEmail('a@b')).toBe('Invalid email format');
    });
  });

  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      expect(validatePassword('Password123')).toBeNull();
      expect(validatePassword('MySecure1Pass')).toBeNull();
    });

    it('should reject empty password', () => {
      expect(validatePassword('')).toBe('Password is required');
    });

    it('should reject short passwords', () => {
      expect(validatePassword('Pass1')).toBe('Password must be at least 8 characters');
    });

    it('should reject password without uppercase', () => {
      expect(validatePassword('password123')).toBe('Password must contain an uppercase letter');
    });

    it('should reject password without lowercase', () => {
      expect(validatePassword('PASSWORD123')).toBe('Password must contain a lowercase letter');
    });

    it('should reject password without number', () => {
      expect(validatePassword('Password')).toBe('Password must contain a number');
    });

    it('should reject very long passwords', () => {
      const longPassword = 'A1' + 'a'.repeat(127);
      expect(validatePassword(longPassword)).toBe('Password is too long');
    });
  });

  describe('validateUrl', () => {
    it('should accept valid URLs', () => {
      expect(validateUrl('https://example.com')).toBeNull();
      expect(validateUrl('http://subdomain.example.org/path')).toBeNull();
      expect(validateUrl('https://example.com:8080/api?param=value')).toBeNull();
    });

    it('should reject empty URL', () => {
      expect(validateUrl('')).toBe('URL is required');
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not a url')).toBe('Invalid URL format');
      expect(validateUrl('ftp://invalid')).toBeNull(); // ftp is valid protocol
    });
  });

  describe('validateDomain', () => {
    it('should accept valid domains', () => {
      expect(validateDomain('example.com')).toBeNull();
      expect(validateDomain('subdomain.example.org')).toBeNull();
      expect(validateDomain('my-site.co.uk')).toBeNull();
    });

    it('should reject empty domain', () => {
      expect(validateDomain('')).toBe('Domain is required');
    });

    it('should reject domain with protocol', () => {
      expect(validateDomain('https://example.com')).toBe('Domain should not include protocol');
      expect(validateDomain('http://example.com')).toBe('Domain should not include protocol');
    });

    it('should reject domain with path', () => {
      expect(validateDomain('example.com/path')).toBe('Domain should not include path');
    });

    it('should reject domain without TLD', () => {
      expect(validateDomain('localhost')).toBe('Invalid domain format');
    });

    it('should reject malformed domains', () => {
      expect(validateDomain('.example.com')).toBe('Invalid domain format');
      expect(validateDomain('example.com.')).toBe('Invalid domain format');
    });
  });

  describe('validateRequired', () => {
    it('should accept non-empty values', () => {
      expect(validateRequired('value', 'Field')).toBeNull();
      expect(validateRequired(123, 'Number')).toBeNull();
      expect(validateRequired(true, 'Boolean')).toBeNull();
      expect(validateRequired(0, 'Zero')).toBeNull();
    });

    it('should reject null', () => {
      expect(validateRequired(null, 'Field')).toBe('Field is required');
    });

    it('should reject undefined', () => {
      expect(validateRequired(undefined, 'Field')).toBe('Field is required');
    });

    it('should reject empty string', () => {
      expect(validateRequired('', 'Field')).toBe('Field is required');
    });
  });

  describe('validateNumberRange', () => {
    it('should accept numbers within range', () => {
      expect(validateNumberRange(5, 0, 10, 'Value')).toBeNull();
      expect(validateNumberRange(0, 0, 10, 'Value')).toBeNull();
      expect(validateNumberRange(10, 0, 10, 'Value')).toBeNull();
    });

    it('should reject numbers below minimum', () => {
      expect(validateNumberRange(-1, 0, 10, 'Value')).toBe('Value must be at least 0');
    });

    it('should reject numbers above maximum', () => {
      expect(validateNumberRange(11, 0, 10, 'Value')).toBe('Value must be at most 10');
    });

    it('should reject NaN', () => {
      expect(validateNumberRange(NaN, 0, 10, 'Value')).toBe('Value must be a number');
    });

    it('should work with negative ranges', () => {
      expect(validateNumberRange(-5, -10, 0, 'Value')).toBeNull();
      expect(validateNumberRange(-11, -10, 0, 'Value')).toBe('Value must be at least -10');
    });

    it('should work with decimal numbers', () => {
      expect(validateNumberRange(5.5, 0, 10, 'Value')).toBeNull();
      expect(validateNumberRange(0.1, 0, 1, 'Value')).toBeNull();
    });
  });
});
