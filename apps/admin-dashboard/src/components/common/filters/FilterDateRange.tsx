import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/utils';

export interface FilterDateRangeProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  label?: string;
  showLabel?: boolean;
  startLabel?: string;
  endLabel?: string;
  className?: string;
  layout?: 'inline' | 'stacked';
}

const FilterDateRange: React.FC<FilterDateRangeProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = '기간',
  showLabel = true,
  startLabel = '시작일',
  endLabel = '종료일',
  className,
  layout = 'inline',
}) => {
  const inputClassName = cn(
    'w-full px-3 py-2 pl-9',
    'border border-gray-300 rounded-lg',
    'text-sm text-gray-900',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
    'transition-colors'
  );

  if (layout === 'stacked') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {startLabel}
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className={inputClassName}
            />
          </div>
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {endLabel}
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              min={startDate}
              className={inputClassName}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-w-0', className)}>
      {showLabel && (
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className={inputClassName}
          />
        </div>
        <span className="text-gray-400 text-sm flex-shrink-0">~</span>
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={startDate}
            className={inputClassName}
          />
        </div>
      </div>
    </div>
  );
};

// 단일 날짜 선택 컴포넌트
export interface FilterDateProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  showLabel?: boolean;
  containerClassName?: string;
}

const FilterDate = React.forwardRef<HTMLInputElement, FilterDateProps>(
  (
    {
      value,
      onChange,
      label,
      showLabel = true,
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
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            ref={ref}
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'w-full px-3 py-2 pl-9',
              'border border-gray-300 rounded-lg',
              'text-sm text-gray-900',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
              'transition-colors',
              className
            )}
            {...props}
          />
        </div>
      </div>
    );
  }
);
FilterDate.displayName = 'FilterDate';

export { FilterDateRange, FilterDate };
