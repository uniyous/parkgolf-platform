import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CreditCard, MapPin, Calendar, Clock, Users, Banknote, Timer, Loader2 } from 'lucide-react';
import { loadTossPayments, type TossPayments } from '@tosspayments/payment-sdk';
import { cn } from '@/lib/utils';
import type { PaymentCardData } from '@/lib/api/chatApi';
import { paymentApi } from '@/lib/api/paymentApi';
import { CHAT_PAYMENT_CONTEXT_KEY, type ChatPaymentContext } from '@/lib/constants';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

interface PaymentCardProps {
  data: PaymentCardData;
  roomId?: string;
  conversationId?: string;
  onPaymentComplete?: (success: boolean) => void;
}

const PAYMENT_TIMEOUT_SECONDS = 10 * 60; // 10분

export const PaymentCard: React.FC<PaymentCardProps> = ({ data, roomId, conversationId, onPaymentComplete }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(PAYMENT_TIMEOUT_SECONDS);
  const [isPaying, setIsPaying] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const tossRef = useRef<TossPayments | null>(null);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ko-KR').format(price);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const day = days[date.getDay()];
    return `${dateStr} (${day})`;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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

  // 카운트다운 타이머
  useEffect(() => {
    if (isExpired || isPaying) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExpired(true);
          onPaymentComplete?.(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExpired, isPaying, onPaymentComplete]);

  const handlePayment = useCallback(async () => {
    if (isPaying || isExpired || !tossRef.current || !roomId) return;
    setIsPaying(true);

    try {
      // orderId: 원샷 처리로 이미 발급된 경우 바로 사용, 없으면 fallback 호출
      let orderId = data.orderId;
      if (!orderId) {
        const prepared = await paymentApi.preparePayment({
          bookingId: data.bookingId,
          amount: data.amount,
          orderName: data.orderName,
        });
        orderId = prepared.orderId;
      }

      // sessionStorage에 결제 컨텍스트 저장
      const paymentContext: ChatPaymentContext = {
        roomId,
        conversationId: conversationId || '',
        orderId: orderId!,
        amount: data.amount,
        orderName: data.orderName,
        type: 'single',
      };
      sessionStorage.setItem(CHAT_PAYMENT_CONTEXT_KEY, JSON.stringify(paymentContext));

      // Toss 결제 요청 → redirect
      await tossRef.current.requestPayment('카드', {
        amount: data.amount,
        orderId: orderId!,
        orderName: data.orderName,
        successUrl: `${window.location.origin}/chat/${roomId}`,
        failUrl: `${window.location.origin}/chat/${roomId}?payment=fail`,
      });
    } catch (err: any) {
      setIsPaying(false);
      // 사용자 취소는 무시
      if (err?.code === 'USER_CANCEL' || err?.message?.includes('CANCEL')) return;
      onPaymentComplete?.(false);
    }
  }, [isPaying, isExpired, data, roomId, conversationId, onPaymentComplete]);

  const handleCancel = useCallback(() => {
    onPaymentComplete?.(false);
  }, [onPaymentComplete]);

  const isUrgent = remainingSeconds < 60;

  return (
    <div className="mt-2 bg-gradient-to-br from-violet-500/10 to-purple-900/20 rounded-xl border border-violet-500/30 shadow-lg shadow-violet-500/10 overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-violet-400 to-purple-500" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">카드결제</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-white/70">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{data.clubName}</span>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{formatDate(data.date)} {data.time}</span>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{data.playerCount}명</span>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <Banknote className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-semibold text-white">{'\u20A9'}{formatPrice(data.amount)}</span>
          </div>
        </div>

        {/* 타이머 */}
        <div className={cn(
          'flex items-center gap-2 mt-3 px-3 py-2 rounded-lg text-xs',
          isExpired
            ? 'bg-red-500/10 text-red-400'
            : isUrgent
              ? 'bg-yellow-500/10 text-yellow-400'
              : 'bg-white/5 text-white/50',
        )}>
          <Timer className="w-3.5 h-3.5 shrink-0" />
          {isExpired ? (
            <span>결제 시간이 만료되었습니다</span>
          ) : (
            <span>결제 제한시간: {formatTime(remainingSeconds)} 남음</span>
          )}
        </div>

        {/* 버튼 */}
        {!isExpired && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCancel}
              disabled={isPaying}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-white/10 text-white/70 hover:bg-white/20',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              예약 취소
            </button>
            <button
              onClick={handlePayment}
              disabled={isPaying || !tossRef.current}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-blue-500 text-white hover:bg-blue-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isPaying ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  결제 중...
                </span>
              ) : (
                '결제하기'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
