import React, { useState, useMemo } from 'react';
import {
  usePaymentsQuery,
  useRevenueStatsQuery,
  usePaymentDetailQuery,
  useRefundMutation,
} from '@/hooks/queries/payment';
import type { Payment, PaymentStatus, PaymentFilters as PaymentFilterType } from '@/types';

import { PaymentStatsCards } from '@/components/features/payment/PaymentStatsCards';
import { PaymentFilters } from '@/components/features/payment/PaymentFilters';
import { PaymentTable } from '@/components/features/payment/PaymentTable';
import { PaymentDetailModal } from '@/components/features/payment/PaymentDetailModal';
import { PageLayout } from '@/components/layout';

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

export const PaymentManagementPage: React.FC = () => {
  // 날짜 기본값: 30일 전 ~ 오늘
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  // 필터 상태
  const [startDate, setStartDate] = useState(formatDate(monthAgo));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // 모달 상태
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  // API 필터
  const filters: PaymentFilterType = useMemo(
    () => ({
      startDate,
      endDate,
      status: statusFilter || undefined,
      search: searchKeyword || undefined,
    }),
    [startDate, endDate, statusFilter, searchKeyword],
  );

  // Queries
  const { data: paymentsData, isLoading: isPaymentsLoading } = usePaymentsQuery(filters, page, limit);
  const { data: revenueStats, isLoading: isStatsLoading } = useRevenueStatsQuery({ startDate, endDate });
  const { data: paymentDetail, isLoading: isDetailLoading } = usePaymentDetailQuery(selectedPaymentId || 0);

  // Mutations
  const refundMutation = useRefundMutation();

  const payments = paymentsData?.data ?? [];
  const pagination = paymentsData?.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 0 };

  // Handlers
  const handlePaymentClick = (payment: Payment) => {
    setSelectedPaymentId(payment.id);
    setIsDetailModalOpen(true);
  };

  const handleRefundClick = (payment: Payment) => {
    setRefundPayment(payment);
    setRefundReason('');
    setRefundAmount('');
    setIsRefundModalOpen(true);
  };

  const handleRefundSubmit = () => {
    if (!refundPayment || !refundReason.trim()) return;
    refundMutation.mutate(
      {
        bookingId: refundPayment.bookingId,
        data: {
          cancelReason: refundReason.trim(),
          cancelAmount: refundAmount ? parseInt(refundAmount, 10) : undefined,
        },
      },
      {
        onSuccess: () => {
          setIsRefundModalOpen(false);
          setRefundPayment(null);
          setIsDetailModalOpen(false);
        },
      },
    );
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* 매출 통계 카드 */}
        <PaymentStatsCards stats={revenueStats} isLoading={isStatsLoading} />

        {/* 필터 */}
        <PaymentFilters
          startDate={startDate}
          endDate={endDate}
          statusFilter={statusFilter}
          searchKeyword={searchKeyword}
          onStartDateChange={(d) => { setStartDate(d); setPage(1); }}
          onEndDateChange={(d) => { setEndDate(d); setPage(1); }}
          onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
          onSearchChange={(k) => { setSearchKeyword(k); setPage(1); }}
        />

        {/* 결제 목록 테이블 */}
        <PaymentTable
          payments={payments}
          pagination={pagination}
          isLoading={isPaymentsLoading}
          onPageChange={handlePageChange}
          onPaymentClick={handlePaymentClick}
          onRefundClick={handleRefundClick}
        />
      </div>

      {/* 결제 상세 모달 */}
      <PaymentDetailModal
        payment={paymentDetail || null}
        isOpen={isDetailModalOpen}
        isLoading={isDetailLoading}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedPaymentId(null);
        }}
        onRefundClick={handleRefundClick}
      />

      {/* 환불 처리 모달 */}
      {isRefundModalOpen && refundPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/15 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">환불 처리</h2>
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="text-white/40 hover:text-white/80 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm text-white/50">결제 금액</div>
                <div className="text-lg font-bold text-emerald-400">
                  ₩{refundPayment.amount.toLocaleString()}
                </div>
                <div className="text-xs text-white/40 mt-1">
                  주문번호: {refundPayment.orderId}
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">
                  환불 금액 (비워두면 전체 환불)
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`최대 ₩${refundPayment.amount.toLocaleString()}`}
                  className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">
                  환불 사유 <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="환불 사유를 입력해 주세요"
                  rows={3}
                  className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsRefundModalOpen(false)}
                  className="px-4 py-2 text-sm bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleRefundSubmit}
                  disabled={!refundReason.trim() || refundMutation.isPending}
                  className="px-4 py-2 text-sm bg-red-500/30 text-red-300 rounded-lg hover:bg-red-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {refundMutation.isPending ? '처리 중...' : '환불 처리'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};
