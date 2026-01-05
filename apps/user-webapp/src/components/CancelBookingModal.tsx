import React, { useState } from 'react';
import { X, AlertTriangle, Calendar, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatPrice } from '@/lib/formatting';
import { type BookingWithCancel } from '@/lib/api/bookingApi';
import { useCancelBookingMutation } from '@/hooks/queries/booking';

interface CancelBookingModalProps {
  booking: BookingWithCancel;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const cancelReasons = [
  '일정 변경',
  '개인 사정',
  '건강 문제',
  '날씨 이유',
  '다른 예약 확정',
  '기타',
];

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const cancelMutation = useCancelBookingMutation();

  if (!isOpen) return null;

  const handleCancel = async () => {
    const reason = selectedReason === '기타' ? customReason : selectedReason;

    try {
      await cancelMutation.mutateAsync({
        id: booking.id,
        reason: reason || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    }
  };

  const canSubmit = selectedReason && (selectedReason !== '기타' || customReason.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-500/20 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white">예약 취소</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Booking Info */}
        <div className="bg-white/5 rounded-lg p-4 mb-4 space-y-2">
          <h3 className="font-semibold text-white">{booking.gameName}</h3>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(booking.bookingDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Clock className="w-4 h-4" />
            <span>{booking.startTime} - {booking.endTime}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Users className="w-4 h-4" />
            <span>{booking.playerCount}명 / {formatPrice(booking.totalPrice)}원</span>
          </div>
        </div>

        {/* Cancel Policy */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-200">
            예약 취소 시 결제된 금액은 환불 정책에 따라 처리됩니다.
            예약일 3일 전까지 무료 취소가 가능합니다.
          </p>
        </div>

        {/* Reason Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-white/80 mb-2">
            취소 사유 선택
          </label>
          <div className="grid grid-cols-2 gap-2">
            {cancelReasons.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={cn(
                  'px-3 py-2 text-sm rounded-lg border transition-colors',
                  selectedReason === reason
                    ? 'bg-green-500/20 border-green-500/50 text-green-300'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                )}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Reason Input */}
        {selectedReason === '기타' && (
          <div className="mb-4">
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="취소 사유를 입력해 주세요"
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg',
                'bg-white/5 border border-white/10',
                'text-white placeholder:text-white/40',
                'focus:outline-none focus:ring-2 focus:ring-green-500/50'
              )}
              rows={3}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={cn(
              'flex-1 py-3 text-sm font-medium rounded-lg',
              'bg-white/10 text-white/70 hover:bg-white/20',
              'transition-colors'
            )}
          >
            취소
          </button>
          <button
            onClick={handleCancel}
            disabled={!canSubmit || cancelMutation.isPending}
            className={cn(
              'flex-1 py-3 text-sm font-medium rounded-lg',
              'bg-red-500 text-white',
              'hover:bg-red-600 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {cancelMutation.isPending ? '취소 중...' : '예약 취소하기'}
          </button>
        </div>

        {/* Error Message */}
        {cancelMutation.isError && (
          <p className="mt-3 text-sm text-red-400 text-center">
            예약 취소에 실패했습니다. 다시 시도해 주세요.
          </p>
        )}
      </div>
    </div>
  );
};
