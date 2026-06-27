import React from 'react';
import { cn } from '@/lib/utils';
import { CHAT_CARD_WIDTH_COMPACT } from './cardStyles';

interface BookingFailedData {
  reason?: string;
}

interface BookingFailedCardProps {
  data: BookingFailedData;
  onRetry?: () => void;
}

export const BookingFailedCard: React.FC<BookingFailedCardProps> = ({ data, onRetry }) => {
  return (
    <div className={cn('mt-2 bg-red-500/10 rounded-xl p-3 border border-red-500/20', CHAT_CARD_WIDTH_COMPACT)}>
      <div className="text-sm text-red-400 mb-2">❌ {data.reason || '예약에 실패했습니다'}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-white/60 bg-white/10 px-3 py-1 rounded-lg hover:bg-white/20 transition-colors"
        >
          다시 검색
        </button>
      )}
    </div>
  );
};
