import { useSearchParams as useRouterSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

export interface GameSearchFilters {
  search: string;
  date: string;  // 빈 문자열이면 날짜 필터 없음 (전체 게임 표시)
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
    date: searchParams.get('date') || '',  // 기본값을 빈 문자열로 변경 - 날짜 필터 없이 전체 게임 표시
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
