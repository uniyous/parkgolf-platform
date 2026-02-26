import React, { useState } from 'react';
import { MapPin, Calendar, Clock, Users, Banknote, Store, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConfirmBookingData } from '@/lib/api/chatApi';

interface ConfirmBookingCardProps {
  data: ConfirmBookingData;
  onConfirm?: (paymentMethod: 'onsite' | 'card') => void;
  onCancel?: () => void;
}

export const ConfirmBookingCard: React.FC<ConfirmBookingCardProps> = ({ data, onConfirm, onCancel }) => {
  const isFree = data.price === 0;
  const [paymentMethod, setPaymentMethod] = useState<'onsite' | 'card'>('onsite');

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ko-KR').format(price);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const day = days[date.getDay()];
    return `${dateStr} (${day})`;
  };

  return (
    <div className="mt-2 bg-white/5 rounded-xl p-4 border border-emerald-500/20">
      <div className="text-sm font-semibold text-white mb-3">예약 정보 확인</div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-white/70">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{data.clubName}</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{formatDate(data.date)}</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{data.time}</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{data.playerCount}명</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Banknote className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{isFree ? '무료' : `\u20A9${formatPrice(data.price)}`}</span>
        </div>
      </div>

      {/* 결제방법 선택 (유료일 때만) */}
      {!isFree && (
        <div className="mt-3">
          <div className="text-xs text-white/50 mb-2">결제방법</div>
          <div className="flex gap-2">
            <button
              onClick={() => setPaymentMethod('onsite')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border',
                paymentMethod === 'onsite'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10',
              )}
            >
              <Store className="w-3.5 h-3.5" />
              현장결제
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border',
                paymentMethod === 'card'
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10',
              )}
            >
              <CreditCard className="w-3.5 h-3.5" />
              카드결제
            </button>
          </div>
        </div>
      )}

      {(onConfirm || onCancel) && (
        <div className="flex gap-2 mt-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-white/10 text-white/70 hover:bg-white/20',
              )}
            >
              취소
            </button>
          )}
          {onConfirm && (
            <button
              onClick={() => onConfirm(isFree ? 'onsite' : paymentMethod)}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-emerald-500 text-white hover:bg-emerald-600',
              )}
            >
              예약 확인
            </button>
          )}
        </div>
      )}
    </div>
  );
};
