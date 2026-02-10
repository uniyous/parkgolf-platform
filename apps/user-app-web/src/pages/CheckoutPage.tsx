import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadTossPayments, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';
import { formatDate } from '@/lib/formatting';
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

const CHECKOUT_STORAGE_KEY = 'parkgolf_checkout_context';

export const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const paymentMethodsRendered = useRef(false);

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
    if (paymentMethodsRendered.current) return;
    paymentMethodsRendered.current = true;

    let mounted = true;

    const initWidgets = async () => {
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const widgets = tossPayments.widgets({ customerKey: 'ANONYMOUS' });
      widgetsRef.current = widgets;

      await widgets.setAmount({ currency: 'KRW', value: state.amount });

      await Promise.all([
        widgets.renderPaymentMethods({
          selector: '#payment-methods',
          variantKey: 'DEFAULT',
        }),
        widgets.renderAgreement({
          selector: '#payment-agreement',
          variantKey: 'AGREEMENT',
        }),
      ]);

      if (mounted) setIsReady(true);
    };

    initWidgets();
    return () => { mounted = false; };
  }, [state]);

  if (!state) {
    navigate('/bookings');
    return null;
  }

  if (!TOSS_CLIENT_KEY) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <p className="text-white/70 text-lg">결제 설정이 올바르지 않습니다.</p>
      </div>
    );
  }

  const handlePayment = async () => {
    if (!widgetsRef.current || isRequesting) return;
    setIsRequesting(true);

    try {
      await widgetsRef.current.requestPayment({
        orderId: state.orderId,
        orderName: state.orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch {
      setIsRequesting(false);
    }
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

        {/* 토스 결제 위젯 */}
        <div className="glass-card mb-6">
          <div id="payment-methods" className="mb-4" />
          <div id="payment-agreement" />
        </div>

        {/* 결제 버튼 */}
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
      </Container>
    </div>
  );
};
