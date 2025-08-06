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
    'w-full px-4 py-3 rounded-xl text-base outline-none transition-all duration-200',
    'bg-white/90 border border-white/30 text-slate-800 placeholder-slate-500',
    'focus:bg-white focus:border-white/50 focus:ring-2 focus:ring-white/20 backdrop-blur-sm',
    error && 'border-red-400 bg-red-50/90 focus:border-red-400 focus:ring-red-400/20',
    disabled && 'bg-white/50 text-slate-400 cursor-not-allowed',
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