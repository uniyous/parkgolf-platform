import React from 'react';
import { clsx } from 'clsx';

interface TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'error' | 'success';
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  children,
  className = '',
  style = {},
}) => {
  const variantClasses = {
    h1: 'text-3xl font-bold text-gray-900 mb-4',
    h2: 'text-2xl font-bold text-gray-900 mb-3',
    h3: 'text-xl font-semibold text-gray-900 mb-2',
    h4: 'text-lg font-semibold text-gray-900 mb-2',
    body: 'text-base text-gray-700',
    caption: 'text-xs text-gray-500',
    error: 'text-sm text-red-600 mt-1',
    success: 'text-sm text-golf-secondary mt-1',
  };

  const textClasses = clsx(variantClasses[variant], className);

  if (variant === 'h1') {
    return <h1 className={textClasses} style={style}>{children}</h1>;
  }
  if (variant === 'h2') {
    return <h2 className={textClasses} style={style}>{children}</h2>;
  }
  if (variant === 'h3') {
    return <h3 className={textClasses} style={style}>{children}</h3>;
  }
  if (variant === 'h4') {
    return <h4 className={textClasses} style={style}>{children}</h4>;
  }

  return (
    <p className={textClasses} style={style}>
      {children}
    </p>
  );
};