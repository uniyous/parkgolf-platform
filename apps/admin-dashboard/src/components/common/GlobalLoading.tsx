import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface GlobalLoadingProps {
  open?: boolean;
  message?: string;
}

// Spinner 컴포넌트 (재사용 가능)
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`${sizeClasses[size]} border-gray-200 rounded-full`}></div>
      <div
        className={`absolute top-0 left-0 ${sizeClasses[size]} border-blue-600 rounded-full border-t-transparent animate-spin`}
      ></div>
    </div>
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm transition-opacity duration-200" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 focus:outline-none">
          <div className="flex flex-col items-center justify-center p-8">
            <Spinner size="lg" />
            {message && (
              <Dialog.Description className="mt-4 text-sm font-medium text-gray-600">
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
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Spinner size="md" />
      {message && <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>}
    </div>
  );
};

export default GlobalLoading;
