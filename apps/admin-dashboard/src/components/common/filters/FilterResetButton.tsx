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
          ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
      ),
      text: cn(
        'px-3 py-2 rounded-lg text-sm font-medium',
        'flex items-center justify-center gap-1.5',
        'transition-colors',
        hasActiveFilters
          ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-500/10'
          : 'text-zinc-500 cursor-not-allowed'
      ),
      outline: cn(
        'px-4 py-2 rounded-lg text-sm font-medium',
        'flex items-center justify-center gap-2',
        'border transition-colors',
        hasActiveFilters
          ? 'border-zinc-600 text-zinc-300 hover:bg-zinc-800'
          : 'border-zinc-700 text-zinc-500 cursor-not-allowed'
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
