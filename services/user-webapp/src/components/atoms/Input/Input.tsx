import React from 'react';
import { clsx } from 'clsx';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'date' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  error?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  name,
  error,
  disabled = false,
  min,
  max,
  className = '',
  style = {},
}) => {
  const inputClasses = clsx(
    'w-full px-4 py-3 rounded-lg text-base outline-none transition-all duration-200',
    'bg-gray-50 border-2 border-gray-200',
    'focus:bg-white focus:border-golf-primary focus:ring-2 focus:ring-golf-primary/20',
    error && 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/20',
    disabled && 'bg-gray-100 text-gray-400 cursor-not-allowed',
    className
  );

  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      className={inputClasses}
      style={style}
    />
  );
};