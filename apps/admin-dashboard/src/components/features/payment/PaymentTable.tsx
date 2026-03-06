import React from 'react';
import { cn } from '@/utils';
import type { Payment, PaymentStatus, PaymentMethod } from '@/types';
import type { Pagination } from '@/types/common';

interface PaymentTableProps {
  payments: Payment[];
  pagination: Pagination;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPaymentClick: (payment: Payment) => void;
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

const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, { label: string; color: string }> = {
  CARD: { label: '카드', color: 'bg-blue-500/20 text-blue-300' },
  TRANSFER: { label: '계좌이체', color: 'bg-green-500/20 text-green-300' },
  VIRTUAL_ACCOUNT: { label: '가상계좌', color: 'bg-purple-500/20 text-purple-300' },
  EASY_PAY: { label: '간편결제', color: 'bg-cyan-500/20 text-cyan-300' },
  MOBILE: { label: '휴대폰', color: 'bg-orange-500/20 text-orange-300' },
};

const StatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const config = PAYMENT_STATUS_CONFIG[status] || { label: status, color: 'bg-gray-500/20 text-gray-300' };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
      {config.label}
    </span>
  );
};

const MethodBadge: React.FC<{ method: PaymentMethod }> = ({ method }) => {
  const config = PAYMENT_METHOD_CONFIG[method] || { label: method, color: 'bg-gray-500/20 text-gray-300' };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
      {config.label}
    </span>
  );
};

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  pagination,
  isLoading,
  onPageChange,
  onPaymentClick,
  onRefundClick,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-8">
        <div className="flex items-center justify-center text-white/60">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400 mr-3" />
          결제 내역을 불러오는 중...
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-8 text-center text-white/40">
        조건에 맞는 결제 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">주문번호</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">결제명</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-white/50 uppercase">금액</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-white/50 uppercase">결제수단</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">카드사</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-white/50 uppercase">상태</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">승인일시</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-white/50 uppercase">예약번호</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-white/50 uppercase">액션</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => onPaymentClick(payment)}
              >
                <td className="px-4 py-3 text-sm text-white/80 font-mono">{payment.orderId}</td>
                <td className="px-4 py-3 text-sm text-white/80">{payment.orderName}</td>
                <td className="px-4 py-3 text-sm text-white font-medium text-right">
                  ₩{payment.amount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <MethodBadge method={payment.method} />
                </td>
                <td className="px-4 py-3 text-sm text-white/60">
                  {payment.cardCompany || '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={payment.status} />
                </td>
                <td className="px-4 py-3 text-sm text-white/60">
                  {formatDateTime(payment.approvedAt)}
                </td>
                <td className="px-4 py-3 text-sm text-emerald-400 font-mono">
                  {payment.bookingNumber || `#${payment.bookingId}`}
                </td>
                <td className="px-4 py-3 text-center">
                  {(payment.status === 'DONE' || payment.status === 'PARTIAL_CANCELED') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefundClick(payment);
                      }}
                      className="px-3 py-1 text-xs bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/30 transition-colors"
                    >
                      환불
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <div className="text-sm text-white/40">
            총 {pagination.total}건 중 {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)}건
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-sm rounded-md bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              이전
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              const startPage = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));
              const pageNum = startPage + i;
              if (pageNum > pagination.totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md',
                    pageNum === pagination.page
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : 'bg-white/5 text-white/60 hover:bg-white/10',
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-sm rounded-md bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
