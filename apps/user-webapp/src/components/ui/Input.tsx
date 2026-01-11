import React, { useId } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  glass?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, id, glass = false, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const baseStyles = glass
      ? 'bg-white/90 border-white/30 text-slate-800 placeholder:text-slate-500 focus-visible:bg-white focus-visible:border-white/50 focus-visible:ring-white/20 backdrop-blur-sm'
      : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus-visible:ring-emerald-500';

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-semibold mb-1',
              glass ? 'text-white/90' : 'text-gray-700'
            )}
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-xl border px-4 py-2 text-base ring-offset-white transition-all duration-200',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            baseStyles,
            error && 'border-red-400 focus-visible:ring-red-400',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className={cn('text-sm', glass ? 'text-red-300' : 'text-red-600')}>
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
