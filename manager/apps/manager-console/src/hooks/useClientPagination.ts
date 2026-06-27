import { useState, useMemo } from 'react';
import type { Pagination } from '@/types/common';

interface UseClientPaginationResult<T> {
  paginatedData: T[];
  pagination: Pagination;
  page: number;
  setPage: (page: number) => void;
}

export function useClientPagination<T>(
  data: T[],
  limit: number = 20,
): UseClientPaginationResult<T> {
  const [page, setPage] = useState(1);

  const pagination: Pagination = useMemo(() => {
    const total = data.length;
    const totalPages = Math.ceil(total / limit) || 1;
    return { total, page, limit, totalPages };
  }, [data.length, page, limit]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * limit;
    return data.slice(start, start + limit);
  }, [data, page, limit]);

  // 페이지 범위 초과 시 1페이지로 리셋
  const safePage = page > pagination.totalPages ? 1 : page;
  if (safePage !== page) {
    setPage(safePage);
  }

  return { paginatedData, pagination, page, setPage };
}
