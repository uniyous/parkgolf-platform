import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  /** 디바운스 지연 시간 (ms). 0이면 즉시 호출. 기본값 300ms */
  debounceMs?: number;
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
      debounceMs = 300,
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = useState(value);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    // 외부 value가 변경되면 로컬 값 동기화 (초기화 등)
    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    // 컴포넌트 언마운트 시 타이머 정리
    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    const handleChange = useCallback((newValue: string) => {
      setLocalValue(newValue);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (debounceMs <= 0) {
        onChange(newValue);
      } else {
        timerRef.current = setTimeout(() => onChange(newValue), debounceMs);
      }
    }, [onChange, debounceMs]);

    const handleClear = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setLocalValue('');
      onChange('');
      onClear?.();
    };

    return (
      <div className={cn('min-w-0', containerClassName)}>
        {showLabel && (
          <label className="block text-xs font-medium text-white/50 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
          <input
            ref={ref}
            type="text"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              'w-full pl-9 pr-9 py-2',
              'border border-white/15 rounded-lg',
              'text-sm text-white bg-white/10 placeholder:text-white/40',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-white/5',
              'transition-colors',
              className
            )}
            {...props}
          />
          {localValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
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
