import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'transparent';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  children,
  onClick,
  type = 'button',
  className = '',
  style = {},
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const sizeClasses = {
    small: 'px-3 py-2 text-sm',
    medium: 'px-4 py-3 text-sm',
    large: 'px-6 py-4 text-base',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-golf-primary to-golf-secondary text-white shadow-lg hover:shadow-xl focus:ring-golf-primary disabled:from-gray-400 disabled:to-gray-400',
    secondary: 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-400',
    outline: 'bg-transparent text-golf-primary border-2 border-golf-primary hover:bg-golf-primary hover:text-white focus:ring-golf-primary disabled:border-gray-300 disabled:text-gray-300',
    transparent: 'bg-transparent text-gray-600 border border-gray-300 hover:bg-gray-50 focus:ring-gray-300 disabled:text-gray-400 disabled:border-gray-200',
  };

  const disabledClasses = 'cursor-not-allowed transform-none hover:translate-y-0';

  const buttonClasses = clsx(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    (disabled || loading) && disabledClasses,
    className
  );

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      style={style}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          로딩 중...
        </>
      ) : (
        children
      )}
    </button>
  );
};