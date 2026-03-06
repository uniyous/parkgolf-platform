import React from 'react';
import { CheckCircle, Calendar, Users, Banknote } from 'lucide-react';
import type { BookingCompleteData } from '@/lib/api/chatApi';

interface BookingCompleteCardProps {
  data: BookingCompleteData;
}

export const BookingCompleteCard: React.FC<BookingCompleteCardProps> = ({ data }) => {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ko-KR').format(price);

  return (
    <div className="mt-2 bg-violet-500/10 rounded-xl p-4 border border-violet-500/20">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-5 h-5 text-violet-400" />
        <span className="text-lg font-semibold text-violet-400">예약 완료</span>
      </div>

      <div className="space-y-2 text-lg">
        <div className="flex items-center gap-2 text-white/70">
          <span className="text-white/40 text-base">예약번호</span>
          <span className="font-mono text-white">{data.confirmationNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Calendar className="w-3.5 h-3.5 text-white/40" />
          <span>{data.details.date} {data.details.time}</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Users className="w-3.5 h-3.5 text-white/40" />
          <span>{data.details.playerCount}명</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Banknote className="w-3.5 h-3.5 text-white/40" />
          <span>₩{formatPrice(data.details.totalPrice)}</span>
        </div>
      </div>
    </div>
  );
};
