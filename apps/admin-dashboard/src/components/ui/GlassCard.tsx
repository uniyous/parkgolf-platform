import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Hover effect */
  hoverable?: boolean;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-3 md:p-4',
  md: 'p-4 md:p-6',
  lg: 'p-6 md:p-8',
};

/**
 * Glass morphism card component
 */
const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hoverable = false, padding = 'md', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        hoverable ? 'glass-card-hover' : 'glass-card',
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
GlassCard.displayName = 'GlassCard';

export { GlassCard };
