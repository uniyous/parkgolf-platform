import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useBooking } from '../hooks/useBooking';
import { useLocation, useNavigate } from 'react-router-dom';
import { Course } from '../redux/api/courseApi';
import { TimeSlot } from '../redux/api/bookingApi';
import { Button, Text, PriceDisplay } from '../components';


interface BookingState {
  course: Course;
  timeSlot: TimeSlot;
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
  const { user, logout } = useAuth();
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

  const { course, timeSlot } = bookingState;


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const totalPrice = timeSlot.price * playerCount;
  const serviceFee = Math.floor(totalPrice * 0.03); // 3% 서비스 수수료
  const finalPrice = totalPrice + serviceFee;

  const canProceed = selectedPaymentMethod && agreeToTerms && agreeToPrivacy;

  const handlePayment = async () => {
    if (!canProceed || !user) return;

    try {
      // 예약 생성 API 호출
      const bookingData = {
        courseId: course.id,
        bookingDate: timeSlot.date,
        timeSlot: timeSlot.time,
        playerCount,
        specialRequests: specialRequests || undefined,
        userEmail: user.email,
        userName: user.name,
        userPhone: user.phoneNumber || user.phone,
        paymentMethod: selectedPaymentMethod,
      };

      const result = await createBooking(bookingData);

      if (result.success) {
        // 결제 완료 페이지로 이동 (실제 예약 데이터와 함께)
        navigate('/booking-complete', {
          state: {
            booking: result.data,
            course,
            timeSlot,
            playerCount,
            paymentMethod: paymentMethods.find(p => p.id === selectedPaymentMethod),
            specialRequests
          }
        });
      } else {
        alert('예약 생성에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Booking failed:', error);
      alert('예약 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="min-h-screen gradient-forest relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="glass-card mx-4 mt-4 mb-8 !p-4 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/search')}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200 text-white text-xl backdrop-blur-sm"
            >
              ←
            </button>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
              📝
            </div>
            <div>
              <div className="text-white text-xl font-bold">예약 정보 입력</div>
              <div className="text-white/70 text-sm">세부 정보를 입력하세요</div>
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/20 rounded-full text-sm text-white font-medium backdrop-blur-sm">
                {user.name}님
              </div>
              <button
                onClick={logout}
                className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-4 py-2 rounded-xl cursor-pointer text-sm font-medium transition-all duration-200 backdrop-blur-sm"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        {/* Selected Booking Info */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            ⛳ 선택된 예약 정보
          </h2>

          <div className="flex flex-col lg:flex-row gap-6 mb-6">
            <div 
              className="w-full lg:w-32 h-24 bg-cover bg-center rounded-xl flex-shrink-0"
              style={{ backgroundImage: `url(${course.imageUrl})` }}
            />
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                {course.name}
              </h3>
              <p className="text-white/70 text-sm mb-3">
                📍 {course.location}
              </p>
              <div className="bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border border-amber-400/30 inline-flex items-center gap-1">
                ⭐ {course.rating}
              </div>
            </div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-xl p-4 backdrop-blur-sm grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-white/60 mb-1">예약 날짜</div>
              <div className="text-sm font-semibold text-white">
                {formatDate(timeSlot.date)}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/60 mb-1">예약 시간</div>
              <div className="text-sm font-semibold text-white">
                {timeSlot.time} {timeSlot.isPremium && '💎'}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/60 mb-1">기본 요금</div>
              <PriceDisplay 
                price={timeSlot.price} 
                size="medium" 
                showUnit={false}
              />
            </div>
          </div>
        </div>

        {/* Booking Details Form */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            📋 예약 세부 정보
          </h2>

          {/* Player Count */}
          <div className="mb-6">
            <label className="block mb-3 text-sm font-semibold text-white/90">
              플레이어 수
            </label>
            <select
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all duration-200 bg-white/90 border border-white/30 text-slate-800 focus:bg-white focus:border-white/50 focus:ring-2 focus:ring-white/20 backdrop-blur-sm cursor-pointer"
            >
              <option value={1}>1명 (개인 레슨)</option>
              <option value={2}>2명</option>
              <option value={3}>3명</option>
              <option value={4}>4명 (풀 플라이트)</option>
            </select>
          </div>

          {/* Special Requests */}
          <div className="mb-6">
            <label className="block mb-3 text-sm font-semibold text-white/90">
              특별 요청사항 (선택사항)
            </label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="카트 요청, 캐디 서비스, 기타 요청사항을 입력해주세요."
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all duration-200 bg-white/90 border border-white/30 text-slate-800 placeholder-slate-500 focus:bg-white focus:border-white/50 focus:ring-2 focus:ring-white/20 backdrop-blur-sm resize-vertical"
            />
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            💳 결제 방법 선택
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
            💰 결제 금액
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white/80">기본 요금 x {playerCount}명</span>
              <PriceDisplay price={totalPrice} size="small" showUnit={false} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/80">서비스 수수료</span>
              <PriceDisplay price={serviceFee} size="small" showUnit={false} />
            </div>
            <div className="border-t border-white/20 pt-4 flex justify-between items-center">
              <span className="text-lg font-semibold text-white">총 결제 금액</span>
              <PriceDisplay price={finalPrice} size="large" showUnit={false} />
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            📄 약관 동의
          </h2>

          <div className="space-y-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="mr-3 scale-125"
              />
              <span className="text-sm text-white/90">
                이용약관에 동의합니다 (필수)
              </span>
            </label>
            
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={agreeToPrivacy}
                onChange={(e) => setAgreeToPrivacy(e.target.checked)}
                className="mr-3 scale-125"
              />
              <span className="text-sm text-white/90">
                개인정보처리방침에 동의합니다 (필수)
              </span>
            </label>
          </div>
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={!canProceed || isCreating}
          className={`w-full px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl ${
            !canProceed || isCreating
              ? 'bg-white/20 border border-white/30 text-white/50 cursor-not-allowed' 
              : '!bg-white/90 hover:!bg-white !text-slate-800'
          }`}
        >
          {isCreating ? '결제 처리 중...' : canProceed 
            ? `💳 ${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(finalPrice)} 결제하기` 
            : '필수 항목을 완료해주세요'
          }
        </button>
      </div>
    </div>
  );
};