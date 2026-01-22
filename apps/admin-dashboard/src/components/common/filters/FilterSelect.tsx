import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils';

export interface FilterSelectOption {
  value: string | number;
  label: string;
}

export interface FilterSelectGroup {
  label: string;
  options: FilterSelectOption[];
}

export interface FilterSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  options?: FilterSelectOption[];
  groups?: FilterSelectGroup[];
  label?: string;
  showLabel?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  containerClassName?: string;
}

const FilterSelect = React.forwardRef<HTMLSelectElement, FilterSelectProps>(
  (
    {
      value,
      onChange,
      options,
      groups,
      label,
      showLabel = true,
      placeholder,
      allowEmpty = true,
      emptyLabel = '전체',
      className,
      containerClassName,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('min-w-0', containerClassName)}>
        {showLabel && label && (
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'w-full px-3 py-2 pr-9',
              'border border-gray-300 rounded-lg',
              'text-sm text-gray-900 bg-white',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
              'appearance-none cursor-pointer',
              'transition-colors',
              className
            )}
            {...props}
          >
            {allowEmpty && (
              <option value="">{placeholder || emptyLabel}</option>
            )}
            {/* Render flat options */}
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {/* Render grouped options */}
            {groups?.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>
    );
  }
);
FilterSelect.displayName = 'FilterSelect';

export { FilterSelect };
