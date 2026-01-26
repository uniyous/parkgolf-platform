import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from './GlassCard';
import { LoadingView } from './LoadingView';
import { EmptyState } from './EmptyState';
import { Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  keyExtractor?: (item: T, index: number) => string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
}

/**
 * Glass-styled data table with pagination
 */
export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = '데이터가 없습니다',
  emptyDescription,
  onRowClick,
  keyExtractor,
  pagination,
  className,
}: DataTableProps<T>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;
  const currentPage = pagination?.page ?? 1;

  const getKey = (item: T, index: number): string => {
    if (keyExtractor) return keyExtractor(item, index);
    // Try to use common id fields
    const anyItem = item as Record<string, unknown>;
    if (anyItem.id) return String(anyItem.id);
    if (anyItem._id) return String(anyItem._id);
    return String(index);
  };

  const handlePageChange = (newPage: number) => {
    if (pagination && newPage >= 1 && newPage <= totalPages) {
      pagination.onPageChange(newPage);
    }
  };

  if (isLoading) {
    return (
      <GlassCard className={className}>
        <LoadingView message="데이터를 불러오는 중..." />
      </GlassCard>
    );
  }

  if (data.length === 0) {
    return (
      <GlassCard className={className}>
        <EmptyState
          icon={Inbox}
          title={emptyMessage}
          description={emptyDescription}
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="none" className={cn('overflow-hidden', className)}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table-glass">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right'
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={getKey(item, index)}
                onClick={() => onRowClick?.(item)}
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right'
                    )}
                  >
                    {col.render
                      ? col.render(item, index)
                      : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
          <div className="text-sm text-[var(--color-text-tertiary)]">
            총 {pagination.total.toLocaleString()}개 중{' '}
            {((currentPage - 1) * pagination.limit + 1).toLocaleString()}-
            {Math.min(currentPage * pagination.limit, pagination.total).toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="처음"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="이전"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm text-[var(--color-text-primary)]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="다음"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="마지막"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
