import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  /** Maximum width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm', // 640px
  md: 'max-w-screen-md', // 768px
  lg: 'max-w-screen-lg', // 1024px
  xl: 'max-w-screen-xl', // 1280px
  full: 'max-w-full',
};

/**
 * Responsive container component
 */
export function Container({
  children,
  className,
  maxWidth = 'xl',
}: ContainerProps) {
  return (
    <div
      className={cn(
        'w-full mx-auto',
        'px-4 sm:px-6 lg:px-8',
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}
