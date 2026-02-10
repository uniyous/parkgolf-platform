import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import type { BookingResponse } from '@/lib/api/bookingApi';
import type { Game, GameTimeSlot } from '@/lib/api/gameApi';
import { paymentApi } from '@/lib/api/paymentApi';
import { useConfirmPaymentMutation } from '@/hooks/queries/payment';
import { formatDate } from '@/lib/formatting';
import { translateErrorMessage } from '@/types/common';
import { Container, SubPageHeader } from '@/components/layout';
import { Button } from '../components';
import { PAYMENT_CONTEXT_STORAGE_KEY } from '@/lib/constants';
import type { PaymentSessionContext } from '@/lib/constants';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface BookingCompleteState {
  booking: BookingResponse;
  game: Game;
  timeSlot: GameTimeSlot;
  date: string;
  playerCount: number;
  paymentMethod?: PaymentMethod;
  specialRequests?: string;
}

type PageState =
  | { status: 'loading'; message: string }
  | { status: 'success'; data: BookingCompleteState }
  | { status: 'error'; code?: string; message: string; canRetry: boolean }
  | { status: 'redirect' };

export const BookingCompletePage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const confirmMutation = useConfirmPaymentMutation();
  const confirmedRef = useRef(false);

  const [pageState, setPageState] = useState<PageState>({ status: 'loading', message: '처리 중...' });

  // URL params
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message');

  // location.state from onsite payment
  const locationState = location.state as BookingCompleteState | null;

  const getStoredContext = useCallback((): PaymentSessionContext | null => {
    const stored = sessionStorage.getItem(PAYMENT_CONTEXT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }, []);

  const cleanupAndSetSuccess = useCallback((data: BookingCompleteState) => {
    sessionStorage.removeItem(PAYMENT_CONTEXT_STORAGE_KEY);
    window.history.replaceState({}, '', '/booking-complete');
    setPageState({ status: 'success', data });
  }, []);

  // Scenario 1: Card payment success — confirm with backend
  const handleCardSuccess = useCallback(async () => {
    if (!paymentKey || !orderId || !amount) return;
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    setPageState({ status: 'loading', message: '결제를 확인하고 있습니다...' });

    const ctx = getStoredContext();
    const buildSuccessData = (): BookingCompleteState => ({
      booking: ctx?.booking as BookingCompleteState['booking'] ?? { bookingNumber: orderId, totalPrice: Number(amount) } as BookingCompleteState['booking'],
      game: ctx?.game as BookingCompleteState['game'] ?? { name: '' } as BookingCompleteState['game'],
      timeSlot: ctx?.timeSlot as BookingCompleteState['timeSlot'] ?? { startTime: '' } as BookingCompleteState['timeSlot'],
      date: ctx?.date ?? '',
      playerCount: ctx?.playerCount ?? 0,
      paymentMethod: { id: 'card', name: '카드결제', icon: '💳', description: '신용/체크카드 결제' },
    });

    try {
      await confirmMutation.mutateAsync({ paymentKey, orderId, amount: Number(amount) });
      cleanupAndSetSuccess(buildSuccessData());
    } catch {
      // confirm 실패 시 결제 상태 조회 fallback
      try {
        const payment = await paymentApi.getPaymentByOrderId(orderId);
        if (payment.status === 'DONE') {
          cleanupAndSetSuccess(buildSuccessData());
          return;
        }
      } catch {
        // 조회도 실패
      }
      setPageState({
        status: 'error',
        message: '결제 승인에 실패했습니다. 다시 시도해주세요.',
        canRetry: true,
      });
    }
  }, [paymentKey, orderId, amount, confirmMutation, getStoredContext, cleanupAndSetSuccess]);

  // Scenario determination
  useEffect(() => {
    // Scenario 1: Card success (paymentKey + orderId + amount in URL)
    if (paymentKey && orderId && amount) {
      handleCardSuccess();
      return;
    }

    // Scenario 2: Card failure (code + message in URL)
    if (errorCode || errorMessage) {
      const msg = errorMessage
        ? decodeURIComponent(errorMessage)
        : '결제가 취소되었거나 실패했습니다.';
      setPageState({
        status: 'error',
        code: errorCode ?? undefined,
        message: msg,
        canRetry: true,
      });
      return;
    }

    // Scenario 3: Onsite payment (location.state present)
    if (locationState) {
      setPageState({ status: 'success', data: locationState });
      return;
    }

    // Scenario 4: Direct access — redirect
    setPageState({ status: 'redirect' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle retry: re-invoke Toss SDK
  const handleRetry = async () => {
    const ctx = getStoredContext();
    if (!ctx || !TOSS_CLIENT_KEY) {
      navigate('/bookings', { replace: true });
      return;
    }

    try {
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      await tossPayments.requestPayment('카드', {
        amount: ctx.amount,
        orderId: ctx.orderId,
        orderName: ctx.orderName,
        successUrl: `${window.location.origin}/booking-complete`,
        failUrl: `${window.location.origin}/booking-complete`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message && message.includes('CANCEL')) {
        // 사용자 취소 — 상태 유지
        return;
      }
      setPageState({
        status: 'error',
        message: '결제 요청 중 오류가 발생했습니다.',
        canRetry: true,
      });
    }
  };

  const handleConfirmRetry = () => {
    confirmedRef.current = false;
    handleCardSuccess();
  };

  const handleNewBooking = () => navigate('/bookings');
  const handleMyBookings = () => navigate('/my-bookings');

  // ========== RENDER ==========

  // Redirect
  if (pageState.status === 'redirect') {
    navigate('/bookings', { replace: true });
    return null;
  }

  // Loading
  if (pageState.status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-400/40 border-t-green-400 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-white/80 text-lg">{pageState.message}</p>
        </div>
      </div>
    );
  }

  // Error
  if (pageState.status === 'error') {
    return (
      <div className="min-h-screen gradient-forest relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-32 h-32 bg-red-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-red-400/20 rounded-full blur-3xl" />
        </div>

        <SubPageHeader title="결제 실패" onBack={false} />

        <Container className="relative z-10 py-8">
          <div className="glass-card text-center mb-8">
            <div className="w-20 h-20 bg-red-400/30 border-2 border-red-400/50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              ❌
            </div>

            <h2 className="text-2xl font-bold text-white mb-4">결제에 실패했습니다</h2>

            <p className="text-white/70 text-base mb-4">{pageState.message}</p>

            {pageState.code && (
              <p className="text-white/50 text-sm mb-8">오류 코드: {pageState.code}</p>
            )}

            <div className="flex gap-4 justify-center">
              {pageState.canRetry && (
                <Button
                  onClick={paymentKey ? handleConfirmRetry : handleRetry}
                  loading={confirmMutation.isPending}
                  variant="glass"
                  size="lg"
                  className="!bg-white/90 hover:!bg-white !text-slate-800"
                >
                  다시 시도
                </Button>
              )}
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

  // Success
  const { booking, game, timeSlot, date, playerCount, paymentMethod } = pageState.data;

  return (
    <div className="min-h-screen gradient-forest relative overflow-hidden">
      {/* Background decorative elements - celebration theme */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-green-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-20 right-10 w-24 h-24 bg-white/10 rounded-full blur-2xl animate-bounce"></div>
        <div className="absolute bottom-10 left-20 w-20 h-20 bg-white/10 rounded-full blur-2xl animate-bounce"></div>
      </div>

      <SubPageHeader
        title="예약 완료"
        onBack={false}
        rightContent={
          user ? (
            <div className="px-4 py-2 bg-green-400/20 border border-green-400/30 rounded-full text-sm text-white font-medium backdrop-blur-sm">
              {user.name}님
            </div>
          ) : undefined
        }
      />

      <Container className="relative z-10 py-8">
        {/* Success Message */}
        <div className="glass-card text-center mb-8">
          <div className="w-20 h-20 bg-green-400/30 border-2 border-green-400/50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 backdrop-blur-sm animate-bounce">
            ✅
          </div>

          <h2 className="text-3xl font-bold text-white mb-4">예약이 완료되었습니다!</h2>

          <p className="text-white/80 text-lg mb-8 leading-relaxed">
            라운드 예약이 성공적으로 완료되었습니다.
            <br />
            예약 확인 메일이 발송되었습니다.
          </p>

          <div className="bg-green-400/20 border-2 border-green-400/40 rounded-xl p-4 inline-block backdrop-blur-sm">
            <div className="text-sm text-green-200 mb-1">예약번호</div>
            <div className="text-2xl font-bold text-white tracking-widest">
              {booking.bookingNumber}
            </div>
          </div>
        </div>

        {/* Booking Details */}
        <div className="glass-card mb-8">
          <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
            예약 상세 정보
          </h3>

          {/* Game Info */}
          <div className="flex flex-col lg:flex-row gap-6 mb-6 p-5 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm">
            <div className="w-full lg:w-32 h-24 bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 rounded-xl flex-shrink-0 flex items-center justify-center text-4xl">
              🏌️
            </div>

            <div className="flex-1">
              <h4 className="text-lg font-semibold text-white mb-2">{booking.gameName || game.name}</h4>
              <p className="text-white/70 text-sm mb-3">{booking.clubName || game.clubName}</p>
              <div className="flex flex-wrap gap-2">
                {game.duration && (
                  <span className="bg-white/20 text-white/90 px-3 py-1 rounded-full text-xs font-medium">
                    {game.duration}분
                  </span>
                )}
                <span className="bg-white/20 text-white/90 px-3 py-1 rounded-full text-xs font-medium">
                  {playerCount}명
                </span>
                {game.courses?.map((course, index) => (
                  <span
                    key={index}
                    className="bg-emerald-400/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-medium"
                  >
                    {course.courseName}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm">
              <div className="text-xs text-white/60 mb-2">예약 날짜</div>
              <div className="text-sm font-semibold text-white">{date ? formatDate(date) : '-'}</div>
            </div>

            <div className="p-4 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm">
              <div className="text-xs text-white/60 mb-2">예약 시간</div>
              <div className="text-sm font-semibold text-white">
                {timeSlot.startTime} {timeSlot.isPremium && '💎'}
              </div>
            </div>

            <div className="p-4 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm">
              <div className="text-xs text-white/60 mb-2">플레이어 수</div>
              <div className="text-sm font-semibold text-white">{playerCount}명</div>
            </div>

            <div className="p-4 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm">
              <div className="text-xs text-white/60 mb-2">결제 방법</div>
              <div className="text-sm font-semibold text-white flex items-center gap-1">
                {paymentMethod ? (
                  <>
                    {paymentMethod.icon} {paymentMethod.name}
                  </>
                ) : (
                  '결제 완료'
                )}
              </div>
            </div>
          </div>

          {/* Special Requests */}
          {booking.specialRequests && (
            <div className="p-4 bg-amber-400/20 border border-amber-400/40 rounded-xl backdrop-blur-sm mb-6">
              <div className="text-sm text-amber-200 mb-2 font-semibold">특별 요청사항</div>
              <div className="text-sm text-white">{booking.specialRequests}</div>
            </div>
          )}

          {/* Payment Summary */}
          <div className="p-6 bg-green-400/20 border-2 border-green-400/40 rounded-xl backdrop-blur-sm">
            <div className="text-base text-green-200 mb-2 font-semibold">결제 완료 금액</div>
            <div className="text-3xl font-bold text-white">
              {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(booking.totalPrice)}
            </div>
            {playerCount > 0 && (timeSlot.price || game.pricePerPerson) && (
              <div className="text-xs text-green-200 mt-2">
                (기본요금: {((timeSlot.price || game.pricePerPerson || 0) * playerCount).toLocaleString()}원
                {booking.serviceFee ? ` + 수수료: ${booking.serviceFee}원` : ''})
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={handleNewBooking}
            className="px-6 py-4 bg-green-400/20 hover:bg-green-400/30 border-2 border-green-400/40 hover:border-green-400/60 text-white rounded-xl text-base font-semibold transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transform hover:-translate-y-1"
          >
            새로운 예약하기
          </button>

          <button
            onClick={handleMyBookings}
            className="px-6 py-4 bg-white/10 hover:bg-white/20 border-2 border-white/30 hover:border-white/50 text-white rounded-xl text-base font-semibold transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transform hover:-translate-y-1"
          >
            내 예약 보기
          </button>
        </div>

        {/* Additional Info */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            예약 안내사항
          </h3>

          <ul className="text-white/80 text-sm leading-relaxed space-y-2 pl-5 list-disc">
            <li>예약 확인 메일을 확인해주세요.</li>
            <li>예약 변경/취소는 예약일 3일 전까지 가능합니다.</li>
            <li>당일 취소 시 취소 수수료가 부과될 수 있습니다.</li>
            <li>골프장 이용 시 드레스 코드를 준수해주세요.</li>
            <li>문의사항이 있으시면 고객센터로 연락주세요.</li>
          </ul>
        </div>
      </Container>
    </div>
  );
};
