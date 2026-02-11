import React, { useState, useEffect, useRef } from 'react';
import { useBooking } from '../hooks/useBooking';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import type { Game, GameTimeSlot } from '@/lib/api/gameApi';
import { formatDate } from '@/lib/formatting';
import { showErrorToast } from '@/lib/toast';
import { translateErrorMessage } from '@/types/common';
import { Button, Checkbox, PriceDisplay } from '../components';
import { Container, SubPageHeader } from '@/components/layout';
import { SIMPLE_PAYMENT_METHODS, PAYMENT_CONTEXT_STORAGE_KEY } from '@/lib/constants';
import type { PaymentSessionContext } from '@/lib/constants';
import { usePreparePaymentMutation } from '@/hooks/queries/payment';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

interface BookingState {
  game: Game;
  timeSlot: GameTimeSlot;
  date: string;
}

export const BookingDetailPage: React.FC = () => {
  const { user } = useAuth();
  const { createBooking, isCreating } = useBooking();
  const preparePaymentMutation = usePreparePaymentMutation();
  const location = useLocation();
  const navigate = useNavigate();
  const bookingState = location.state as BookingState;

  const [playerCount, setPlayerCount] = useState(2);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const tossRef = useRef<Awaited<ReturnType<typeof loadTossPayments>> | null>(null);
  const [tossReady, setTossReady] = useState(false);

  // Toss SDK 초기화
  useEffect(() => {
    if (!TOSS_CLIENT_KEY) return;
    let mounted = true;

    const initToss = async () => {
      try {
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
        if (mounted) {
          tossRef.current = tossPayments;
          setTossReady(true);
        }
      } catch (error) {
        console.error('Toss SDK initialization failed:', error);
      }
    };

    initToss();
    return () => { mounted = false; };
  }, []);

  if (!bookingState) {
    return <Navigate to="/bookings" replace />;
  }

  const { game, timeSlot, date } = bookingState;

  // 가용 인원 계산 (타임슬롯의 availablePlayers 또는 maxPlayers - bookedPlayers)
  const maxPlayers = timeSlot.maxPlayers ?? timeSlot.maxCapacity ?? game.maxPlayers ?? 4;
  const bookedPlayers = timeSlot.bookedPlayers ?? timeSlot.currentBookings ?? 0;
  const availablePlayers = timeSlot.availablePlayers ?? (maxPlayers - bookedPlayers);

  // 선택한 인원수가 가용 인원을 초과하면 조정
  useEffect(() => {
    if (playerCount > availablePlayers) {
      setPlayerCount(Math.max(1, availablePlayers));
    }
  }, [availablePlayers, playerCount]);

  const pricePerPerson = timeSlot.price || game.basePrice || game.pricePerPerson || 0;
  const totalPrice = pricePerPerson * playerCount;

  const canProceed = selectedPaymentMethod && agreeToTerms &&
    (selectedPaymentMethod !== 'card' || tossReady);

  const isProcessing = isCreating || preparePaymentMutation.isPending;

  const handlePayment = async () => {
    if (!canProceed || !user) return;

    try {
      // 카드결제 재시도: 이전 결제 시도에서 돌아온 경우 기존 예약으로 재시도
      if (selectedPaymentMethod === 'card') {
        const existingRaw = sessionStorage.getItem(PAYMENT_CONTEXT_STORAGE_KEY);
        if (existingRaw) {
          try {
            const ctx: PaymentSessionContext = JSON.parse(existingRaw);
            if (ctx.booking && ctx.orderId &&
                ctx.game?.id === game.id && ctx.timeSlot?.id === timeSlot.id) {
              await tossRef.current!.requestPayment('카드', {
                amount: ctx.amount,
                orderId: ctx.orderId,
                orderName: ctx.orderName,
                successUrl: `${window.location.origin}/booking-complete`,
                failUrl: `${window.location.origin}/booking-complete`,
              });
              return;
            }
          } catch {
            sessionStorage.removeItem(PAYMENT_CONTEXT_STORAGE_KEY);
          }
        }
      }

      const bookingData = {
        gameId: game.id,
        gameTimeSlotId: timeSlot.id,
        bookingDate: date,
        playerCount,
        userEmail: user.email,
        userName: user.name ?? undefined,
        userPhone: user.phone || undefined,
        paymentMethod: selectedPaymentMethod,
      };

      const result = await createBooking(bookingData);

      if (!result.success || !result.data) {
        const rawMessage = result.error instanceof Error
          ? result.error.message
          : '알 수 없는 오류가 발생했습니다.';
        showErrorToast('예약 생성에 실패했습니다', translateErrorMessage(rawMessage));
        return;
      }

      const booking = result.data;

      if (selectedPaymentMethod === 'onsite') {
        navigate('/booking-complete', {
          state: {
            booking,
            game,
            timeSlot,
            date,
            playerCount,
            paymentMethod: SIMPLE_PAYMENT_METHODS.find(p => p.id === selectedPaymentMethod),
          }
        });
      } else {
        // 카드결제: preparePayment → sessionStorage → Toss requestPayment
        const orderName = `${game.clubName || game.name} - ${playerCount}명`;
        const prepareResult = await preparePaymentMutation.mutateAsync({
          amount: totalPrice,
          orderName,
          bookingId: booking.id,
        });

        // sessionStorage에 결제 컨텍스트 저장 (리다이렉트 복귀 시 사용)
        const paymentContext: PaymentSessionContext = {
          orderId: prepareResult.orderId,
          amount: prepareResult.amount,
          orderName: prepareResult.orderName,
          booking,
          game,
          timeSlot,
          date,
          playerCount,
        };
        sessionStorage.setItem(PAYMENT_CONTEXT_STORAGE_KEY, JSON.stringify(paymentContext));

        // Toss SDK 결제 요청 (리다이렉트 방식)
        await tossRef.current!.requestPayment('카드', {
          amount: prepareResult.amount,
          orderId: prepareResult.orderId,
          orderName: prepareResult.orderName,
          successUrl: `${window.location.origin}/booking-complete`,
          failUrl: `${window.location.origin}/booking-complete`,
        });
      }
    } catch (error) {
      console.error('Booking/Payment failed:', error);
      const message = error instanceof Error ? error.message : '';
      // 토스 SDK 사용자 취소는 무시
      if (message && message.includes('CANCEL')) {
        sessionStorage.removeItem(PAYMENT_CONTEXT_STORAGE_KEY);
        return;
      }
      const rawMessage = message || '알 수 없는 오류가 발생했습니다.';
      showErrorToast('처리에 실패했습니다', translateErrorMessage(rawMessage));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <SubPageHeader title="예약 확인" />
      <Container className="py-6">
        <div className="glass-card">
          {/* 예약 정보 */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-2">
              {game.clubName || game.name}
            </h3>
            {game.clubLocation && (
              <p className="text-base text-white/70 mb-1">{game.clubLocation}</p>
            )}
            <p className="text-lg text-white/90 mb-1">{formatDate(date)}</p>
            <p className="text-lg text-white/90">{timeSlot.startTime}</p>
          </div>

          {/* 구분선 */}
          <div className="border-t border-white/20 my-6" />

          {/* 인원 선택 */}
          <div className="mb-6">
            <label className="block text-base font-semibold text-white/90 mb-3">인원 선택</label>
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: availablePlayers }, (_, i) => i + 1).map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setPlayerCount(count)}
                  className={`py-3 text-lg font-medium rounded-xl transition-all border ${
                    playerCount === count
                      ? 'bg-green-500/30 text-green-300 border-green-500/50'
                      : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
                  }`}
                >
                  {count}명
                </button>
              ))}
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-white/20 my-6" />

          {/* 결제 방법 */}
          <div className="mb-6">
            <label className="block text-base font-semibold text-white/90 mb-3">결제 방법</label>
            <div className="grid grid-cols-2 gap-3">
              {SIMPLE_PAYMENT_METHODS.map((method) => {
                const isCardDisabled = method.id === 'card' && totalPrice <= 0;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => !isCardDisabled && setSelectedPaymentMethod(method.id)}
                    disabled={isCardDisabled}
                    className={`py-4 px-4 rounded-xl transition-all border text-center ${
                      isCardDisabled
                        ? 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed'
                        : selectedPaymentMethod === method.id
                          ? 'bg-green-500/30 text-green-300 border-green-500/50'
                          : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <div className="text-2xl mb-1">{method.icon}</div>
                    <div className="text-lg font-medium">{method.name}</div>
                    {isCardDisabled && (
                      <div className="text-xs text-white/40 mt-1">무료 게임은 현장결제만 가능</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-white/20 my-6" />

          {/* 결제 금액 */}
          <div className="mb-6 text-center">
            <label className="block text-base font-semibold text-white/90 mb-3">총 결제 금액</label>
            <PriceDisplay price={totalPrice} size="xl" showUnit={false} className="justify-center" />
            <p className="text-base text-white/60 mt-2">
              ({playerCount}명 × {pricePerPerson.toLocaleString()}원)
            </p>
          </div>

          {/* 구분선 */}
          <div className="border-t border-white/20 my-6" />

          {/* 약관 동의 */}
          <div className="mb-8">
            <label className="flex items-start cursor-pointer gap-3">
              <Checkbox
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                glass
              />
              <span className="text-base text-white/90 leading-relaxed">
                이용약관 및 개인정보처리방침에 동의합니다
              </span>
            </label>
          </div>

          {/* 결제 버튼 */}
          <Button
            onClick={handlePayment}
            disabled={!canProceed || isProcessing}
            loading={isProcessing}
            variant="glass"
            size="lg"
            className={`w-full h-16 text-xl rounded-2xl ${
              canProceed && !isProcessing
                ? '!bg-white/90 hover:!bg-white !text-slate-800'
                : '!bg-white/20 !text-white/50 cursor-not-allowed'
            }`}
          >
            {isProcessing ? '처리 중...' : canProceed
              ? `${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(totalPrice)} 예약하기`
              : '필수 항목을 완료해주세요'
            }
          </Button>
        </div>
      </Container>
    </div>
  );
};
