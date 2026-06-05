import { useState, useCallback } from 'react';
import { ValidationRule } from '../utils/validation.ts';

export function useFormValidation<T extends Record<string, any>>(
  rulesConfig: Partial<Record<keyof T, ValidationRule[]>>
) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const getError = useCallback((field: string) => {
    return errors[field] || null;
  }, [errors]);

  const validateField = useCallback((field: string, value: any, formData?: Partial<T>) => {
    const fieldRules = rulesConfig[field as keyof typeof rulesConfig];
    if (!fieldRules) return null;
    for (const rule of fieldRules) {
      const error = rule(value, formData);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
        return error;
      }
    }
    setErrors(prev => ({ ...prev, [field]: null }));
    return null;
  }, [rulesConfig]);

  const validateAll = useCallback((data: Partial<T>): boolean => {
    let isValid = true;
    const newErrors: Record<string, string | null> = {};
    const allTouched: Record<string, boolean> = {};

    for (const field in rulesConfig) {
      allTouched[field] = true;
      const fieldRules = rulesConfig[field];
      if (!fieldRules) continue;
      for (const rule of fieldRules) {
        const error = rule(data[field], data);
        newErrors[field] = error;
        if (error) {
          isValid = false;
          break;
        }
      }
    }

    setErrors(newErrors);
    setTouched(prev => ({ ...prev, ...allTouched }));
    return isValid;
  }, [rulesConfig]);

  const onBlur = useCallback((field: string, value: any, formData?: Partial<T>) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, value, formData);
  }, [validateField]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const setFieldError = useCallback((field: string, error: string | null) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  return {
    errors,
    touched,
    getError,
    validateField,
    validateAll,
    onBlur,
    clearErrors,
    setFieldError,
  };
}
