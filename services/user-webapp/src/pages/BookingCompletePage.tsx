import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookingResponse, Course, TimeSlot } from '../api/bookingApi';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface BookingCompleteState {
  booking: BookingResponse;
  course: Course;
  timeSlot: TimeSlot;
  playerCount: number;
  paymentMethod: PaymentMethod;
  specialRequests: string;
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

  const { booking, course, timeSlot, playerCount, paymentMethod, specialRequests } = bookingState;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const handleNewBooking = () => {
    navigate('/search');
  };

  const handleMyBookings = () => {
    // 내 예약 목록 페이지로 이동 (추후 구현)
    alert('내 예약 목록 페이지로 이동합니다.');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' 
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
              ✅
            </div>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              예약 완료
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

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Success Message */}
        <div style={{
          background: 'white',
          padding: '48px 32px',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            margin: '0 auto 24px',
            animation: 'pulse 2s infinite'
          }}>
            ✅
          </div>
          
          <h2 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#1f2937',
            marginBottom: '12px'
          }}>
            예약이 완료되었습니다!
          </h2>
          
          <p style={{ 
            fontSize: '18px', 
            color: '#6b7280',
            marginBottom: '24px'
          }}>
            골프장 예약이 성공적으로 완료되었습니다.<br />
            예약 확인 메일이 발송되었습니다.
          </p>

          <div style={{
            background: '#f0fdf4',
            border: '2px solid #10b981',
            borderRadius: '12px',
            padding: '16px',
            display: 'inline-block'
          }}>
            <div style={{ fontSize: '14px', color: '#059669', marginBottom: '4px' }}>
              예약번호
            </div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#1f2937',
              letterSpacing: '2px'
            }}>
              {booking.bookingNumber}
            </div>
          </div>
        </div>

        {/* Booking Details */}
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          marginBottom: '32px'
        }}>
          <h3 style={{ 
            fontSize: '24px', 
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📋 예약 상세 정보
          </h3>

          {/* Course Info */}
          <div style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '24px',
            padding: '20px',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              width: '100px',
              height: '70px',
              background: `url(${course.imageUrl}) center/cover`,
              borderRadius: '8px',
              flexShrink: 0
            }} />
            
            <div style={{ flex: 1 }}>
              <h4 style={{ 
                fontSize: '20px', 
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 8px 0'
              }}>
                {booking.courseName}
              </h4>
              <p style={{ 
                color: '#6b7280', 
                fontSize: '14px',
                margin: '0 0 8px 0'
              }}>
                📍 {booking.courseLocation}
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

          {/* Booking Info Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div style={{
              padding: '16px',
              background: '#fafafa',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                예약 날짜
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                {formatDate(booking.bookingDate)}
              </div>
            </div>

            <div style={{
              padding: '16px',
              background: '#fafafa',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                예약 시간
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                {booking.timeSlot} {timeSlot.isPremium && '💎'}
              </div>
            </div>

            <div style={{
              padding: '16px',
              background: '#fafafa',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                플레이어 수
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                {booking.playerCount}명
              </div>
            </div>

            <div style={{
              padding: '16px',
              background: '#fafafa',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                결제 방법
              </div>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {paymentMethod.icon} {paymentMethod.name}
              </div>
            </div>
          </div>

          {/* Special Requests */}
          {booking.specialRequests && (
            <div style={{
              padding: '16px',
              background: '#fffbeb',
              borderRadius: '8px',
              border: '1px solid #fbbf24',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '4px', fontWeight: '600' }}>
                특별 요청사항
              </div>
              <div style={{ fontSize: '14px', color: '#78350f' }}>
                {booking.specialRequests}
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div style={{
            background: '#f0fdf4',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #10b981'
          }}>
            <div style={{ fontSize: '16px', color: '#059669', marginBottom: '8px', fontWeight: '600' }}>
              결제 완료 금액
            </div>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: '#1f2937'
            }}>
              {formatPrice(booking.totalPrice)}
            </div>
            <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
              (기본요금: {formatPrice(booking.pricePerPerson * booking.playerCount)} + 수수료: {formatPrice(booking.serviceFee)})
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <button
            onClick={handleNewBooking}
            style={{
              padding: '16px 24px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#059669';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#10b981';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🔍 새로운 예약하기
          </button>

          <button
            onClick={handleMyBookings}
            style={{
              padding: '16px 24px',
              background: 'white',
              color: '#374151',
              border: '2px solid #d1d5db',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.color = '#10b981';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.color = '#374151';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            📋 내 예약 보기
          </button>
        </div>

        {/* Additional Info */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          marginTop: '32px'
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '16px'
          }}>
            📌 예약 안내사항
          </h3>
          
          <ul style={{ 
            color: '#6b7280', 
            fontSize: '14px',
            lineHeight: '1.6',
            margin: 0,
            paddingLeft: '20px'
          }}>
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