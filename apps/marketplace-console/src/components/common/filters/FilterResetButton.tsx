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
      label = '필터 초기화',
      showIcon = true,
      variant = 'text',
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
          ? 'bg-white/15 text-white/80 hover:bg-white/20'
          : 'bg-white/5 text-white/30 cursor-not-allowed'
      ),
      text: cn(
        'px-3 py-2 rounded-lg text-sm font-medium',
        'flex items-center justify-center gap-1.5',
        'transition-colors',
        hasActiveFilters
          ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
          : 'text-white/30 cursor-not-allowed'
      ),
      outline: cn(
        'px-4 py-2 rounded-lg text-sm font-medium',
        'flex items-center justify-center gap-2',
        'border transition-colors',
        hasActiveFilters
          ? 'border-white/15 text-white/70 hover:bg-white/5'
          : 'border-white/10 text-white/30 cursor-not-allowed'
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
