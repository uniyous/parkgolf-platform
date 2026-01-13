import React from 'react';
import { Eye, DollarSign } from 'lucide-react';
import type { Booking } from '@/types';

const CANCELLATION_TYPES: Record<string, { label: string; color: string }> = {
  USER_NORMAL: { label: '정상 취소', color: 'bg-blue-100 text-blue-800' },
  USER_LATE: { label: '지연 취소', color: 'bg-yellow-100 text-yellow-800' },
  USER_LASTMINUTE: { label: '긴급 취소', color: 'bg-orange-100 text-orange-800' },
  ADMIN: { label: '관리자 취소', color: 'bg-purple-100 text-purple-800' },
  SYSTEM: { label: '시스템 취소', color: 'bg-gray-100 text-gray-800' },
};

const REFUND_STATUSES: Record<string, { label: string; color: string }> = {
  PENDING: { label: '환불 대기', color: 'bg-yellow-100 text-yellow-800' },
  PROCESSING: { label: '처리 중', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: '환불 완료', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: '환불 거절', color: 'bg-red-100 text-red-800' },
  NO_REFUND: { label: '환불 없음', color: 'bg-gray-100 text-gray-800' },
};

export interface CancellationRecord {
  booking: Booking;
  cancellationType: string;
  cancelledAt: string;
  cancelledBy: string;
  cancelReason?: string;
  refundStatus: string;
  refundAmount: number;
  refundRate: number;
  refundFee: number;
  processedAt?: string;
}

interface CancellationTableProps {
  records: CancellationRecord[];
  onViewDetail: (record: CancellationRecord) => void;
  onProcessRefund: (record: CancellationRecord) => void;
  isActionPending?: boolean;
}

const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekDay = weekDays[date.getDay()];
  return `${month}/${day}(${weekDay})`;
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getCustomerName = (booking: Booking): string => {
  return booking.userName || booking.customerName || booking.guestName || '미등록';
};

const getCustomerPhone = (booking: Booking): string => {
  return booking.userPhone || booking.customerPhone || booking.guestPhone || '-';
};

export const CancellationTable: React.FC<CancellationTableProps> = ({
  records,
  onViewDetail,
  onProcessRefund,
  isActionPending = false,
}) => {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">취소된 예약이 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            선택한 조건에 해당하는 취소 내역이 없습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                예약번호
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                예약자
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                예약일
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                취소 유형
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                취소 일시
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                결제 금액
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                환불 금액
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                환불 상태
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record) => {
              const cancellationTypeConfig = CANCELLATION_TYPES[record.cancellationType] || {
                label: record.cancellationType,
                color: 'bg-gray-100 text-gray-800',
              };
              const refundStatusConfig = REFUND_STATUSES[record.refundStatus] || {
                label: record.refundStatus,
                color: 'bg-gray-100 text-gray-800',
              };
              const canProcessRefund =
                record.refundStatus === 'PENDING' && record.refundAmount > 0;

              return (
                <tr key={record.booking.id} className="hover:bg-gray-50 transition-colors">
                  {/* 예약번호 */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {record.booking.bookingNumber ||
                        `B${String(record.booking.id).padStart(4, '0')}`}
                    </span>
                  </td>

                  {/* 예약자 */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {getCustomerName(record.booking)}
                    </div>
                    <div className="text-xs text-gray-500">{getCustomerPhone(record.booking)}</div>
                  </td>

                  {/* 예약일 */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDisplayDate(record.booking.bookingDate)}
                    </div>
                    <div className="text-xs text-gray-500">{record.booking.startTime}</div>
                  </td>

                  {/* 취소 유형 */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cancellationTypeConfig.color}`}
                    >
                      {cancellationTypeConfig.label}
                    </span>
                  </td>

                  {/* 취소 일시 */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDateTime(record.cancelledAt)}</div>
                    <div className="text-xs text-gray-500">{record.cancelledBy}</div>
                  </td>

                  {/* 결제 금액 */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm text-gray-900">
                      ₩{(record.booking.totalPrice || 0).toLocaleString()}
                    </span>
                  </td>

                  {/* 환불 금액 */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-blue-600">
                      ₩{record.refundAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {record.refundRate}% (수수료 ₩{record.refundFee.toLocaleString()})
                    </div>
                  </td>

                  {/* 환불 상태 */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${refundStatusConfig.color}`}
                    >
                      {refundStatusConfig.label}
                    </span>
                  </td>

                  {/* 액션 */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onViewDetail(record)}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        title="상세 보기"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {canProcessRefund && (
                        <button
                          onClick={() => onProcessRefund(record)}
                          disabled={isActionPending}
                          className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                          title="환불 처리"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
