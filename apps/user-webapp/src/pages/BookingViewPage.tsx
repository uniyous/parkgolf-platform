import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Users, MapPin, Phone, Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatPrice, formatDateTime } from '@/lib/formatting';
import { useBookingByNumberQuery } from '@/hooks/queries/booking';
import { CancelBookingModal } from '@/components/CancelBookingModal';
import { type BookingStatus, type BookingWithCancel } from '@/lib/api/bookingApi';

const statusConfig: Record<BookingStatus, { label: string; className: string; description: string }> = {
  PENDING: {
    label: '대기중',
    className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    description: '예약이 처리 중입니다.',
  },
  CONFIRMED: {
    label: '확정',
    className: 'bg-green-500/20 text-green-300 border-green-500/30',
    description: '예약이 확정되었습니다.',
  },
  CANCELLED: {
    label: '취소됨',
    className: 'bg-red-500/20 text-red-300 border-red-500/30',
    description: '예약이 취소되었습니다.',
  },
  COMPLETED: {
    label: '완료',
    className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: '라운드가 완료되었습니다.',
  },
  NO_SHOW: {
    label: '노쇼',
    className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    description: '예약 시간에 방문하지 않았습니다.',
  },
  SAGA_PENDING: {
    label: '처리중',
    className: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    description: '예약이 처리 중입니다. 잠시만 기다려 주세요.',
  },
  SAGA_FAILED: {
    label: '처리실패',
    className: 'bg-red-500/20 text-red-300 border-red-500/30',
    description: '예약 처리에 실패했습니다. 다시 시도해 주세요.',
  },
};

export const BookingViewPage: React.FC = () => {
  const { bookingNumber } = useParams<{ bookingNumber: string }>();
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: booking, isLoading, isError, refetch } = useBookingByNumberQuery(bookingNumber || '');

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-forest">
        <header className="sticky top-0 z-40 glass-header px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">예약 상세</h1>
          </div>
        </header>
        <main className="px-4 py-6">
          <div className="glass-card p-6 animate-pulse">
            <div className="h-8 bg-white/20 rounded w-1/2 mb-4" />
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="h-6 bg-white/10 rounded w-full" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="min-h-screen gradient-forest">
        <header className="sticky top-0 z-40 glass-header px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">예약 상세</h1>
          </div>
        </header>
        <main className="px-4 py-6">
          <div className="glass-card p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-lg font-bold text-white mb-2">예약을 찾을 수 없습니다</h2>
            <p className="text-white/60 mb-6">
              예약 번호가 올바른지 확인해 주세요.
            </p>
            <button
              onClick={() => navigate('/my-bookings')}
              className={cn(
                'px-6 py-3 text-sm font-medium rounded-lg',
                'bg-green-500 text-white hover:bg-green-600',
                'transition-colors'
              )}
            >
              내 예약 목록으로
            </button>
          </div>
        </main>
      </div>
    );
  }

  const status = statusConfig[booking.status] || statusConfig.PENDING;

  // canCancel 계산 (3일 전까지)
  const calculateCanCancel = () => {
    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return false;
    }
    const bookingDate = new Date(booking.bookingDate);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);
    return bookingDate >= threeDaysFromNow;
  };

  const canCancel = calculateCanCancel();
  const bookingWithCancel: BookingWithCancel = { ...booking, canCancel };

  return (
    <div className="min-h-screen gradient-forest">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-header px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">예약 상세</h1>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 space-y-4">
        {/* Status Card */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={cn(
              'text-sm font-medium px-3 py-1 rounded-full border',
              status.className
            )}>
              {status.label}
            </span>
            <span className="text-sm text-white/50">{booking.bookingNumber}</span>
          </div>
          <p className="text-sm text-white/70">{status.description}</p>
        </div>

        {/* Game Info */}
        <div className="glass-card p-4">
          <h2 className="text-lg font-bold text-white mb-1">{booking.gameName}</h2>
          <p className="text-sm text-white/60 mb-4">
            {booking.frontNineCourseName} + {booking.backNineCourseName}
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-white/80">
              <Calendar className="w-5 h-5 text-green-400" />
              <span>{formatDate(booking.bookingDate)}</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <Clock className="w-5 h-5 text-blue-400" />
              <span>{booking.startTime} - {booking.endTime}</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <Users className="w-5 h-5 text-amber-400" />
              <span>{booking.playerCount}명</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <MapPin className="w-5 h-5 text-pink-400" />
              <span>{booking.clubName}</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white/80 mb-3">예약자 정보</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-white/70">
              <span className="text-sm">{booking.userName}</span>
            </div>
            <div className="flex items-center gap-3 text-white/70">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{booking.userEmail}</span>
            </div>
            {booking.userPhone && (
              <div className="flex items-center gap-3 text-white/70">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{booking.userPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Special Requests */}
        {booking.specialRequests && (
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-2">특별 요청사항</h3>
            <p className="text-sm text-white/70">{booking.specialRequests}</p>
          </div>
        )}

        {/* Price Summary */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white/80 mb-3">결제 정보</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">
                기본요금 ({formatPrice(booking.pricePerPerson)}원 x {booking.playerCount}명)
              </span>
              <span className="text-white/80">
                {formatPrice(booking.pricePerPerson * booking.playerCount)}원
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">서비스 수수료</span>
              <span className="text-white/80">{formatPrice(booking.serviceFee)}원</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="font-semibold text-white">총 결제금액</span>
              <span className="font-bold text-lg text-white">{formatPrice(booking.totalPrice)}원</span>
            </div>
            {booking.paymentMethod && (
              <div className="flex justify-between text-sm pt-2">
                <span className="text-white/60">결제 방법</span>
                <span className="text-white/80">{booking.paymentMethod}</span>
              </div>
            )}
          </div>
        </div>

        {/* Booking Timeline */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white/80 mb-3">예약 기록</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">예약 생성</span>
              <span className="text-white/70">{formatDateTime(booking.createdAt)}</span>
            </div>
            {booking.createdAt !== booking.updatedAt && (
              <div className="flex justify-between">
                <span className="text-white/60">최종 수정</span>
                <span className="text-white/70">{formatDateTime(booking.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {booking.status === 'CONFIRMED' && (
          <div className="space-y-3">
            {canCancel ? (
              <button
                onClick={() => setShowCancelModal(true)}
                className={cn(
                  'w-full py-3 text-sm font-medium rounded-lg',
                  'bg-red-500/20 text-red-300 border border-red-500/30',
                  'hover:bg-red-500/30 transition-colors'
                )}
              >
                예약 취소
              </button>
            ) : (
              <div className="text-center text-sm text-white/50">
                예약일 3일 전까지 취소 가능합니다.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <CancelBookingModal
          booking={bookingWithCancel}
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};
