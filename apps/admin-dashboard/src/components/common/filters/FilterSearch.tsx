import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/utils';

export interface FilterSearchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  label?: string;
  showLabel?: boolean;
  containerClassName?: string;
}

const FilterSearch = React.forwardRef<HTMLInputElement, FilterSearchProps>(
  (
    {
      value,
      onChange,
      onClear,
      label = '검색',
      showLabel = false,
      placeholder = '검색어를 입력하세요',
      className,
      containerClassName,
      ...props
    },
    ref
  ) => {
    const handleClear = () => {
      onChange('');
      onClear?.();
    };

    return (
      <div className={cn('min-w-0', containerClassName)}>
        {showLabel && (
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              'w-full pl-9 pr-9 py-2',
              'border border-zinc-700 rounded-lg',
              'text-sm text-zinc-100 bg-zinc-900 placeholder:text-zinc-500',
              'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-800',
              'transition-colors',
              className
            )}
            {...props}
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
              tabIndex={-1}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }
);
FilterSearch.displayName = 'FilterSearch';

export { FilterSearch };
