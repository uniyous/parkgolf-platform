import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Loader2 } from 'lucide-react';
import { useIsFetching } from '@tanstack/react-query';
import { cn } from '@/utils';

interface GlobalLoadingProps {
  open?: boolean;
  message?: string;
  delay?: number; // 로딩 표시 지연 시간 (ms)
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

// Spinner 컴포넌트 (Lucide Loader2 기반)
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  return (
    <Loader2
      className={cn(sizeClasses[size], 'animate-spin', className)}
      aria-hidden="true"
    />
  );
};

// 세련된 전역 로딩 컴포넌트
export const GlobalLoading: React.FC<GlobalLoadingProps> = ({
  open = true,
  message,
  delay = 0,
}) => {
  const [showLoading, setShowLoading] = useState(delay === 0);

  useEffect(() => {
    if (!open) {
      setShowLoading(false);
      return;
    }

    if (delay === 0) {
      setShowLoading(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowLoading(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [open, delay]);

  if (!showLoading) return null;

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        {/* 그라데이션 배경 - 콘텐츠가 보이도록 */}
        <Dialog.Overlay
          className="fixed inset-0 z-50
                     bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10
                     backdrop-blur-[1px]
                     data-[state=open]:animate-in data-[state=closed]:animate-out
                     data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
                     duration-200"
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 focus:outline-none
                     data-[state=open]:animate-in data-[state=closed]:animate-out
                     data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
                     data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
                     duration-200"
          aria-describedby={undefined}
        >
          <VisuallyHidden.Root asChild>
            <Dialog.Title>로딩</Dialog.Title>
          </VisuallyHidden.Root>

          {/* 스피너 */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 blur-lg opacity-40 scale-150" />
              <Spinner size="xl" className="relative text-blue-600 drop-shadow-lg" />
            </div>

            {message && (
              <p className="mt-4 text-sm font-medium text-gray-700 tracking-wide drop-shadow-sm">
                {message}
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// 인라인 로딩 컴포넌트 (페이지 내부용)
export const InlineLoading: React.FC<{ message?: string; className?: string }> = ({
  message,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8', className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 blur-md opacity-20" />
        <Spinner size="lg" className="relative text-blue-600" />
      </div>
      {message && <p className="mt-4 text-sm font-medium text-gray-500">{message}</p>}
    </div>
  );
};

// TanStack Query 전역 로딩 인디케이터
// meta: { globalLoading: false } 가 설정된 쿼리는 제외
// 로컬 로딩이 필요한 쿼리는 meta: { globalLoading: false } 를 설정하세요
export const QueryLoadingIndicator: React.FC<{ delay?: number }> = ({ delay = 300 }) => {
  // globalLoading이 명시적으로 false가 아닌 쿼리만 카운트
  const isFetching = useIsFetching({
    predicate: (query) => query.meta?.globalLoading !== false,
  });

  if (isFetching === 0) return null;

  return <GlobalLoading delay={delay} />;
};

export default GlobalLoading;
