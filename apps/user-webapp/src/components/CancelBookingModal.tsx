import React, { useState } from 'react';
import { Calendar, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatPrice } from '@/lib/formatting';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { type BookingWithCancel } from '@/lib/api/bookingApi';
import { useCancelBookingMutation } from '@/hooks/queries/booking';
import { CANCEL_REASONS } from '@/lib/constants';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface CancelBookingModalProps {
  booking: BookingWithCancel;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const cancelMutation = useCancelBookingMutation();

  const handleCancel = async () => {
    const reason = selectedReason === '기타' ? customReason : selectedReason;

    try {
      await cancelMutation.mutateAsync({
        id: booking.id,
        reason: reason || undefined,
      });
      showSuccessToast('예약이 취소되었습니다');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      showErrorToast('예약 취소에 실패했습니다', '다시 시도해주세요.');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedReason('');
      setCustomReason('');
      onClose();
    }
  };

  const canSubmit = selectedReason && (selectedReason !== '기타' || customReason.trim());

  const content = (
    <div className="space-y-4">
      {/* Booking Info */}
      <div className="bg-white/5 rounded-lg p-4 space-y-2">
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
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
        <p className="text-sm text-amber-200">
          예약 취소 시 결제된 금액은 환불 정책에 따라 처리됩니다.
          예약일 3일 전까지 무료 취소가 가능합니다.
        </p>
      </div>

      {/* Reason Selection */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          취소 사유 선택
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CANCEL_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
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
        <div>
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

      {/* Error Message */}
      {cancelMutation.isError && (
        <p className="text-sm text-red-400 text-center">
          예약 취소에 실패했습니다. 다시 시도해 주세요.
        </p>
      )}
    </div>
  );

  return (
    <ConfirmModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      type="danger"
      title="예약 취소"
      content={content}
      okText="예약 취소하기"
      cancelText="돌아가기"
      onOk={handleCancel}
      loading={cancelMutation.isPending}
      disabled={!canSubmit}
    />
  );
};
