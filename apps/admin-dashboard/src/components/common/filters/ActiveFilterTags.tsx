import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils';

export interface FilterTag {
  id: string;
  label: string;
  value?: string;
  color?: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export interface ActiveFilterTagsProps {
  filters: FilterTag[];
  onRemove: (filterId: string) => void;
  onResetAll?: () => void;
  showResetAll?: boolean;
  resetAllLabel?: string;
  className?: string;
}

const colorStyles: Record<NonNullable<FilterTag['color']>, string> = {
  gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  green: 'bg-green-100 text-green-700 hover:bg-green-200',
  yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  red: 'bg-red-100 text-red-700 hover:bg-red-200',
  purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
};

const ActiveFilterTags: React.FC<ActiveFilterTagsProps> = ({
  filters,
  onRemove,
  onResetAll,
  showResetAll = true,
  resetAllLabel = '모두 초기화',
  className,
}) => {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className={cn('mt-3 flex items-center gap-2 flex-wrap', className)}>
      <span className="text-xs text-gray-500 font-medium">활성 필터:</span>
      {filters.map((filter) => (
        <span
          key={filter.id}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
            colorStyles[filter.color || 'gray']
          )}
        >
          <span>{filter.label}</span>
          {filter.value && (
            <span className="opacity-75">: {filter.value}</span>
          )}
          <button
            type="button"
            onClick={() => onRemove(filter.id)}
            className="ml-0.5 hover:opacity-70 transition-opacity"
            aria-label={`${filter.label} 필터 제거`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {showResetAll && onResetAll && filters.length > 1 && (
        <button
          type="button"
          onClick={onResetAll}
          className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2 transition-colors"
        >
          {resetAllLabel}
        </button>
      )}
    </div>
  );
};

export { ActiveFilterTags };
