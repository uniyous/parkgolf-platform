import React from 'react';
import { cn } from '@/utils';
import type { Pagination as PaginationType } from '@/types/common';

interface PaginationProps {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange }) => {
  if (pagination.totalPages <= 1) return null;

  const startPage = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-white/10">
      <div className="text-sm text-white/40">
        총 {pagination.total}건 중{' '}
        {(pagination.page - 1) * pagination.limit + 1}-
        {Math.min(pagination.page * pagination.limit, pagination.total)}건
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="px-3 py-1 text-sm rounded-md bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          이전
        </button>
        {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
          const pageNum = startPage + i;
          if (pageNum > pagination.totalPages) return null;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={cn(
                'px-3 py-1 text-sm rounded-md',
                pageNum === pagination.page
                  ? 'bg-emerald-500/30 text-emerald-300'
                  : 'bg-white/5 text-white/60 hover:bg-white/10',
              )}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          className="px-3 py-1 text-sm rounded-md bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          다음
        </button>
      </div>
    </div>
  );
};
