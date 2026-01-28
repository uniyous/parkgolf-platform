import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from './GlassCard';

interface StatsCardProps {
  /** Title of the stat */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Icon to display */
  icon?: LucideIcon;
  /** Change percentage (positive or negative) */
  change?: number;
  /** Change label text */
  changeLabel?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Color variant */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  /** Click handler */
  onClick?: () => void;
  /** Extra class name */
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-[var(--color-surface)] text-[var(--color-primary)]',
    value: 'text-white',
  },
  primary: {
    icon: 'bg-violet-500/20 text-violet-400',
    value: 'text-violet-400',
  },
  success: {
    icon: 'bg-green-500/20 text-green-400',
    value: 'text-green-400',
  },
  warning: {
    icon: 'bg-yellow-500/20 text-yellow-400',
    value: 'text-yellow-400',
  },
  error: {
    icon: 'bg-red-500/20 text-red-400',
    value: 'text-red-400',
  },
};

/**
 * Dashboard statistics card component
 */
export function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel = '전일 대비',
  isLoading = false,
  variant = 'default',
  onClick,
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant];
  const isPositive = change !== undefined && change >= 0;

  if (isLoading) {
    return (
      <GlassCard
        hoverable={!!onClick}
        className={cn(onClick && 'cursor-pointer', className)}
        onClick={onClick}
      >
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-20 bg-white/10 rounded" />
            <div className="w-10 h-10 bg-white/10 rounded-full" />
          </div>
          <div className="h-8 w-24 bg-white/10 rounded mb-2" />
          <div className="h-3 w-16 bg-white/10 rounded" />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      hoverable={!!onClick}
      className={cn(onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
          {title}
        </h3>
        {Icon && (
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', styles.icon)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className={cn('text-3xl font-bold mb-2', styles.value)}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1 text-sm">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
            {isPositive ? '+' : ''}{change}%
          </span>
          <span className="text-[var(--color-text-muted)]">{changeLabel}</span>
        </div>
      )}
    </GlassCard>
  );
}
