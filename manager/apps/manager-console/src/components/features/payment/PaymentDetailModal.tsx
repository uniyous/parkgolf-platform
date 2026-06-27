import React from 'react';
import { cn } from '@/utils';
import type { Payment, PaymentStatus, PaymentMethod, RefundStatus } from '@/types';

interface PaymentDetailModalProps {
  payment: Payment | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onRefundClick: (payment: Payment) => void;
}

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string }> = {
  READY: { label: '준비', color: 'bg-gray-500/20 text-gray-300' },
  IN_PROGRESS: { label: '진행중', color: 'bg-blue-500/20 text-blue-300' },
  WAITING_FOR_DEPOSIT: { label: '입금대기', color: 'bg-yellow-500/20 text-yellow-300' },
  DONE: { label: '완료', color: 'bg-green-500/20 text-green-300' },
  CANCELED: { label: '취소', color: 'bg-red-500/20 text-red-300' },
  PARTIAL_CANCELED: { label: '부분취소', color: 'bg-orange-500/20 text-orange-300' },
  ABORTED: { label: '중단', color: 'bg-gray-500/20 text-gray-400' },
  EXPIRED: { label: '만료', color: 'bg-gray-500/20 text-gray-400' },
};

const REFUND_STATUS_CONFIG: Record<RefundStatus, { label: string; color: string }> = {
  PENDING: { label: '대기', color: 'bg-yellow-500/20 text-yellow-300' },
  PROCESSING: { label: '처리중', color: 'bg-blue-500/20 text-blue-300' },
  COMPLETED: { label: '완료', color: 'bg-green-500/20 text-green-300' },
  FAILED: { label: '실패', color: 'bg-red-500/20 text-red-300' },
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: '카드',
  TRANSFER: '계좌이체',
  VIRTUAL_ACCOUNT: '가상계좌',
  EASY_PAY: '간편결제',
  MOBILE: '휴대폰',
};

const REQUESTER_LABELS: Record<string, string> = {
  USER: '사용자',
  ADMIN: '관리자',
  SYSTEM: '시스템',
};

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-white/5">
    <span className="text-sm text-white/50">{label}</span>
    <span className="text-sm text-white/90">{value}</span>
  </div>
);

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  payment,
  isOpen,
  isLoading,
  onClose,
  onRefundClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/15 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">결제 상세</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {isLoading || !payment ? (
          <div className="p-8 text-center text-white/60">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-3" />
            결제 정보를 불러오는 중...
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* 섹션 1: 기본 정보 */}
            <div>
              <h3 className="text-sm font-medium text-white/70 mb-3">기본 정보</h3>
              <div className="bg-white/5 rounded-lg p-4">
                <InfoRow label="주문번호" value={<span className="font-mono">{payment.orderId}</span>} />
                <InfoRow label="결제키" value={<span className="font-mono text-xs">{payment.paymentKey}</span>} />
                <InfoRow label="결제명" value={payment.orderName} />
                <InfoRow
                  label="결제 금액"
                  value={<span className="text-emerald-400 font-bold">₩{payment.amount.toLocaleString()}</span>}
                />
                <InfoRow
                  label="결제 상태"
                  value={
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', PAYMENT_STATUS_CONFIG[payment.status]?.color)}>
                      {PAYMENT_STATUS_CONFIG[payment.status]?.label || payment.status}
                    </span>
                  }
                />
                <InfoRow label="승인일시" value={formatDateTime(payment.approvedAt)} />
              </div>
            </div>

            {/* 섹션 2: 결제수단 상세 */}
            <div>
              <h3 className="text-sm font-medium text-white/70 mb-3">결제수단 상세</h3>
              <div className="bg-white/5 rounded-lg p-4">
                <InfoRow label="결제수단" value={METHOD_LABELS[payment.method] || payment.method} />
                {payment.method === 'CARD' && (
                  <>
                    {payment.cardCompany && <InfoRow label="카드사" value={payment.cardCompany} />}
                    {payment.cardNumber && <InfoRow label="카드번호" value={payment.cardNumber} />}
                    {payment.cardType && <InfoRow label="카드종류" value={payment.cardType === 'CREDIT' ? '신용' : '체크'} />}
                    <InfoRow
                      label="할부"
                      value={payment.installmentMonths ? `${payment.installmentMonths}개월` : '일시불'}
                    />
                  </>
                )}
                {payment.method === 'VIRTUAL_ACCOUNT' && (
                  <>
                    {payment.virtualBankCode && <InfoRow label="은행" value={payment.virtualBankCode} />}
                    {payment.virtualAccountNumber && <InfoRow label="계좌번호" value={payment.virtualAccountNumber} />}
                    {payment.virtualDueDate && <InfoRow label="입금기한" value={formatDateTime(payment.virtualDueDate)} />}
                  </>
                )}
              </div>
            </div>

            {/* 섹션 3: 환불 이력 */}
            {payment.refunds && payment.refunds.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white/70 mb-3">환불 이력 ({payment.refunds.length}건)</h3>
                <div className="bg-white/5 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left px-3 py-2 text-xs text-white/50">환불 금액</th>
                        <th className="text-left px-3 py-2 text-xs text-white/50">사유</th>
                        <th className="text-center px-3 py-2 text-xs text-white/50">상태</th>
                        <th className="text-center px-3 py-2 text-xs text-white/50">요청자</th>
                        <th className="text-left px-3 py-2 text-xs text-white/50">처리일시</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payment.refunds.map((refund) => (
                        <tr key={refund.id} className="border-b border-white/5">
                          <td className="px-3 py-2 text-sm text-red-400 font-medium">
                            ₩{refund.cancelAmount.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-sm text-white/70 max-w-[200px] truncate">
                            {refund.cancelReason}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={cn('px-2 py-0.5 rounded-full text-xs', REFUND_STATUS_CONFIG[refund.refundStatus]?.color)}>
                              {REFUND_STATUS_CONFIG[refund.refundStatus]?.label || refund.refundStatus}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-sm text-white/60">
                            {REQUESTER_LABELS[refund.requestedByType] || refund.requestedByType}
                          </td>
                          <td className="px-3 py-2 text-sm text-white/60">
                            {formatDateTime(refund.refundedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 섹션 4: 연결 정보 */}
            <div>
              <h3 className="text-sm font-medium text-white/70 mb-3">연결 정보</h3>
              <div className="bg-white/5 rounded-lg p-4">
                <InfoRow
                  label="예약번호"
                  value={
                    <span className="text-emerald-400 font-mono">
                      {payment.bookingNumber || `#${payment.bookingId}`}
                    </span>
                  }
                />
                {payment.userName && <InfoRow label="사용자" value={payment.userName} />}
                {payment.userEmail && <InfoRow label="이메일" value={payment.userEmail} />}
              </div>
            </div>

            {/* 환불 버튼 */}
            {(payment.status === 'DONE' || payment.status === 'PARTIAL_CANCELED') && (
              <div className="flex justify-end">
                <button
                  onClick={() => onRefundClick(payment)}
                  className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                >
                  환불 처리
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
