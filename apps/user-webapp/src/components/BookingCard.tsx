import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, MapPin, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatPrice } from '@/lib/formatting';
import { type BookingWithCancel, type BookingStatus } from '@/lib/api/bookingApi';

interface BookingCardProps {
  booking: BookingWithCancel;
  onCancelClick?: (booking: BookingWithCancel) => void;
}

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  PENDING: { label: '대기중', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  SLOT_RESERVED: { label: '슬롯예약완료', className: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  CONFIRMED: { label: '확정', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
  CANCELLED: { label: '취소됨', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
  COMPLETED: { label: '완료', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  NO_SHOW: { label: '노쇼', className: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
  FAILED: { label: '실패', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

export const BookingCard: React.FC<BookingCardProps> = ({ booking, onCancelClick }) => {
  const navigate = useNavigate();
  const status = statusConfig[booking.status] || statusConfig.PENDING;

  const handleCardClick = () => {
    navigate(`/booking/${booking.bookingNumber}`);
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCancelClick) {
      onCancelClick(booking);
    }
  };

  const isPast = new Date(booking.bookingDate) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'glass-card p-4 cursor-pointer transition-all duration-200',
        'hover:bg-white/10 active:scale-[0.98]',
        isPast && 'opacity-70'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full border',
              status.className
            )}>
              {status.label}
            </span>
            <span className="text-xs text-white/50">
              {booking.bookingNumber}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white">
            {booking.gameName}
          </h3>
          <p className="text-sm text-white/60">
            {booking.frontNineCourseName} + {booking.backNineCourseName}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-white/40" />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Calendar className="w-4 h-4 text-green-400" />
          <span>{formatDate(booking.bookingDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Clock className="w-4 h-4 text-blue-400" />
          <span>{booking.startTime} - {booking.endTime}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Users className="w-4 h-4 text-amber-400" />
          <span>{booking.playerCount}명</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <MapPin className="w-4 h-4 text-pink-400" />
          <span>{booking.clubName}</span>
        </div>
      </div>

      {/* Price & Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div>
          <span className="text-xs text-white/50">총 결제금액</span>
          <p className="text-lg font-bold text-white">
            {formatPrice(booking.totalPrice)}원
          </p>
        </div>
        {booking.canCancel && booking.status === 'CONFIRMED' && (
          <button
            onClick={handleCancelClick}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'bg-red-500/20 text-red-300 border border-red-500/30',
              'hover:bg-red-500/30 transition-colors'
            )}
          >
            예약 취소
          </button>
        )}
        {!booking.canCancel && booking.status === 'CONFIRMED' && !isPast && (
          <span className="text-xs text-white/40">
            3일 전까지 취소 가능
          </span>
        )}
      </div>
    </div>
  );
};

// 스켈레톤 컴포넌트
export const BookingCardSkeleton: React.FC = () => (
  <div className="glass-card p-4 animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 bg-white/20 rounded-full w-14" />
          <div className="h-4 bg-white/20 rounded w-24" />
        </div>
        <div className="h-6 bg-white/20 rounded w-3/4 mb-1" />
        <div className="h-4 bg-white/20 rounded w-1/2" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 mb-3">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="h-5 bg-white/10 rounded w-full" />
      ))}
    </div>
    <div className="flex items-center justify-between pt-3 border-t border-white/10">
      <div>
        <div className="h-3 bg-white/20 rounded w-16 mb-1" />
        <div className="h-6 bg-white/20 rounded w-24" />
      </div>
    </div>
  </div>
);
