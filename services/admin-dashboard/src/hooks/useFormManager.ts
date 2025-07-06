import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseFormManagerOptions<T> {
  validationSchema?: (data: T) => Record<string, string>;
  onSubmit?: (data: T) => Promise<void> | void;
  resetOnSubmit?: boolean;
}

export interface UseFormManagerReturn<T> {
  formData: T;
  isEditing: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;
  globalError: string | null;
  
  // Actions
  setFormData: (data: T | ((prev: T) => T)) => void;
  setData: (data: T | ((prev: T) => T)) => void; // Alias for setFormData
  handleChange: (name: keyof T, value: any) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  startEdit: () => void;
  cancelEdit: () => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: (newData?: T) => void;
  setError: (field: string, message: string) => void;
  clearErrors: () => void;
  clearGlobalError: () => void;
  getFieldProps: (name: keyof T) => {
    name: string;
    value: T[keyof T];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    error?: string;
  };
}

export function useFormManager<T extends Record<string, any>>(
  initialData: T,
  options: UseFormManagerOptions<T> = {}
): UseFormManagerReturn<T> {
  const [originalData, setOriginalData] = useState<T>(initialData);
  const [formData, setFormData] = useState<T>(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // 변경사항 여부 체크
  const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);

  // 초기 데이터 변경 감지를 위한 ref
  const initialDataRef = useRef<T>(initialData);
  const initialDataStringRef = useRef<string>(JSON.stringify(initialData));

  // 초기 데이터가 실제로 변경되면 폼 데이터도 업데이트
  useEffect(() => {
    const currentDataString = JSON.stringify(initialData);
    if (currentDataString !== initialDataStringRef.current && !isEditing) {
      initialDataRef.current = initialData;
      initialDataStringRef.current = currentDataString;
      setOriginalData(initialData);
      setFormData(initialData);
    }
  }, [initialData, isEditing]);

  const handleChange = useCallback((name: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // 해당 필드의 에러 클리어
    setErrors(prev => {
      if (prev[name as string]) {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? Number(value) : 
                       type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                       value;
    handleChange(name as keyof T, parsedValue);
  }, [handleChange]);

  const startEdit = useCallback(() => {
    setIsEditing(true);
    setOriginalData(formData);
    clearErrors();
    setGlobalError(null);
  }, [formData]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setFormData(originalData);
    clearErrors();
    setGlobalError(null);
  }, [originalData]);

  const reset = useCallback((newData?: T) => {
    const dataToUse = newData || initialData;
    setOriginalData(dataToUse);
    setFormData(dataToUse);
    setIsEditing(false);
    clearErrors();
    setGlobalError(null);
  }, [initialData]);

  const validate = useCallback(() => {
    if (!options.validationSchema) return true;
    
    const validationErrors = options.validationSchema(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [formData, options.validationSchema]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!validate()) {
      return;
    }

    if (!options.onSubmit) {
      setIsEditing(false);
      setOriginalData(formData);
      return;
    }

    setIsSubmitting(true);
    setGlobalError(null);

    try {
      await options.onSubmit(formData);
      
      if (options.resetOnSubmit) {
        reset();
      } else {
        setIsEditing(false);
        setOriginalData(formData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setGlobalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validate, options, reset]);

  const setError = useCallback((field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearGlobalError = useCallback(() => {
    setGlobalError(null);
  }, []);

  const getFieldProps = useCallback((name: keyof T) => ({
    name: String(name),
    value: formData[name],
    onChange: handleInputChange,
    error: errors[String(name)],
  }), [formData, handleInputChange, errors]);

  return {
    formData,
    isEditing,
    isDirty,
    isSubmitting,
    errors,
    globalError,
    
    setFormData,
    setData: setFormData, // Alias
    handleChange,
    handleInputChange,
    startEdit,
    cancelEdit,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    clearGlobalError,
    getFieldProps,
  };
}