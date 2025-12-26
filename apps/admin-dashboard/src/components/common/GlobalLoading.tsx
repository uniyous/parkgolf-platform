import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils';

interface GlobalLoadingProps {
  open?: boolean;
  message?: string;
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
};

// Spinner 컴포넌트 (Lucide Loader2 기반)
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  return (
    <Loader2
      className={cn(sizeClasses[size], 'animate-spin text-blue-600', className)}
      aria-hidden="true"
    />
  );
};

// 전역 로딩 컴포넌트 (Radix UI Dialog 기반)
export const GlobalLoading: React.FC<GlobalLoadingProps> = ({
  open = true,
  message = '로딩 중...',
}) => {
  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 focus:outline-none"
          aria-describedby={message ? 'loading-description' : undefined}
        >
          <div className="flex flex-col items-center justify-center p-8">
            <Spinner size="lg" />
            {message && (
              <Dialog.Description
                id="loading-description"
                className="mt-4 text-sm font-medium text-gray-600"
              >
                {message}
              </Dialog.Description>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// 인라인 로딩 컴포넌트 (페이지 내부용)
export const InlineLoading: React.FC<{ message?: string; className?: string }> = ({
  message = '로딩 중...',
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8', className)}>
      <Spinner size="md" />
      {message && <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>}
    </div>
  );
};

export default GlobalLoading;
