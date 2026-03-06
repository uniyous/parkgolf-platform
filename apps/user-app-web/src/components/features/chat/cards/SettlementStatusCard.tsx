import React, { useState, useEffect, useRef } from 'react';
import { Users, CheckCircle2, Clock, AlertCircle, CreditCard, Loader2, Timer, Bell, RefreshCw, MapPin, Flag } from 'lucide-react';
import { loadTossPayments, type TossPaymentsInstance } from '@tosspayments/payment-sdk';
import { cn } from '@/lib/utils';
import type { SettlementStatusData } from '@/lib/api/chatApi';
import { CHAT_PAYMENT_CONTEXT_KEY, type ChatPaymentContext } from '@/lib/constants';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

interface SettlementStatusCardProps {
  data: SettlementStatusData;
  currentUserId?: number;
  roomId?: string;
  conversationId?: string;
  onSplitPaymentComplete?: (success: boolean, orderId: string) => void;
  onSendReminder?: () => void;
  onRefresh?: () => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ko-KR').format(price);

/**
 * 진행자(부커) 대시보드 — 전체 정산 현황
 */
const BookerDashboardView: React.FC<{
  data: SettlementStatusData;
  onSendReminder?: () => void;
  onRefresh?: () => void;
}> = ({ data, onSendReminder, onRefresh }) => {
  const allPaid = data.paidCount === data.totalParticipants;
  const progress = data.totalParticipants > 0
    ? Math.round((data.paidCount / data.totalParticipants) * 100)
    : 0;

  // 카운트다운 (expiredAt 기준)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    const expiredAt = data.expiredAt;
    if (!expiredAt) return;

    const calcRemaining = () => {
      const diff = Math.floor((new Date(expiredAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    };

    setRemainingSeconds(calcRemaining());
    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setRemainingSeconds(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [data.expiredAt]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 mt-2 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" />
          {data.teamNumber ? `팀${data.teamNumber} 정산 현황` : '정산 현황'}
        </h4>
        <span className={cn(
          'text-sm font-medium px-2 py-0.5 rounded-full',
          allPaid
            ? 'bg-violet-500/20 text-violet-400'
            : 'bg-yellow-500/20 text-yellow-400'
        )}>
          {allPaid ? '완료' : `${data.paidCount}/${data.totalParticipants}`}
        </span>
      </div>

      {/* Team Info */}
      {data.clubName && (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <MapPin className="w-3 h-3" />
          <span>{data.clubName}</span>
          {data.slotTime && <><span className="text-white/30">·</span><span>{data.slotTime}</span></>}
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-white/10 rounded-full h-1.5">
        <div
          className={cn(
            'h-1.5 rounded-full transition-all duration-500',
            allPaid ? 'bg-violet-500' : 'bg-yellow-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Countdown */}
      {remainingSeconds !== null && remainingSeconds > 0 && !allPaid && (
        <div className="flex items-center justify-center gap-1.5 text-yellow-400">
          <Timer className="w-3.5 h-3.5" />
          <span className="text-sm font-medium">{formatCountdown(remainingSeconds)} 남음</span>
        </div>
      )}

      {/* Amount */}
      <div className="flex justify-between text-sm text-white/60">
        <span>1인당 {formatPrice(data.pricePerPerson)}원</span>
        <span className="text-violet-400 font-medium">
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
            <span className="text-sm text-white/70">{p.userName}</span>
            {p.status === 'PAID' ? (
              <div className="flex items-center gap-1 text-violet-400">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-sm">완료</span>
              </div>
            ) : p.status === 'CANCELLED' ? (
              <div className="flex items-center gap-1 text-red-400">
                <AlertCircle className="w-3 h-3" />
                <span className="text-sm">취소</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-yellow-400">
                <Clock className="w-3 h-3" />
                <span className="text-sm">대기</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      {!allPaid && (onSendReminder || onRefresh) && (
        <div className="flex gap-2 pt-1 border-t border-white/5">
          {onSendReminder && (
            <button
              onClick={onSendReminder}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              리마인더
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              새로고침
            </button>
          )}
        </div>
      )}

      {/* Group Number */}
      {data.groupNumber && (
        <div className="text-center text-sm text-white/30 pt-1 border-t border-white/5">
          {data.groupNumber}
        </div>
      )}
    </div>
  );
};

/**
 * 미결제 참여자 뷰 — 개인 결제 카드
 */
const ParticipantPaymentView: React.FC<{
  participant: SettlementStatusData['participants'][0];
  clubName?: string;
  gameName?: string;
  date?: string;
  slotTime?: string;
  roomId?: string;
  conversationId?: string;
  onPay: (orderId: string) => void;
}> = ({ participant, clubName, gameName, date, slotTime, roomId, conversationId, onPay }) => {
  const [isPaying, setIsPaying] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const tossRef = useRef<TossPaymentsInstance | null>(null);

  // Toss SDK 초기화
  useEffect(() => {
    if (!TOSS_CLIENT_KEY) return;
    let mounted = true;

    (async () => {
      try {
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
        if (mounted) tossRef.current = tossPayments;
      } catch (err) {
        console.error('Toss SDK 초기화 실패:', err);
      }
    })();

    return () => { mounted = false; };
  }, []);

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

  const handlePay = async () => {
    if (!participant.orderId || isPaying || isExpired || !tossRef.current || !roomId) return;
    setIsPaying(true);

    try {
      // sessionStorage에 결제 컨텍스트 저장
      const paymentContext: ChatPaymentContext = {
        roomId,
        conversationId: conversationId || '',
        orderId: participant.orderId,
        amount: participant.amount || 0,
        orderName: '더치페이 결제',
        type: 'split',
      };
      sessionStorage.setItem(CHAT_PAYMENT_CONTEXT_KEY, JSON.stringify(paymentContext));

      // Toss 결제 요청 → redirect
      await tossRef.current.requestPayment('카드', {
        amount: participant.amount || 0,
        orderId: participant.orderId,
        orderName: '더치페이 결제',
        successUrl: `${window.location.origin}/chat/${roomId}`,
        failUrl: `${window.location.origin}/chat/${roomId}?payment=fail`,
      });
    } catch (err: any) {
      setIsPaying(false);
      // 사용자 취소는 무시
      if (err?.code === 'USER_CANCEL' || err?.message?.includes('CANCEL')) return;
    }
  };

  const amount = participant.amount || 0;

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 mt-2 space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-violet-400" />
        <h4 className="text-base font-semibold text-white">결제 요청</h4>
      </div>

      {/* 골프장/코스/날짜/시간 정보 */}
      {(clubName || gameName || date || slotTime) && (
        <div className="space-y-1 text-sm text-white/60">
          {clubName && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-white/40" />
              <span>{clubName}</span>
            </div>
          )}
          {gameName && (
            <div className="flex items-center gap-1.5">
              <Flag className="w-3 h-3 text-white/40" />
              <span>{gameName}</span>
            </div>
          )}
          {(date || slotTime) && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-white/40" />
              <span>{[date, slotTime].filter(Boolean).join(' ')}</span>
            </div>
          )}
        </div>
      )}

      <div className="text-center py-3">
        <p className="text-3xl font-bold text-white">{formatPrice(amount)}원</p>
        <p className="text-sm text-white/50 mt-1">더치페이 결제 금액</p>
      </div>

      {/* 카운트다운 */}
      {remainingSeconds !== null && !isExpired && (
        <div className="flex items-center justify-center gap-1.5 text-yellow-400">
          <Timer className="w-3.5 h-3.5" />
          <span className="text-sm font-medium">{formatTime(remainingSeconds)} 남음</span>
        </div>
      )}

      {isExpired ? (
        <div className="text-center text-sm text-red-400">결제 시간이 만료되었습니다</div>
      ) : (
        <button
          onClick={handlePay}
          disabled={isPaying || !participant.orderId || !tossRef.current}
          className={cn(
            'w-full py-2.5 rounded-lg text-base font-semibold transition-all',
            isPaying || !tossRef.current
              ? 'bg-white/10 text-white/50 cursor-not-allowed'
              : 'bg-violet-500 text-white hover:bg-violet-600 active:scale-[0.98]'
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
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 mt-2 space-y-2">
      <div className="flex items-center justify-center gap-2 text-violet-400">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-base font-semibold">결제 완료</span>
      </div>
      <p className="text-center text-xl font-bold text-white">{formatPrice(amount)}원</p>
    </div>
  );
};

/**
 * SettlementStatusCard — currentUserId 기반 3-view 분기
 */
export const SettlementStatusCard: React.FC<SettlementStatusCardProps> = ({
  data,
  currentUserId,
  roomId,
  conversationId,
  onSplitPaymentComplete,
  onSendReminder,
  onRefresh,
}) => {
  // currentUserId가 없는 경우 → 대시보드
  if (!currentUserId) {
    return <BookerDashboardView data={data} onSendReminder={onSendReminder} onRefresh={onRefresh} />;
  }

  // 부커(진행자)인 경우: 대시보드 + 본인 결제 카드 (참여자이기도 한 경우)
  if (currentUserId === data.bookerId) {
    const myParticipant = data.participants.find((p) => p.userId === currentUserId);
    return (
      <>
        <BookerDashboardView data={data} onSendReminder={onSendReminder} onRefresh={onRefresh} />
        {myParticipant && myParticipant.status === 'PENDING' && (
          <ParticipantPaymentView
            participant={myParticipant}
            clubName={data.clubName}
            gameName={data.gameName}
            date={data.date}
            slotTime={data.slotTime}
            roomId={roomId}
            conversationId={conversationId}
            onPay={(orderId) => onSplitPaymentComplete?.(true, orderId)}
          />
        )}
        {myParticipant && myParticipant.status === 'PAID' && (
          <ParticipantPaidView participant={myParticipant} />
        )}
      </>
    );
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
      clubName={data.clubName}
      gameName={data.gameName}
      date={data.date}
      slotTime={data.slotTime}
      roomId={roomId}
      conversationId={conversationId}
      onPay={(orderId) => onSplitPaymentComplete?.(true, orderId)}
    />
  );
};
