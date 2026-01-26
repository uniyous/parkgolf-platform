import React from 'react';
import { ChevronLeft } from 'lucide-react';

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
    <div className={`glass-card mb-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {icon && (
            <div className="w-12 h-12 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && (
              <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {actions}
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center px-4 py-2 text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors group"
            >
              <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
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
    primary: 'bg-violet-600 text-white hover:bg-violet-500 disabled:bg-violet-700 disabled:opacity-50',
    secondary: 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:opacity-50',
    danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-700 disabled:opacity-50'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
};