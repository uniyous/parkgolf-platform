import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import type { BookingResponse } from '@/lib/api/bookingApi';
import type { Game, GameTimeSlot } from '@/lib/api/gameApi';
import { Button, PriceDisplay } from '../components';

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

export const BookingCompletePage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const bookingState = location.state as BookingCompleteState;

  if (!bookingState) {
    navigate('/search');
    return null;
  }

  const { booking, game, timeSlot, date, playerCount, paymentMethod } = bookingState;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const handleNewBooking = () => {
    navigate('/search');
  };

  const handleMyBookings = () => {
    navigate('/my-bookings');
  };

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

      {/* Header */}
      <header className="glass-card mx-4 mt-4 mb-8 !p-4 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-400/30 border-2 border-green-400/50 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm animate-pulse">
              ✅
            </div>
            <div>
              <div className="text-white text-xl font-bold">예약 완료</div>
              <div className="text-green-200 text-sm font-medium">축하합니다!</div>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-green-400/20 border border-green-400/30 rounded-full text-sm text-white font-medium backdrop-blur-sm">
                {user.name}님
              </div>
              <Button variant="glass" size="sm" onClick={logout}>
                로그아웃
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
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
            📋 예약 상세 정보
          </h3>

          {/* Game Info */}
          <div className="flex flex-col lg:flex-row gap-6 mb-6 p-5 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm">
            <div className="w-full lg:w-32 h-24 bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 rounded-xl flex-shrink-0 flex items-center justify-center text-4xl">
              🏌️
            </div>

            <div className="flex-1">
              <h4 className="text-lg font-semibold text-white mb-2">{booking.gameName}</h4>
              <p className="text-white/70 text-sm mb-3">📍 {booking.clubName}</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/20 text-white/90 px-3 py-1 rounded-full text-xs font-medium">
                  ⏱️ {game.duration}분
                </span>
                <span className="bg-white/20 text-white/90 px-3 py-1 rounded-full text-xs font-medium">
                  👥 {playerCount}명
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
              <div className="text-sm font-semibold text-white">{formatDate(date)}</div>
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
            <div className="text-xs text-green-200 mt-2">
              (기본요금: {(timeSlot.price || game.pricePerPerson) * playerCount}원
              {booking.serviceFee ? ` + 수수료: ${booking.serviceFee}원` : ''})
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={handleNewBooking}
            className="px-6 py-4 bg-green-400/20 hover:bg-green-400/30 border-2 border-green-400/40 hover:border-green-400/60 text-white rounded-xl text-base font-semibold transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transform hover:-translate-y-1"
          >
            🔍 새로운 예약하기
          </button>

          <button
            onClick={handleMyBookings}
            className="px-6 py-4 bg-white/10 hover:bg-white/20 border-2 border-white/30 hover:border-white/50 text-white rounded-xl text-base font-semibold transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transform hover:-translate-y-1"
          >
            📋 내 예약 보기
          </button>
        </div>

        {/* Additional Info */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            📌 예약 안내사항
          </h3>

          <ul className="text-white/80 text-sm leading-relaxed space-y-2 pl-5 list-disc">
            <li>예약 확인 메일을 확인해주세요.</li>
            <li>예약 변경/취소는 예약일 3일 전까지 가능합니다.</li>
            <li>당일 취소 시 취소 수수료가 부과될 수 있습니다.</li>
            <li>골프장 이용 시 드레스 코드를 준수해주세요.</li>
            <li>문의사항이 있으시면 고객센터로 연락주세요.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
