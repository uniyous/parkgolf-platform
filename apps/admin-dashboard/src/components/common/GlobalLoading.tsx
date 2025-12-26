import React from 'react';

interface GlobalLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const GlobalLoading: React.FC<GlobalLoadingProps> = ({
  message = '로딩 중...',
  fullScreen = true,
}) => {
  const containerClass = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClass}>
      <div className="text-center">
        <div className="relative">
          {/* Outer ring */}
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
          {/* Spinning ring */}
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default GlobalLoading;
