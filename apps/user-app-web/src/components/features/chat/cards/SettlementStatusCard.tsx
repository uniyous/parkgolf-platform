import React from 'react';
import { Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SettlementStatusData } from '@/lib/api/chatApi';

interface SettlementStatusCardProps {
  data: SettlementStatusData;
}

export const SettlementStatusCard: React.FC<SettlementStatusCardProps> = ({ data }) => {
  const allPaid = data.paidCount === data.totalParticipants;
  const progress = data.totalParticipants > 0
    ? Math.round((data.paidCount / data.totalParticipants) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 mt-2 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          정산 현황
        </h4>
        <span className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-full',
          allPaid
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-yellow-500/20 text-yellow-400'
        )}>
          {allPaid ? '완료' : `${data.paidCount}/${data.totalParticipants}`}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 rounded-full h-1.5">
        <div
          className={cn(
            'h-1.5 rounded-full transition-all duration-500',
            allPaid ? 'bg-emerald-500' : 'bg-yellow-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Amount */}
      <div className="flex justify-between text-xs text-white/60">
        <span>1인당 {data.pricePerPerson.toLocaleString()}원</span>
        <span className="text-emerald-400 font-medium">
          총 {data.totalPrice.toLocaleString()}원
        </span>
      </div>

      {/* Participants */}
      <div className="space-y-1">
        {data.participants.map((p) => (
          <div
            key={p.userId}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.02]"
          >
            <span className="text-xs text-white/70">{p.userName}</span>
            {p.status === 'PAID' ? (
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-xs">완료</span>
              </div>
            ) : p.status === 'CANCELLED' ? (
              <div className="flex items-center gap-1 text-red-400">
                <AlertCircle className="w-3 h-3" />
                <span className="text-xs">취소</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-yellow-400">
                <Clock className="w-3 h-3" />
                <span className="text-xs">대기</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Group Number */}
      <div className="text-center text-xs text-white/30 pt-1 border-t border-white/5">
        {data.groupNumber}
      </div>
    </div>
  );
};
