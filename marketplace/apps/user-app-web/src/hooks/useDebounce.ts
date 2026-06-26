import { useState, useEffect } from 'react';

/**
 * Debounce hook for values
 * 주어진 값이 변경된 후 지정된 시간이 지나면 디바운스된 값을 반환
 *
 * @param value - 디바운스할 값
 * @param delay - 디바운스 지연 시간 (ms)
 * @returns 디바운스된 값
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
