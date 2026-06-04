import React from 'react';
import { cn } from '@/lib/utils';
import { CHAT_CARD_WIDTH_COMPACT } from './cardStyles';

interface BookingExpiredData {
  reason?: string;
}

interface BookingExpiredCardProps {
  data: BookingExpiredData;
}

export const BookingExpiredCard: React.FC<BookingExpiredCardProps> = ({ data }) => {
  return (
    <div className={cn('mt-2 bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20', CHAT_CARD_WIDTH_COMPACT)}>
      <div className="text-sm text-yellow-400">⏰ {data.reason || '결제 시간이 초과되었습니다'}</div>
      <div className="text-xs text-white/50 mt-1">다시 예약해 주세요</div>
    </div>
  );
};
