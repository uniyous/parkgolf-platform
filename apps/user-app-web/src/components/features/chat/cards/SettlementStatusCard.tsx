import React, { useState, useEffect } from 'react';
import { Users, CheckCircle2, Clock, AlertCircle, CreditCard, Loader2, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SettlementStatusData } from '@/lib/api/chatApi';

interface SettlementStatusCardProps {
  data: SettlementStatusData;
  currentUserId?: number;
  onSplitPaymentComplete?: (success: boolean, orderId: string) => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ko-KR').format(price);

/**
 * 진행자(부커) 대시보드 — 전체 정산 현황
 */
const BookerDashboardView: React.FC<{ data: SettlementStatusData }> = ({ data }) => {
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
        <span>1인당 {formatPrice(data.pricePerPerson)}원</span>
        <span className="text-emerald-400 font-medium">
          총 {formatPrice(data.totalPrice)}원
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

/**
 * 미결제 참여자 뷰 — 개인 결제 카드
 */
const ParticipantPaymentView: React.FC<{
  participant: SettlementStatusData['participants'][0];
  onPay: (orderId: string) => void;
}> = ({ participant, onPay }) => {
  const [isPaying, setIsPaying] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // 카운트다운 (expiredAt 기준)
  useEffect(() => {
    if (!participant.expiredAt) return;

    const calcRemaining = () => {
      const diff = Math.floor((new Date(participant.expiredAt!).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    };

    setRemainingSeconds(calcRemaining());

    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        setIsExpired(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [participant.expiredAt]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handlePay = () => {
    if (!participant.orderId || isPaying || isExpired) return;
    setIsPaying(true);
    // TODO: Toss 결제 위젯 연동 → 현재 placeholder로 즉시 성공
    onPay(participant.orderId);
  };

  const amount = participant.amount || 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 mt-2 space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-emerald-400" />
        <h4 className="text-sm font-semibold text-white">결제 요청</h4>
      </div>

      <div className="text-center py-3">
        <p className="text-2xl font-bold text-white">{formatPrice(amount)}원</p>
        <p className="text-xs text-white/50 mt-1">더치페이 결제 금액</p>
      </div>

      {/* 카운트다운 */}
      {remainingSeconds !== null && !isExpired && (
        <div className="flex items-center justify-center gap-1.5 text-yellow-400">
          <Timer className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{formatTime(remainingSeconds)} 남음</span>
        </div>
      )}

      {isExpired ? (
        <div className="text-center text-xs text-red-400">결제 시간이 만료되었습니다</div>
      ) : (
        <button
          onClick={handlePay}
          disabled={isPaying || !participant.orderId}
          className={cn(
            'w-full py-2.5 rounded-lg text-sm font-semibold transition-all',
            isPaying
              ? 'bg-white/10 text-white/50 cursor-not-allowed'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]'
          )}
        >
          {isPaying ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              결제 처리 중...
            </span>
          ) : (
            '결제하기'
          )}
        </button>
      )}
    </div>
  );
};

/**
 * 결제완료 참여자 뷰
 */
const ParticipantPaidView: React.FC<{
  participant: SettlementStatusData['participants'][0];
}> = ({ participant }) => {
  const amount = participant.amount || 0;

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 mt-2 space-y-2">
      <div className="flex items-center justify-center gap-2 text-emerald-400">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-semibold">결제 완료</span>
      </div>
      <p className="text-center text-lg font-bold text-white">{formatPrice(amount)}원</p>
    </div>
  );
};

/**
 * SettlementStatusCard — currentUserId 기반 3-view 분기
 */
export const SettlementStatusCard: React.FC<SettlementStatusCardProps> = ({
  data,
  currentUserId,
  onSplitPaymentComplete,
}) => {
  // currentUserId가 없거나 부커인 경우 → 대시보드
  if (!currentUserId || currentUserId === data.bookerId) {
    return <BookerDashboardView data={data} />;
  }

  // 참여자 찾기
  const myParticipant = data.participants.find((p) => p.userId === currentUserId);

  if (!myParticipant) {
    // 참여자 목록에 없으면 대시보드 폴백
    return <BookerDashboardView data={data} />;
  }

  if (myParticipant.status === 'PAID') {
    return <ParticipantPaidView participant={myParticipant} />;
  }

  return (
    <ParticipantPaymentView
      participant={myParticipant}
      onPay={(orderId) => onSplitPaymentComplete?.(true, orderId)}
    />
  );
};
