import React from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/utils';

export interface FilterResetButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hasActiveFilters?: boolean;
  label?: string;
  showIcon?: boolean;
  variant?: 'default' | 'text' | 'outline';
}

const FilterResetButton = React.forwardRef<HTMLButtonElement, FilterResetButtonProps>(
  (
    {
      hasActiveFilters = true,
      label = '초기화',
      showIcon = true,
      variant = 'default',
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || !hasActiveFilters;

    const variantStyles = {
      default: cn(
        'px-4 py-2 rounded-lg text-sm font-medium',
        'flex items-center justify-center gap-2',
        'transition-colors',
        hasActiveFilters
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          : 'bg-gray-50 text-gray-400 cursor-not-allowed'
      ),
      text: cn(
        'px-3 py-2 rounded-lg text-sm font-medium',
        'flex items-center justify-center gap-1.5',
        'transition-colors',
        hasActiveFilters
          ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
          : 'text-gray-400 cursor-not-allowed'
      ),
      outline: cn(
        'px-4 py-2 rounded-lg text-sm font-medium',
        'flex items-center justify-center gap-2',
        'border transition-colors',
        hasActiveFilters
          ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
          : 'border-gray-200 text-gray-400 cursor-not-allowed'
      ),
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={cn(variantStyles[variant], className)}
        {...props}
      >
        {showIcon && <RotateCcw className="h-4 w-4" />}
        <span>{label}</span>
      </button>
    );
  }
);
FilterResetButton.displayName = 'FilterResetButton';

export { FilterResetButton };
