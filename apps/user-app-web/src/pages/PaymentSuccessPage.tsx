import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConfirmPaymentMutation } from '@/hooks/queries/payment';
import { paymentApi } from '@/lib/api/paymentApi';
import { showErrorToast } from '@/lib/toast';
import { translateErrorMessage } from '@/types/common';
import { CHECKOUT_STORAGE_KEY } from './CheckoutPage';
import { Container, SubPageHeader } from '@/components/layout';
import { Button } from '../components';

export const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const confirmMutation = useConfirmPaymentMutation();
  const confirmedRef = useRef(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const paymentKey = searchParams.get('paymentKey') ?? '';
  const orderId = searchParams.get('orderId') ?? '';
  const amount = Number(searchParams.get('amount') ?? '0');

  const navigateToComplete = useCallback(() => {
    const stored = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    const ctx = stored ? JSON.parse(stored) : null;
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);

    navigate('/booking-complete', {
      state: ctx
        ? {
            booking: ctx.booking,
            game: ctx.game,
            timeSlot: ctx.timeSlot,
            date: ctx.date,
            playerCount: ctx.playerCount,
            paymentMethod: { id: 'card', name: '카드결제', icon: '💳', description: '신용/체크카드 결제' },
          }
        : undefined,
      replace: true,
    });
  }, [navigate]);

  const checkPaymentStatus = useCallback(async () => {
    if (!orderId) return;
    setIsCheckingStatus(true);
    try {
      const payment = await paymentApi.getPaymentByOrderId(orderId);
      if (payment.status === 'DONE') {
        navigateToComplete();
        return;
      }
      if (payment.status === 'IN_PROGRESS') {
        // 아직 처리 중 — 잠시 후 다시 확인
        await new Promise((r) => setTimeout(r, 2000));
        const retry = await paymentApi.getPaymentByOrderId(orderId);
        if (retry.status === 'DONE') {
          navigateToComplete();
          return;
        }
      }
      // READY 또는 ABORTED — 진짜 실패
    } catch {
      // 조회 실패 — 에러 상태 유지
    } finally {
      setIsCheckingStatus(false);
    }
  }, [orderId, navigateToComplete]);

  const handleConfirm = useCallback(() => {
    confirmMutation.mutate(
      { paymentKey, orderId, amount },
      {
        onSuccess: navigateToComplete,
        onError: () => {
          // confirm 실패 시 결제 상태 조회로 fallback
          checkPaymentStatus();
        },
      },
    );
  }, [paymentKey, orderId, amount, confirmMutation, navigateToComplete, checkPaymentStatus]);

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) return;
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    handleConfirm();
  }, [paymentKey, orderId, amount, handleConfirm]);

  const isLoading = confirmMutation.isPending || isCheckingStatus;

  if (confirmMutation.isError && !isCheckingStatus) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)]">
        <SubPageHeader title="결제 승인" onBack={false} />
        <Container className="py-8">
          <div className="glass-card text-center">
            <div className="w-20 h-20 bg-red-400/30 border-2 border-red-400/50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              ❌
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">결제 승인에 실패했습니다</h2>
            <p className="text-white/70 mb-8">
              {confirmMutation.error instanceof Error
                ? translateErrorMessage(confirmMutation.error.message)
                : '알 수 없는 오류가 발생했습니다.'}
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  confirmedRef.current = false;
                  handleConfirm();
                }}
                loading={confirmMutation.isPending}
                variant="glass"
                size="lg"
              >
                다시 시도
              </Button>
              <Button
                onClick={() => navigate('/my-bookings', { replace: true })}
                variant="glass"
                size="lg"
              >
                예약 목록
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-green-400/40 border-t-green-400 rounded-full animate-spin mx-auto mb-6" />
        <p className="text-white/80 text-lg">
          {isLoading ? '결제를 확인하고 있습니다...' : '처리 중...'}
        </p>
      </div>
    </div>
  );
};
