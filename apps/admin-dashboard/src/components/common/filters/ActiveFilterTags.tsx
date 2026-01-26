import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils';

export interface FilterTag {
  id: string;
  label: string;
  value?: string;
  color?: 'gray' | 'violet' | 'green' | 'yellow' | 'red' | 'purple';
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
  gray: 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600',
  violet: 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30',
  green: 'bg-green-500/20 text-green-300 hover:bg-green-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30',
  red: 'bg-red-500/20 text-red-300 hover:bg-red-500/30',
  purple: 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30',
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
      <span className="text-xs text-zinc-400 font-medium">활성 필터:</span>
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
          className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-2 transition-colors"
        >
          {resetAllLabel}
        </button>
      )}
    </div>
  );
};

export { ActiveFilterTags };
