import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import { formatDate } from '@/lib/formatting';
import { showErrorToast } from '@/lib/toast';
import { Button } from '../components';
import { Container, SubPageHeader } from '@/components/layout';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

interface CheckoutState {
  orderId: string;
  amount: number;
  orderName: string;
  booking: {
    id: number;
    bookingNumber: string;
    totalPrice: number;
    [key: string]: unknown;
  };
  game: {
    id: number;
    name: string;
    clubName?: string;
    clubLocation?: string;
    duration?: number;
    basePrice?: number;
    pricePerPerson?: number;
    courses?: Array<{ courseName: string }>;
    [key: string]: unknown;
  };
  timeSlot: {
    id: number;
    startTime: string;
    price?: number;
    isPremium?: boolean;
    [key: string]: unknown;
  };
  date: string;
  playerCount: number;
}

export const CHECKOUT_STORAGE_KEY = 'parkgolf_checkout_context';

export const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const tossRef = useRef<Awaited<ReturnType<typeof loadTossPayments>> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const checkoutState = location.state as CheckoutState | null;

  useEffect(() => {
    if (checkoutState) {
      sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(checkoutState));
    }
  }, [checkoutState]);

  const state: CheckoutState | null = checkoutState
    ?? (() => {
      const stored = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    })();

  useEffect(() => {
    if (!state || !TOSS_CLIENT_KEY) return;

    let mounted = true;

    const initToss = async () => {
      try {
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
        if (mounted) {
          tossRef.current = tossPayments;
          setIsReady(true);
        }
      } catch (error) {
        console.error('Toss SDK initialization failed:', error);
        if (mounted) {
          setInitError('결제 모듈을 불러오지 못했습니다. 다시 시도해 주세요.');
        }
      }
    };

    initToss();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state) {
    return <Navigate to="/bookings" replace />;
  }

  if (!TOSS_CLIENT_KEY) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <p className="text-white/70 text-lg">결제 설정이 올바르지 않습니다.</p>
      </div>
    );
  }

  const handlePayment = async () => {
    if (!tossRef.current || isRequesting) return;
    setIsRequesting(true);

    try {
      await tossRef.current.requestPayment('카드', {
        amount: state.amount,
        orderId: state.orderId,
        orderName: state.orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message && !message.includes('CANCEL')) {
        showErrorToast('결제 요청 실패', '결제 요청 중 오류가 발생했습니다.');
      }
      setIsRequesting(false);
    }
  };

  const handleRetryInit = () => {
    setInitError(null);
    window.location.reload();
  };

  const { game, timeSlot, date, playerCount, amount } = state;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <SubPageHeader title="결제하기" />
      <Container className="py-6">
        {/* 주문 요약 */}
        <div className="glass-card mb-6">
          <h3 className="text-lg font-bold text-white mb-4">주문 요약</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-white/80">
              <span>골프장</span>
              <span className="font-medium text-white">{game.clubName || game.name}</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>날짜</span>
              <span className="font-medium text-white">{formatDate(date)}</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>시간</span>
              <span className="font-medium text-white">{timeSlot.startTime}</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>인원</span>
              <span className="font-medium text-white">{playerCount}명</span>
            </div>
            <div className="border-t border-white/20 pt-3 flex justify-between">
              <span className="text-lg font-semibold text-white">총 결제금액</span>
              <span className="text-lg font-bold text-green-300">
                {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)}
              </span>
            </div>
          </div>
        </div>

        {/* 초기화 에러 */}
        {initError ? (
          <div className="glass-card mb-6 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-white/80 mb-6">{initError}</p>
            <Button onClick={handleRetryInit} variant="glass" size="lg">
              다시 시도
            </Button>
          </div>
        ) : (
          /* 결제 버튼 */
          <Button
            onClick={handlePayment}
            disabled={!isReady || isRequesting}
            loading={isRequesting}
            variant="glass"
            size="lg"
            className={`w-full h-16 text-xl rounded-2xl ${
              isReady && !isRequesting
                ? '!bg-white/90 hover:!bg-white !text-slate-800'
                : '!bg-white/20 !text-white/50 cursor-not-allowed'
            }`}
          >
            {isRequesting
              ? '결제 요청 중...'
              : `${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)} 결제하기`}
          </Button>
        )}
      </Container>
    </div>
  );
};
