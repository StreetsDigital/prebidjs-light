import { describe, it, expect } from 'vitest';
import { safeJsonParse, safeJsonParseArray, safeJsonParseObject } from '../safe-json';

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    const result = safeJsonParse('{"key":"value"}', {});
    expect(result).toEqual({ key: 'value' });
  });

  it('should return default on invalid JSON', () => {
    const result = safeJsonParse('invalid json', { default: true });
    expect(result).toEqual({ default: true });
  });

  it('should handle null input', () => {
    const result = safeJsonParse(null, 'default');
    expect(result).toBe('default');
  });

  it('should handle undefined input', () => {
    const result = safeJsonParse(undefined, 'default');
    expect(result).toBe('default');
  });

  it('should handle empty string', () => {
    const result = safeJsonParse('', { fallback: true });
    expect(result).toEqual({ fallback: true });
  });

  it('should parse numbers', () => {
    const result = safeJsonParse('42', 0);
    expect(result).toBe(42);
  });

  it('should parse booleans', () => {
    const result = safeJsonParse('true', false);
    expect(result).toBe(true);
  });

  it('should parse arrays', () => {
    const result = safeJsonParse('[1,2,3]', []);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should handle malformed JSON with default', () => {
    const result = safeJsonParse('{"key": value}', { error: true });
    expect(result).toEqual({ error: true });
  });

  it('should use null as default if not provided', () => {
    const result = safeJsonParse('invalid');
    expect(result).toBeNull();
  });
});

describe('safeJsonParseArray', () => {
  it('should parse JSON array', () => {
    const result = safeJsonParseArray('[1,2,3]', []);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should return empty array by default', () => {
    const result = safeJsonParseArray('invalid', []);
    expect(result).toEqual([]);
  });

  it('should handle null input', () => {
    const result = safeJsonParseArray(null);
    expect(result).toEqual([]);
  });

  it('should handle undefined input', () => {
    const result = safeJsonParseArray(undefined);
    expect(result).toEqual([]);
  });

  it('should parse array of objects', () => {
    const result = safeJsonParseArray('[{"id":1},{"id":2}]');
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should use custom default array', () => {
    const customDefault = [{ default: true }];
    const result = safeJsonParseArray('invalid', customDefault);
    expect(result).toEqual(customDefault);
  });

  it('should handle non-array JSON', () => {
    const result = safeJsonParseArray('{"key":"value"}', []);
    expect(result).toEqual({ key: 'value' }); // Returns the parsed object, not array
  });
});

describe('safeJsonParseObject', () => {
  it('should parse JSON object', () => {
    const result = safeJsonParseObject('{"a":1}', {});
    expect(result).toEqual({ a: 1 });
  });

  it('should return empty object by default', () => {
    const result = safeJsonParseObject('invalid', {});
    expect(result).toEqual({});
  });

  it('should handle null input', () => {
    const result = safeJsonParseObject(null);
    expect(result).toEqual({});
  });

  it('should handle undefined input', () => {
    const result = safeJsonParseObject(undefined);
    expect(result).toEqual({});
  });

  it('should parse nested objects', () => {
    const result = safeJsonParseObject('{"outer":{"inner":"value"}}');
    expect(result).toEqual({ outer: { inner: 'value' } });
  });

  it('should use custom default object', () => {
    const customDefault = { default: 'value' };
    const result = safeJsonParseObject('invalid', customDefault);
    expect(result).toEqual(customDefault);
  });

  it('should handle complex objects', () => {
    const complex = {
      str: 'test',
      num: 123,
      bool: true,
      arr: [1, 2, 3],
      obj: { nested: 'value' },
    };
    const result = safeJsonParseObject(JSON.stringify(complex));
    expect(result).toEqual(complex);
  });
});
