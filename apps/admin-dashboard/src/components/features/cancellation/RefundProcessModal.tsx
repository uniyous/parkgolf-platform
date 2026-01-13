import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
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
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">예약번호</p>
              <p className="font-medium text-gray-900">
                {booking.bookingNumber || `B${String(booking.id).padStart(4, '0')}`}
              </p>
            </div>
            <div>
              <p className="text-gray-500">예약자</p>
              <p className="font-medium text-gray-900">{getCustomerName()}</p>
            </div>
            <div>
              <p className="text-gray-500">예약일</p>
              <p className="font-medium text-gray-900">{booking.bookingDate}</p>
            </div>
            <div>
              <p className="text-gray-500">결제 금액</p>
              <p className="font-medium text-gray-900">
                ₩{(booking.totalPrice || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* 환불 금액 계산 */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700">환불 금액 설정</h4>

          {/* 정책 기반 환불 금액 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">정책 기반 환불 금액</p>
                <p className="text-xs text-gray-500 mt-1">
                  환불율 {record.refundRate}% 적용 (수수료 ₩{record.refundFee.toLocaleString()})
                </p>
              </div>
              <p className="text-xl font-bold text-blue-600">
                ₩{record.refundAmount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 금액 조정 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              실제 환불 금액 (조정 가능)
            </label>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  ₩
                </span>
                <input
                  type="number"
                  value={adjustedAmount}
                  onChange={(e) => handleAmountChange(Number(e.target.value))}
                  min={0}
                  max={maxRefundAmount}
                  className={`w-full pl-8 pr-4 py-2 border rounded-lg text-lg font-medium focus:ring-2 focus:ring-blue-500 ${
                    isValidAmount
                      ? 'border-gray-300'
                      : 'border-red-500 focus:ring-red-500'
                  }`}
                />
              </div>
              <button
                onClick={() => handleAmountChange(record.refundAmount)}
                className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                정책 금액
              </button>
              <button
                onClick={() => handleAmountChange(maxRefundAmount)}
                className="px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                전액
              </button>
            </div>
            {!isValidAmount && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                환불 금액은 0원 이상 {maxRefundAmount.toLocaleString()}원 이하여야 합니다.
              </p>
            )}
          </div>

          {/* 금액 조정 경고 */}
          {isAdjusted && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">금액이 조정되었습니다</p>
                <p className="text-yellow-700">
                  정책 금액(₩{record.refundAmount.toLocaleString()})과 다른 금액으로 환불됩니다.
                  사유를 메모에 기록해주세요.
                </p>
              </div>
            </div>
          )}

          {/* 메모 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              환불 메모 {isAdjusted && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="환불 처리에 대한 메모를 입력하세요..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 최종 확인 */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">최종 환불 금액</p>
              <p className="text-2xl font-bold text-green-600">
                ₩{adjustedAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValidAmount || isProcessing || (isAdjusted && !note.trim())}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                처리 중...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                환불 처리
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
