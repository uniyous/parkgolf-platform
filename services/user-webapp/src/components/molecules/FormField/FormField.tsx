import React from 'react';
import { Input } from '../../atoms/Input';
import { Text } from '../../atoms/Text';

interface FormFieldProps {
  label: string;
  type?: 'text' | 'email' | 'password' | 'date' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  error?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  name,
  error,
  disabled = false,
  min,
  max,
  required = false,
}) => {
  return (
    <div className="mb-5">
      <label className="block mb-2 text-sm font-semibold text-gray-700">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <Input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        min={min}
        max={max}
      />
      {error && <Text variant="error">{error}</Text>}
    </div>
  );
};