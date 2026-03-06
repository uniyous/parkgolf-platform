import React, { useState } from 'react';
import { MapPin, Calendar, Clock, Users, Banknote, Store, CreditCard, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConfirmBookingData } from '@/lib/api/chatApi';

type PaymentMethod = 'onsite' | 'card' | 'dutchpay';

interface ConfirmBookingCardProps {
  data: ConfirmBookingData;
  onConfirm?: (paymentMethod: PaymentMethod) => void;
  onCancel?: () => void;
  completed?: boolean;
}

export const ConfirmBookingCard: React.FC<ConfirmBookingCardProps> = ({ data, onConfirm, onCancel, completed }) => {
  const isFree = data.price === 0;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(data.groupMode ? 'dutchpay' : 'onsite');

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ko-KR').format(price);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const day = days[date.getDay()];
    return `${dateStr} (${day})`;
  };

  return (
    <div className="mt-2 bg-violet-500/10 rounded-xl p-4 border border-violet-500/20">
        <div className="text-lg font-semibold text-white mb-3">
          {data.groupMode ? `팀${data.teamNumber} 예약 정보 확인` : '예약 정보 확인'}
        </div>

        <div className="space-y-2 text-lg">
          <div className="flex items-center gap-2 text-white/70">
            <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>{data.clubName}</span>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>{formatDate(data.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <Clock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>{data.time}</span>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <Users className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>{data.playerCount}명</span>
          </div>
          {data.groupMode && data.members && (
            <div className="flex items-center gap-2 text-white/60 text-base pl-5">
              {data.members.map((m) => m.userName).join(', ')}
            </div>
          )}
          <div className="flex items-center gap-2 text-white/70">
            <Banknote className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>
              {isFree ? '무료' : `\u20A9${formatPrice(data.price)}`}
              {data.groupMode && data.pricePerPerson ? ` (1인 ${formatPrice(data.pricePerPerson)}원)` : ''}
            </span>
          </div>
        </div>

        {/* 결제방법 선택 (유료 + 활성 상태일 때만) */}
        {!isFree && !completed && (
          <div className="mt-3">
            <div className="text-base text-white/50 mb-2">결제방법</div>
            <div className={cn('flex gap-2', data.groupMode && 'flex-wrap')}>
              <button
                onClick={() => setPaymentMethod('onsite')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-base font-medium transition-colors border',
                  paymentMethod === 'onsite'
                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-400'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10',
                )}
              >
                <Store className="w-3.5 h-3.5" />
                현장결제
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-base font-medium transition-colors border',
                  paymentMethod === 'card'
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10',
                )}
              >
                <CreditCard className="w-3.5 h-3.5" />
                카드결제
              </button>
              {data.groupMode && (
                <button
                  onClick={() => setPaymentMethod('dutchpay')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-base font-medium transition-colors border',
                    paymentMethod === 'dutchpay'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10',
                  )}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  더치페이
                </button>
              )}
            </div>
          </div>
        )}

        {!completed && (onConfirm || onCancel) && (
          <div className="flex gap-2 mt-4">
            {onCancel && (
              <button
                onClick={onCancel}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg text-lg font-medium transition-colors',
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
                  'flex-1 px-3 py-2 rounded-lg text-lg font-medium transition-colors',
                  'bg-violet-500 text-white hover:bg-violet-600',
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
