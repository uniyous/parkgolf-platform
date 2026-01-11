import React from 'react';
import { Eye, XCircle, CheckCircle, UserX } from 'lucide-react';
import type { Booking, BookingStatusType } from '@/types';

const BOOKING_STATUSES: Record<string, { label: string; color: string }> = {
  PENDING: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: '확정', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: '완료', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: '취소', color: 'bg-red-100 text-red-800' },
  NO_SHOW: { label: '노쇼', color: 'bg-gray-100 text-gray-800' },
  SAGA_PENDING: { label: '처리중', color: 'bg-purple-100 text-purple-800' },
  SAGA_FAILED: { label: '실패', color: 'bg-red-100 text-red-800' },
};

const PAYMENT_METHODS: Record<string, string> = {
  CARD: '카드',
  CASH: '현금',
  TRANSFER: '계좌이체',
  MOBILE: '모바일',
};

interface BookingTableProps {
  bookings: Booking[];
  onViewDetail: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onComplete: (booking: Booking) => void;
  onNoShow: (booking: Booking) => void;
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

const isToday = (dateStr: string): boolean => {
  const today = new Date();
  const bookingDate = new Date(dateStr);
  return (
    today.getFullYear() === bookingDate.getFullYear() &&
    today.getMonth() === bookingDate.getMonth() &&
    today.getDate() === bookingDate.getDate()
  );
};

const getCourseDisplayName = (booking: Booking): string => {
  if (booking.gameName) {
    return booking.gameName;
  }
  const courses: string[] = [];
  if (booking.frontNineCourseName) courses.push(booking.frontNineCourseName);
  if (booking.backNineCourseName) courses.push(booking.backNineCourseName);
  if (courses.length > 0) {
    return courses.join(' + ');
  }
  return '-';
};

const getCustomerName = (booking: Booking): string => {
  return booking.userName || booking.customerName || booking.guestName || '미등록';
};

const getCustomerPhone = (booking: Booking): string => {
  return booking.userPhone || booking.customerPhone || booking.guestPhone || '-';
};

export const BookingTable: React.FC<BookingTableProps> = ({
  bookings,
  onViewDetail,
  onCancel,
  onComplete,
  onNoShow,
  isActionPending = false,
}) => {
  if (bookings.length === 0) {
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
          <h3 className="mt-2 text-lg font-medium text-gray-900">예약이 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            선택한 조건에 해당하는 예약이 없습니다.
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
                클럽/코스
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                날짜/시간
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                예약자
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                인원
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                금액
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                결제
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => {
              const isTodayBooking = isToday(booking.bookingDate);
              const statusConfig = BOOKING_STATUSES[booking.status] || {
                label: booking.status,
                color: 'bg-gray-100 text-gray-800',
              };

              return (
                <tr
                  key={booking.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    isTodayBooking ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  {/* 예약번호 */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {booking.bookingNumber || `B${String(booking.id).padStart(4, '0')}`}
                      </span>
                      {isTodayBooking && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          오늘
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 클럽/코스 */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-[160px]">
                      {booking.clubName || '-'}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[160px]">
                      {getCourseDisplayName(booking)}
                    </div>
                  </td>

                  {/* 날짜/시간 */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDisplayDate(booking.bookingDate)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {booking.startTime}
                      {booking.endTime && ` ~ ${booking.endTime}`}
                    </div>
                  </td>

                  {/* 예약자 */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {getCustomerName(booking)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getCustomerPhone(booking)}
                    </div>
                  </td>

                  {/* 인원 */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-900">
                      {booking.playerCount || booking.numberOfPlayers || 0}명
                    </span>
                  </td>

                  {/* 금액 */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm font-medium text-gray-900">
                      ₩{(booking.totalPrice || booking.totalAmount || 0).toLocaleString()}
                    </span>
                  </td>

                  {/* 결제 */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-600">
                      {booking.paymentMethod
                        ? PAYMENT_METHODS[booking.paymentMethod] || booking.paymentMethod
                        : '-'}
                    </span>
                  </td>

                  {/* 상태 */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                  </td>

                  {/* 액션 */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* 상세 보기 */}
                      <button
                        onClick={() => onViewDetail(booking)}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        title="상세 보기"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* CONFIRMED 상태일 때만 완료/노쇼/취소 가능 */}
                      {booking.status === 'CONFIRMED' && (
                        <>
                          <button
                            onClick={() => onComplete(booking)}
                            disabled={isActionPending}
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                            title="완료 처리"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onNoShow(booking)}
                            disabled={isActionPending}
                            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                            title="노쇼 처리"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onCancel(booking)}
                            disabled={isActionPending}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="취소"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {/* PENDING 상태일 때 취소만 가능 */}
                      {booking.status === 'PENDING' && (
                        <button
                          onClick={() => onCancel(booking)}
                          disabled={isActionPending}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="취소"
                        >
                          <XCircle className="h-4 w-4" />
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
