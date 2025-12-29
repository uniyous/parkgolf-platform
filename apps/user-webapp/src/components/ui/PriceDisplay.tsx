import React from 'react';
import { cn } from '@/lib/utils';

interface PriceDisplayProps {
  price: number;
  size?: 'sm' | 'md' | 'lg';
  showUnit?: boolean;
  unit?: string;
  className?: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(price);
};

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
      <span className={cn('text-emerald-600', sizeStyles[size])}>
        {formatPrice(price)}
      </span>
      {showUnit && (
        <span className={cn('text-gray-500', unitSizeStyles[size])}>
          {unit}
        </span>
      )}
    </div>
  );
};
PriceDisplay.displayName = 'PriceDisplay';

export { PriceDisplay };
