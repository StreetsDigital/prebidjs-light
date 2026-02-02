import { useState, useCallback } from 'react';

/**
 * Custom hook for form validation with real-time error tracking
 * @template T - Form values type (must extend Record<string, any>)
 * @param {T} initialValues - Initial form values
 * @param {Record<keyof T, (value: any) => string | null>} validators - Validation functions for each field
 * @returns {{values: T, errors: Partial<Record<keyof T, string>>, handleChange: Function, handleSubmit: Function}}
 * @property {T} values - Current form values
 * @property {Partial<Record<keyof T, string>>} errors - Validation errors by field name
 * @property {Function} handleChange - Update field value and validate
 * @property {Function} handleSubmit - Validate all fields and call onSubmit if valid
 * @example
 * const { values, errors, handleChange, handleSubmit } = useFormValidation(
 *   { email: '', password: '' },
 *   {
 *     email: (v) => !v ? 'Required' : null,
 *     password: (v) => v.length < 8 ? 'Too short' : null
 *   }
 * );
 */
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validators: Record<keyof T, (value: any) => string | null>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validate = useCallback((name: keyof T, value: any) => {
    const error = validators[name]?.(value);
    setErrors(prev => ({ ...prev, [name]: error || undefined }));
    return !error;
  }, [validators]);

  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    validate(name, value);
  }, [validate]);

  const handleSubmit = useCallback((onSubmit: (values: T) => void) => {
    const allErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const key in validators) {
      const error = validators[key](values[key]);
      if (error) {
        allErrors[key] = error;
        isValid = false;
      }
    }

    setErrors(allErrors);
    if (isValid) {
      onSubmit(values);
    }
  }, [values, validators]);

  return { values, errors, handleChange, handleSubmit };
}
