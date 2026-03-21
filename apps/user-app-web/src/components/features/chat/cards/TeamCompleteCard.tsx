import React from 'react';
import { CheckCircle2, MapPin, Clock, Users, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamCompleteData } from '@/lib/api/chatApi';

interface TeamCompleteCardProps {
  data: TeamCompleteData;
  onNextTeam?: () => void;
  onFinish?: () => void;
  completed?: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ko-KR').format(price);

export const TeamCompleteCard: React.FC<TeamCompleteCardProps> = ({
  data,
  onNextTeam,
  onFinish,
  completed,
}) => {
  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 mt-2 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-violet-400" />
        <h4 className="text-lg font-semibold text-white">
          팀{data.teamNumber} 예약 완료
        </h4>
      </div>

      {/* Booking Info */}
      <div className="space-y-1.5 text-base">
        <div className="flex items-center gap-2 text-white/70">
          <MapPin className="w-3 h-3 text-violet-400 shrink-0" />
          <span>{data.clubName}</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Clock className="w-3 h-3 text-violet-400 shrink-0" />
          <span>{data.date} {data.slotTime} · {data.gameName}</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Users className="w-3 h-3 text-violet-400 shrink-0" />
          <span>{data.participants.map((p) => p.userName).join(', ')}</span>
        </div>
      </div>

      {/* Price & Booking Number */}
      <div className="flex items-center justify-between border-t border-white/10 pt-2">
        <span className="text-base text-white/50">
          {data.paymentMethod === 'dutchpay' ? '더치페이' : data.paymentMethod === 'card' ? '카드결제' : '현장결제'}
        </span>
        <span className="text-lg font-semibold text-violet-400">
          {formatPrice(data.totalPrice)}원
        </span>
      </div>
      <div className="text-center text-base text-white/30">
        {data.bookingNumber}
      </div>

      {/* Actions */}
      {!completed && (onNextTeam || onFinish) && (
        <div className="flex gap-2 pt-1">
          {onFinish && (
            <button
              onClick={onFinish}
              className={cn(
                'flex-1 px-3 py-2.5 rounded-lg text-base font-medium transition-colors',
                data.hasMoreTeams
                  ? 'bg-white/10 text-white/70 hover:bg-white/20'
                  : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
              )}
            >
              종료
            </button>
          )}
          {data.hasMoreTeams && onNextTeam && (
            <button
              onClick={onNextTeam}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors"
            >
              다음 팀 예약
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
