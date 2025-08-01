import React from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  onBack,
  backLabel = '목록으로',
  actions,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 mb-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {icon && (
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {actions}
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors group"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
              <span>{backLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 액션 버튼을 위한 헬퍼 컴포넌트
export const PageHeaderAction: React.FC<{
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ onClick, variant = 'primary', children, disabled = false }) => {
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
};