import React, { useState, useEffect } from 'react';
import { useBooking } from '../hooks/useBooking';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Game, GameTimeSlot } from '@/lib/api/gameApi';
import { formatDate } from '@/lib/formatting';
import { showErrorToast } from '@/lib/toast';
import { translateErrorMessage } from '@/types/common';
import { Button, Select, Textarea, Checkbox, PriceDisplay } from '../components';


interface BookingState {
  game: Game;
  timeSlot: GameTimeSlot;
  date: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'card',
    name: '신용카드',
    icon: '💳',
    description: '신용카드 또는 체크카드로 결제'
  },
  {
    id: 'kakaopay',
    name: '카카오페이',
    icon: '💛',
    description: '카카오페이로 간편결제'
  },
  {
    id: 'naverpay',
    name: '네이버페이',
    icon: '💚',
    description: '네이버페이로 간편결제'
  },
  {
    id: 'tosspay',
    name: '토스페이',
    icon: '💙',
    description: '토스페이로 간편결제'
  },
  {
    id: 'bank',
    name: '계좌이체',
    icon: '🏦',
    description: '실시간 계좌이체'
  }
];

export const BookingDetailPage: React.FC = () => {
  const { user } = useAuth();
  const { createBooking, isCreating } = useBooking();
  const location = useLocation();
  const navigate = useNavigate();
  const bookingState = location.state as BookingState;

  const [playerCount, setPlayerCount] = useState(2);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [agreeToPrivacy, setAgreeToPrivacy] = useState(false);

  if (!bookingState) {
    navigate('/search');
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

  const totalPrice = (timeSlot.price || game.basePrice || game.pricePerPerson || 0) * playerCount;
  const serviceFee = Math.floor(totalPrice * 0.03); // 3% 서비스 수수료
  const finalPrice = totalPrice + serviceFee;

  const canProceed = selectedPaymentMethod && agreeToTerms && agreeToPrivacy;

  const handlePayment = async () => {
    if (!canProceed || !user) return;

    try {
      const bookingData = {
        gameId: game.id,
        gameTimeSlotId: timeSlot.id,
        bookingDate: date,
        playerCount,
        specialRequests: specialRequests || undefined,
        userEmail: user.email,
        userName: user.name || user.email.split('@')[0], // 이름이 없으면 이메일 앞부분 사용
        userPhone: user.phoneNumber || undefined,
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
            paymentMethod: paymentMethods.find(p => p.id === selectedPaymentMethod),
            specialRequests
          }
        });
      } else {
        // 실제 오류 메시지 추출 및 한국어 변환
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

  // 가용 인원에 맞게 인원 선택 옵션 생성
  const playerCountOptions = Array.from({ length: availablePlayers }, (_, i) => {
    const count = i + 1;
    let label = `${count}명`;
    if (count === 1) label = '1명 (개인 레슨)';
    else if (count === maxPlayers) label = `${count}명 (풀 플라이트)`;
    return { value: count, label };
  });

  return (
    <div className="px-4 py-6">
        {/* Selected Booking Info */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            선택된 예약 정보
          </h2>

          <div className="flex flex-col lg:flex-row gap-6 mb-6">
            <div className="w-full lg:w-32 h-24 bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 rounded-xl flex-shrink-0 flex items-center justify-center text-4xl">
              🏌️
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                {game.name}
              </h3>
              <p className="text-white/70 text-sm mb-3">
                📍 {game.clubName}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/20 text-white/90 px-3 py-1 rounded-full text-xs font-medium">
                  ⏱️ {game.duration}분
                </span>
                <span className="bg-emerald-400/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-medium">
                  👥 {availablePlayers}자리 남음
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-xl p-4 backdrop-blur-sm grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-white/60 mb-1">예약 날짜</div>
              <div className="text-sm font-semibold text-white">
                {formatDate(date)}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/60 mb-1">예약 시간</div>
              <div className="text-sm font-semibold text-white">
                {timeSlot.startTime} {timeSlot.isPremium && '💎'}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/60 mb-1">기본 요금</div>
              <PriceDisplay
                price={timeSlot.price || game.pricePerPerson || 0}
                size="md"
                showUnit={false}
              />
            </div>
          </div>
        </div>

        {/* Booking Details Form */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            예약 세부 정보
          </h2>

          {/* Player Count */}
          <div className="mb-6">
            <label className="block mb-3 text-sm font-semibold text-white/90">
              플레이어 수
            </label>
            <Select
              value={playerCount}
              onValueChange={(value) => setPlayerCount(Number(value))}
              options={playerCountOptions}
              glass
            />
          </div>

          {/* Special Requests */}
          <div className="mb-6">
            <Textarea
              label="특별 요청사항 (선택사항)"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="카트 요청, 캐디 서비스, 기타 요청사항을 입력해주세요."
              rows={4}
              glass
            />
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            결제 방법 선택
          </h2>

          <div className="grid gap-3">
            {paymentMethods.map((method) => (
              <label
                key={method.id}
                className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-sm border ${
                  selectedPaymentMethod === method.id
                    ? 'bg-white/20 border-white/50 shadow-lg'
                    : 'bg-white/10 border-white/30 hover:bg-white/15'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedPaymentMethod === method.id}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="mr-3 scale-125"
                />
                <div className="text-2xl mr-3">
                  {method.icon}
                </div>
                <div>
                  <div className="text-base font-semibold text-white">
                    {method.name}
                  </div>
                  <div className="text-sm text-white/70">
                    {method.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Price Summary */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            결제 금액
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white/80">기본 요금 x {playerCount}명</span>
              <PriceDisplay price={totalPrice} size="sm" showUnit={false} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/80">서비스 수수료</span>
              <PriceDisplay price={serviceFee} size="sm" showUnit={false} />
            </div>
            <div className="border-t border-white/20 pt-4 flex justify-between items-center">
              <span className="text-lg font-semibold text-white">총 결제 금액</span>
              <PriceDisplay price={finalPrice} size="lg" showUnit={false} />
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            약관 동의
          </h2>

          <div className="space-y-4">
            <label className="flex items-center cursor-pointer gap-3">
              <Checkbox
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                glass
              />
              <span className="text-sm text-white/90">
                이용약관에 동의합니다 (필수)
              </span>
            </label>

            <label className="flex items-center cursor-pointer gap-3">
              <Checkbox
                checked={agreeToPrivacy}
                onCheckedChange={(checked) => setAgreeToPrivacy(checked === true)}
                glass
              />
              <span className="text-sm text-white/90">
                개인정보처리방침에 동의합니다 (필수)
              </span>
            </label>
          </div>
        </div>

        {/* Payment Button */}
        <Button
          onClick={handlePayment}
          disabled={!canProceed || isCreating}
          loading={isCreating}
          variant="glass"
          size="lg"
          className={`w-full ${
            canProceed && !isCreating
              ? '!bg-white/90 hover:!bg-white !text-slate-800'
              : '!bg-white/20 !text-white/50 cursor-not-allowed'
          }`}
        >
          {isCreating ? '결제 처리 중...' : canProceed
            ? `${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(finalPrice)} 결제하기`
            : '필수 항목을 완료해주세요'
          }
        </Button>
    </div>
  );
};
