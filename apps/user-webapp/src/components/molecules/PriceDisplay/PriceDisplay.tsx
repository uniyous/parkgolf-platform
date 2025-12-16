import React from 'react';
import { Text } from '../../atoms/Text';

interface PriceDisplayProps {
  price: number;
  size?: 'small' | 'medium' | 'large';
  showUnit?: boolean;
  unit?: string;
  color?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  size = 'medium',
  showUnit = true,
  unit = '/시간',
  color = '#10b981',
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { fontSize: '14px', fontWeight: '600' };
      case 'large':
        return { fontSize: '24px', fontWeight: '700' };
      default:
        return { fontSize: '18px', fontWeight: '700' };
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
      <span style={{ 
        color,
        ...getSizeStyles()
      }}>
        {formatPrice(price)}
      </span>
      {showUnit && (
        <Text 
          variant="caption" 
          style={{ 
            color: '#6b7280',
            fontSize: size === 'large' ? '14px' : '12px'
          }}
        >
          {unit}
        </Text>
      )}
    </div>
  );
};