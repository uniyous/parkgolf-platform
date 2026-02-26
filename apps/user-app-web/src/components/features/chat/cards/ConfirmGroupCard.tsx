import React from 'react';
import { Users, Clock, MapPin, CreditCard, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConfirmGroupData } from '@/lib/api/chatApi';

interface ConfirmGroupCardProps {
  data: ConfirmGroupData;
  onConfirm?: (paymentMethod: string) => void;
  onCancel?: () => void;
}

export const ConfirmGroupCard: React.FC<ConfirmGroupCardProps> = ({
  data,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 mt-2 space-y-4">
      {/* Header */}
      <div>
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          그룹 예약 ({data.teamCount}팀)
        </h4>
        <div className="flex items-center gap-1 mt-1 text-white/50 text-xs">
          <MapPin className="w-3 h-3" />
          <span>{data.clubName}</span>
          <span className="mx-1">·</span>
          <span>{data.date}</span>
        </div>
      </div>

      {/* Slots */}
      <div className="space-y-1.5">
        {data.slots.map((slot, i) => (
          <div
            key={slot.slotId}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5"
          >
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="text-emerald-400 font-medium">팀{i + 1}</span>
              <Clock className="w-3 h-3" />
              <span>{slot.slotTime}</span>
              <span className="text-white/40">·</span>
              <span>{slot.courseName}</span>
            </div>
            <span className="text-xs text-white/50">
              {slot.price.toLocaleString()}원/인
            </span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="border-t border-white/10 pt-3">
        <div className="flex justify-between text-xs text-white/60">
          <span>최대 참여 인원</span>
          <span>{data.maxParticipants}명</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-white mt-1">
          <span>예상 총액</span>
          <span className="text-emerald-400">{data.totalPrice.toLocaleString()}원</span>
        </div>
      </div>

      {/* Payment Method Buttons */}
      <div className="space-y-2">
        <p className="text-xs text-white/50">결제 방법을 선택해주세요</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onConfirm?.('onsite')}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium',
              'bg-white/10 text-white hover:bg-white/15 transition-colors border border-white/10'
            )}
          >
            <Banknote className="w-4 h-4" />
            현장결제
          </button>
          <button
            onClick={() => onConfirm?.('dutchpay')}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium',
              'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors border border-emerald-500/30'
            )}
          >
            <CreditCard className="w-4 h-4" />
            더치페이
          </button>
        </div>
        <button
          onClick={onCancel}
          className="w-full px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
};
