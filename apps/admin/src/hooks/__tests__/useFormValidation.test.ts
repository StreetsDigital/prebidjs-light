import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '../useFormValidation';

describe('useFormValidation', () => {
  const mockValidators = {
    email: (value: string) => {
      if (!value) return 'Email is required';
      if (!value.includes('@')) return 'Invalid email format';
      return null;
    },
    password: (value: string) => {
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
      return null;
    },
    age: (value: number) => {
      if (!value) return 'Age is required';
      if (value < 18) return 'Must be at least 18';
      if (value > 120) return 'Invalid age';
      return null;
    },
  };

  it('should initialize with default values', () => {
    const initialValues = { email: '', password: '', age: 0 };
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidators)
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
  });

  it('should update value on handleChange', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: '', password: '', age: 0 }, mockValidators)
    );

    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });

    expect(result.current.values.email).toBe('test@example.com');
  });

  it('should validate field on change', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: '', password: '', age: 0 }, mockValidators)
    );

    act(() => {
      result.current.handleChange('email', 'invalid');
    });

    expect(result.current.errors.email).toBe('Invalid email format');
  });

  it('should clear error when field becomes valid', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: '', password: '', age: 0 }, mockValidators)
    );

    // First set invalid value
    act(() => {
      result.current.handleChange('email', 'invalid');
    });

    expect(result.current.errors.email).toBe('Invalid email format');

    // Then set valid value
    act(() => {
      result.current.handleChange('email', 'valid@example.com');
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  it('should validate all fields on submit', () => {
    const { result } = renderHook(() =>
      useFormValidation(
        { email: 'invalid', password: 'short', age: 15 },
        mockValidators
      )
    );

    const onSubmit = vi.fn();

    act(() => {
      result.current.handleSubmit(onSubmit);
    });

    expect(result.current.errors.email).toBe('Invalid email format');
    expect(result.current.errors.password).toBe('Password must be at least 8 characters');
    expect(result.current.errors.age).toBe('Must be at least 18');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit when all fields are valid', () => {
    const { result } = renderHook(() =>
      useFormValidation(
        { email: 'test@example.com', password: 'password123', age: 25 },
        mockValidators
      )
    );

    const onSubmit = vi.fn();

    act(() => {
      result.current.handleSubmit(onSubmit);
    });

    expect(result.current.errors).toEqual({});
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      age: 25,
    });
  });

  it('should not call onSubmit if any field is invalid', () => {
    const { result } = renderHook(() =>
      useFormValidation(
        { email: 'test@example.com', password: 'short', age: 25 },
        mockValidators
      )
    );

    const onSubmit = vi.fn();

    act(() => {
      result.current.handleSubmit(onSubmit);
    });

    expect(result.current.errors.password).toBe('Password must be at least 8 characters');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should validate required fields', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: '', password: '', age: 0 }, mockValidators)
    );

    const onSubmit = vi.fn();

    act(() => {
      result.current.handleSubmit(onSubmit);
    });

    expect(result.current.errors.email).toBe('Email is required');
    expect(result.current.errors.password).toBe('Password is required');
    expect(result.current.errors.age).toBe('Age is required');
  });

  it('should handle complex validation rules', () => {
    const { result } = renderHook(() =>
      useFormValidation({ age: 150 }, { age: mockValidators.age })
    );

    act(() => {
      result.current.handleChange('age', 150);
    });

    expect(result.current.errors.age).toBe('Invalid age');
  });

  it('should work with partial validators', () => {
    const { result } = renderHook(() =>
      useFormValidation(
        { email: '', password: '' },
        { email: mockValidators.email } as any
      )
    );

    act(() => {
      result.current.handleChange('email', 'test@example.com');
      result.current.handleChange('password', 'anything'); // No validator for password
    });

    expect(result.current.values.password).toBe('anything');
    expect(result.current.errors.password).toBeUndefined();
  });

  it('should update multiple fields independently', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: '', password: '', age: 0 }, mockValidators)
    );

    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });

    act(() => {
      result.current.handleChange('password', 'password123');
    });

    act(() => {
      result.current.handleChange('age', 25);
    });

    expect(result.current.values).toEqual({
      email: 'test@example.com',
      password: 'password123',
      age: 25,
    });
    expect(result.current.errors).toEqual({});
  });

  it('should re-validate on submit even if fields were not changed', () => {
    const initialValues = { email: 'invalid', password: 'short', age: 15 };
    const { result } = renderHook(() =>
      useFormValidation(initialValues, mockValidators)
    );

    const onSubmit = vi.fn();

    // Submit without any changes
    act(() => {
      result.current.handleSubmit(onSubmit);
    });

    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should handle validators returning null for valid values', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: '' }, { email: mockValidators.email })
    );

    act(() => {
      result.current.handleChange('email', 'valid@example.com');
    });

    expect(result.current.errors.email).toBeUndefined();
  });
});
