import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button label */
  actionLabel?: string;
  /** Action button callback */
  onAction?: () => void;
  /** Extra class name */
  className?: string;
}

/**
 * Empty state placeholder component
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('empty-state', className)}>
      <div className="icon-container icon-container-lg mb-4 opacity-50">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-text-tertiary)] mb-4 max-w-xs">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
