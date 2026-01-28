import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingViewProps {
  /** Loading message */
  message?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full screen overlay */
  fullScreen?: boolean;
  /** Extra class name */
  className?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

/**
 * Loading indicator component
 */
export function LoadingView({
  message = '로딩 중...',
  size = 'md',
  fullScreen = false,
  className,
}: LoadingViewProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        fullScreen ? 'fixed inset-0 bg-[var(--color-bg-primary)]/80 backdrop-blur-sm z-50' : 'py-12',
        className
      )}
    >
      <Loader2 className={cn('loading-spinner', sizeClasses[size])} />
      {message && (
        <p className="text-sm text-[var(--color-text-tertiary)]">{message}</p>
      )}
    </div>
  );

  return content;
}
