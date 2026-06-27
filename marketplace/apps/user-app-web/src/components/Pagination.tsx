import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  variant?: 'default' | 'glass';
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
  variant = 'glass',
}) => {
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (variant === 'glass') {
    return (
      <div className={cn('flex justify-center items-center gap-2', className)}>
        <Button
          variant="glass"
          disabled={currentPage <= 1}
          onClick={handlePrevious}
        >
          이전
        </Button>
        <span className="px-4 py-2 text-white/70">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="glass"
          disabled={currentPage >= totalPages}
          onClick={handleNext}
        >
          다음
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <button
        onClick={handlePrevious}
        disabled={currentPage <= 1}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-lg',
          'bg-white/10 text-white/70',
          'hover:bg-white/20 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        이전
      </button>
      <span className="text-sm text-white/60">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-lg',
          'bg-white/10 text-white/70',
          'hover:bg-white/20 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        다음
      </button>
    </div>
  );
};
