import React, { useState, useEffect } from 'react';
import { useBooking } from '../hooks/useBooking';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Game, GameTimeSlot } from '@/lib/api/gameApi';
import { formatDate } from '@/lib/formatting';
import { showErrorToast } from '@/lib/toast';
import { translateErrorMessage } from '@/types/common';
import { Button, Checkbox, PriceDisplay } from '../components';
import { Container, SubPageHeader } from '@/components/layout';
import { SIMPLE_PAYMENT_METHODS, SERVICE_FEE_RATE } from '@/lib/constants';

interface BookingState {
  game: Game;
  timeSlot: GameTimeSlot;
  date: string;
}

export const BookingDetailPage: React.FC = () => {
  const { user } = useAuth();
  const { createBooking, isCreating } = useBooking();
  const location = useLocation();
  const navigate = useNavigate();
  const bookingState = location.state as BookingState;

  const [playerCount, setPlayerCount] = useState(2);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  if (!bookingState) {
    navigate('/bookings');
    return null;
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
  const serviceFee = Math.floor(totalPrice * SERVICE_FEE_RATE);

  const canProceed = selectedPaymentMethod && agreeToTerms;

  const handlePayment = async () => {
    if (!canProceed || !user) return;

    try {
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

      if (result.success) {
        navigate('/booking-complete', {
          state: {
            booking: result.data,
            game,
            timeSlot,
            date,
            playerCount,
            paymentMethod: SIMPLE_PAYMENT_METHODS.find(p => p.id === selectedPaymentMethod),
          }
        });
      } else {
        const rawMessage = result.error instanceof Error
          ? result.error.message
          : '알 수 없는 오류가 발생했습니다.';
        const errorMessage = translateErrorMessage(rawMessage);
        showErrorToast('예약 생성에 실패했습니다', errorMessage);
      }
    } catch (error) {
      console.error('Booking failed:', error);
      const rawMessage = error instanceof Error
        ? error.message
        : '알 수 없는 오류가 발생했습니다.';
      const errorMessage = translateErrorMessage(rawMessage);
      showErrorToast('예약 생성에 실패했습니다', errorMessage);
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
              <p className="text-base text-white/70 mb-1">📍 {game.clubLocation}</p>
            )}
            <p className="text-lg text-white/90 mb-1">📅 {formatDate(date)}</p>
            <p className="text-lg text-white/90">🕐 {timeSlot.startTime}</p>
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
              {SIMPLE_PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`py-4 px-4 rounded-xl transition-all border text-center ${
                    selectedPaymentMethod === method.id
                      ? 'bg-green-500/30 text-green-300 border-green-500/50'
                      : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
                  }`}
                >
                  <div className="text-2xl mb-1">{method.icon}</div>
                  <div className="text-lg font-medium">{method.name}</div>
                </button>
              ))}
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
            disabled={!canProceed || isCreating}
            loading={isCreating}
            variant="glass"
            size="lg"
            className={`w-full h-16 text-xl rounded-2xl ${
              canProceed && !isCreating
                ? '!bg-white/90 hover:!bg-white !text-slate-800'
                : '!bg-white/20 !text-white/50 cursor-not-allowed'
            }`}
          >
            {isCreating ? '결제 처리 중...' : canProceed
              ? `${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(totalPrice)} 예약하기`
              : '필수 항목을 완료해주세요'
            }
          </Button>
        </div>
      </Container>
    </div>
  );
};
