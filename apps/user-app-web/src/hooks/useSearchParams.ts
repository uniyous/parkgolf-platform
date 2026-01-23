import { useSearchParams as useRouterSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
const getTodayDateString = () => new Date().toISOString().split('T')[0];

export interface GameSearchFilters {
  search: string;
  date: string;  // 기본값은 오늘 날짜 (항상 타임슬롯이 있는 게임만 조회)
  timeOfDay: 'all' | 'morning' | 'afternoon';
  minPrice: number | null;
  maxPrice: number | null;
  minPlayers: number | null;
  sortBy: 'price' | 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  page: number;
}

export function useGameSearchParams() {
  const [searchParams, setSearchParams] = useRouterSearchParams();

  const filters = useMemo<GameSearchFilters>(() => ({
    search: searchParams.get('search') || '',
    date: searchParams.get('date') || getTodayDateString(),  // 기본값을 오늘 날짜로 설정 - 항상 타임슬롯이 있는 게임만 조회
    timeOfDay: (searchParams.get('timeOfDay') as GameSearchFilters['timeOfDay']) || 'all',
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null,
    minPlayers: searchParams.get('minPlayers') ? Number(searchParams.get('minPlayers')) : null,
    sortBy: (searchParams.get('sortBy') as GameSearchFilters['sortBy']) || 'name',
    sortOrder: (searchParams.get('sortOrder') as GameSearchFilters['sortOrder']) || 'asc',
    page: Number(searchParams.get('page')) || 1,
  }), [searchParams]);

  const updateFilters = useCallback((updates: Partial<GameSearchFilters>) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === undefined) {
        newParams.delete(key);
      } else if (key === 'page' && value === 1) {
        // Don't include page=1 in URL
        newParams.delete(key);
      } else if (key === 'sortBy' && value === 'name') {
        // Don't include default sortBy in URL
        newParams.delete(key);
      } else if (key === 'sortOrder' && value === 'asc') {
        // Don't include default sortOrder in URL
        newParams.delete(key);
      } else if (key === 'timeOfDay' && value === 'all') {
        // Don't include default timeOfDay in URL
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });

    // Reset page when other filters change (except when updating page itself)
    if (!('page' in updates) && Object.keys(updates).length > 0) {
      newParams.delete('page');
    }

    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return { filters, updateFilters, resetFilters };
}
