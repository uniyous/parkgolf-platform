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
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' 
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 24px',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          height: '80px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/search')}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              ←
            </button>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#10b981',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              📝
            </div>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              예약 정보 입력
            </h1>
          </div>
          
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '8px 16px',
                background: '#f0fdf4',
                borderRadius: '20px',
                fontSize: '14px',
                color: '#059669',
                fontWeight: '500'
              }}>
                {user.name}님
              </div>
              <button
                onClick={logout}
                style={{
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  color: '#6b7280',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Selected Booking Info */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          marginBottom: '32px'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⛳ 선택된 예약 정보
          </h2>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{
              width: '100px',
              height: '70px',
              background: `url(${course.imageUrl}) center/cover`,
              borderRadius: '8px',
              flexShrink: 0
            }} />
            
            <div style={{ flex: 1 }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 4px 0'
              }}>
                {course.name}
              </h3>
              <p style={{ 
                color: '#6b7280', 
                fontSize: '14px',
                margin: '0 0 8px 0'
              }}>
                📍 {course.location}
              </p>
              <div style={{
                background: '#f0fdf4',
                color: '#059669',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ⭐ {course.rating}
              </div>
            </div>
          </div>

          <div style={{
            background: '#f9fafb',
            padding: '16px',
            borderRadius: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>예약 날짜</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                {formatDate(timeSlot.date)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>예약 시간</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                {timeSlot.time} {timeSlot.isPremium && '💎'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>기본 요금</div>
              <PriceDisplay 
                price={timeSlot.price} 
                size="medium" 
                showUnit={false}
              />
            </div>
          </div>
        </div>

        {/* Booking Details Form */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          marginBottom: '32px'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '20px'
          }}>
            📋 예약 세부 정보
          </h2>

          {/* Player Count */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600',
              color: '#374151',
              fontSize: '14px'
            }}>
              플레이어 수
            </label>
            <select
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                background: 'white'
              }}
            >
              <option value={1}>1명 (개인 레슨)</option>
              <option value={2}>2명</option>
              <option value={3}>3명</option>
              <option value={4}>4명 (풀 플라이트)</option>
            </select>
          </div>

          {/* Special Requests */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600',
              color: '#374151',
              fontSize: '14px'
            }}>
              특별 요청사항 (선택사항)
            </label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="카트 요청, 캐디 서비스, 기타 요청사항을 입력해주세요."
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Payment Method Selection */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          marginBottom: '32px'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '20px'
          }}>
            💳 결제 방법 선택
          </h2>

          <div style={{ display: 'grid', gap: '12px' }}>
            {paymentMethods.map((method) => (
              <label
                key={method.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  border: `2px solid ${selectedPaymentMethod === method.id ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: selectedPaymentMethod === method.id ? '#f0fdf4' : 'white'
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedPaymentMethod === method.id}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  style={{ marginRight: '12px' }}
                />
                <div style={{ fontSize: '24px', marginRight: '12px' }}>
                  {method.icon}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {method.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {method.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Price Summary */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          marginBottom: '32px'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '20px'
          }}>
            💰 결제 금액
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6b7280' }}>기본 요금 x {playerCount}명</span>
              <PriceDisplay price={totalPrice} size="small" showUnit={false} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6b7280' }}>서비스 수수료</span>
              <PriceDisplay price={serviceFee} size="small" showUnit={false} />
            </div>
            <div style={{ 
              borderTop: '1px solid #e5e7eb', 
              paddingTop: '12px',
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <span style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>총 결제 금액</span>
              <PriceDisplay price={finalPrice} size="large" showUnit={false} />
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          marginBottom: '32px'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '20px'
          }}>
            📄 약관 동의
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                style={{ marginRight: '8px', transform: 'scale(1.2)' }}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>
                이용약관에 동의합니다 (필수)
              </span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={agreeToPrivacy}
                onChange={(e) => setAgreeToPrivacy(e.target.checked)}
                style={{ marginRight: '8px', transform: 'scale(1.2)' }}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>
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
          variant="primary"
          size="large"
          style={{
            width: '100%',
            fontSize: '18px',
            fontWeight: '700',
            borderRadius: '12px'
          }}
        >
          {canProceed 
            ? `💳 ${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(finalPrice)} 결제하기` 
            : '필수 항목을 완료해주세요'
          }
        </Button>
      </div>
    </div>
  );
};