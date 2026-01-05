import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatting';

interface PriceDisplayProps {
  price: number;
  size?: 'sm' | 'md' | 'lg';
  showUnit?: boolean;
  unit?: string;
  className?: string;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  size = 'md',
  showUnit = true,
  unit = '/시간',
  className,
}) => {
  const sizeStyles = {
    sm: 'text-sm font-semibold',
    md: 'text-lg font-bold',
    lg: 'text-2xl font-bold',
  };

  const unitSizeStyles = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <div className={cn('flex items-baseline gap-1', className)}>
      <span className={cn('text-white', sizeStyles[size])}>
        {formatCurrency(price)}
      </span>
      {showUnit && (
        <span className={cn('text-white/60', unitSizeStyles[size])}>
          {unit}
        </span>
      )}
    </div>
  );
};
PriceDisplay.displayName = 'PriceDisplay';

export { PriceDisplay };
