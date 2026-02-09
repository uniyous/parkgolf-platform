import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import type { CancellationRecord } from './CancellationTable';

interface RefundProcessModalProps {
  record: CancellationRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (record: CancellationRecord, adjustedAmount: number, note: string) => void;
  isProcessing?: boolean;
}

export const RefundProcessModal: React.FC<RefundProcessModalProps> = ({
  record,
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false,
}) => {
  const [adjustedAmount, setAdjustedAmount] = useState(0);
  const [note, setNote] = useState('');
  const [isAdjusted, setIsAdjusted] = useState(false);

  useEffect(() => {
    if (record) {
      setAdjustedAmount(record.refundAmount);
      setNote('');
      setIsAdjusted(false);
    }
  }, [record]);

  if (!record) return null;

  const { booking } = record;
  const maxRefundAmount = booking.totalPrice || 0;
  const isValidAmount = adjustedAmount >= 0 && adjustedAmount <= maxRefundAmount;

  const handleAmountChange = (value: number) => {
    setAdjustedAmount(value);
    setIsAdjusted(value !== record.refundAmount);
  };

  const handleConfirm = () => {
    if (isValidAmount) {
      onConfirm(record, adjustedAmount, note);
    }
  };

  const getCustomerName = (): string => {
    return booking.userName || booking.customerName || booking.guestName || '미등록';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="환불 처리" maxWidth="md">
      <div className="space-y-6">
        {/* 예약 정보 요약 */}
        <div className="bg-white/5 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/50">예약번호</p>
              <p className="font-medium text-white">
                {booking.bookingNumber || `B${String(booking.id).padStart(4, '0')}`}
              </p>
            </div>
            <div>
              <p className="text-white/50">예약자</p>
              <p className="font-medium text-white">{getCustomerName()}</p>
            </div>
            <div>
              <p className="text-white/50">예약일</p>
              <p className="font-medium text-white">{booking.bookingDate}</p>
            </div>
            <div>
              <p className="text-white/50">결제 금액</p>
              <p className="font-medium text-white">
                ₩{(booking.totalPrice || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* 환불 금액 계산 */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-white/70">환불 금액 설정</h4>

          {/* 정책 기반 환불 금액 */}
          <div className="bg-emerald-500/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">정책 기반 환불 금액</p>
                <p className="text-xs text-white/50 mt-1">
                  환불율 {record.refundRate}% 적용 (수수료 ₩{record.refundFee.toLocaleString()})
                </p>
              </div>
              <p className="text-xl font-bold text-emerald-400">
                ₩{record.refundAmount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 금액 조정 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              실제 환불 금액 (조정 가능)
            </label>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
                  ₩
                </span>
                <input
                  type="number"
                  value={adjustedAmount}
                  onChange={(e) => handleAmountChange(Number(e.target.value))}
                  min={0}
                  max={maxRefundAmount}
                  className={`w-full pl-8 pr-4 py-2 border rounded-lg text-lg font-medium focus:ring-2 focus:ring-emerald-500 bg-white/10 text-white ${
                    isValidAmount
                      ? 'border-white/15'
                      : 'border-red-500 focus:ring-red-500'
                  }`}
                />
              </div>
              <button
                onClick={() => handleAmountChange(record.refundAmount)}
                className="px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
              >
                정책 금액
              </button>
              <button
                onClick={() => handleAmountChange(maxRefundAmount)}
                className="px-3 py-2 text-sm text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
              >
                전액
              </button>
            </div>
            {!isValidAmount && (
              <p className="text-sm text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                환불 금액은 0원 이상 {maxRefundAmount.toLocaleString()}원 이하여야 합니다.
              </p>
            )}
          </div>

          {/* 금액 조정 경고 */}
          {isAdjusted && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-300">금액이 조정되었습니다</p>
                <p className="text-yellow-400">
                  정책 금액(₩{record.refundAmount.toLocaleString()})과 다른 금액으로 환불됩니다.
                  사유를 메모에 기록해주세요.
                </p>
              </div>
            </div>
          )}

          {/* 메모 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              환불 메모 {isAdjusted && <span className="text-red-400">*</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="환불 처리에 대한 메모를 입력하세요..."
              rows={3}
              className="w-full px-3 py-2 border border-white/15 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white/10 text-white placeholder-white/40"
            />
          </div>
        </div>

        {/* 최종 확인 */}
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/60">최종 환불 금액</p>
              <p className="text-2xl font-bold text-green-400">
                ₩{adjustedAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/15">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValidAmount || (isAdjusted && !note.trim())}
            loading={isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            환불 처리
          </Button>
        </div>
      </div>
    </Modal>
  );
};
