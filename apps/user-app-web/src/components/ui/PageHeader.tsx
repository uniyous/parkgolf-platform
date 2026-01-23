import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Action buttons on the right */
  action?: ReactNode;
  /** Extra class name */
  className?: string;
}

/**
 * Page header with title, subtitle, and optional action
 */
export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        'md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="mt-3 md:mt-0">{action}</div>}
    </div>
  );
}
