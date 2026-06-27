import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Optional action element (right side) */
  action?: React.ReactNode;
  /** Extra class name */
  className?: string;
}

/**
 * Section header with icon and title
 */
export function SectionHeader({
  title,
  icon: Icon,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('section-header justify-between', className)}>
      <div className="flex items-center gap-2">
        {Icon && (
          <div className="section-header-icon">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <span>{title}</span>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
