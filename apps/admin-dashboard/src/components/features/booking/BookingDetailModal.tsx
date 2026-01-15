import React from 'react';
import { Modal, Button } from '@/components/ui';
import { ActionConfirmPopover } from '@/components/common/ActionConfirmPopover';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Users,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  UserX,
} from 'lucide-react';
import type { Booking } from '@/types';

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

interface BookingDetailModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onCancel: (booking: Booking) => void;
  onComplete: (booking: Booking) => void;
  onNoShow: (booking: Booking) => void;
  isActionPending?: boolean;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekDay = weekDays[date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${weekDay})`;
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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

const getCustomerEmail = (booking: Booking): string => {
  return booking.userEmail || booking.customerEmail || booking.guestEmail || '-';
};

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  booking,
  isOpen,
  onClose,
  onCancel,
  onComplete,
  onNoShow,
  isActionPending = false,
}) => {
  if (!booking) return null;

  const statusConfig = BOOKING_STATUSES[booking.status] || {
    label: booking.status,
    color: 'bg-gray-100 text-gray-800',
  };

  const InfoItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | React.ReactNode;
    className?: string;
  }> = ({ icon, label, value, className }) => (
    <div className={`flex items-start gap-3 ${className || ''}`}>
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="예약 상세 정보" maxWidth="lg">
      <div className="space-y-6">
        {/* 헤더 - 예약번호 & 상태 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500">예약번호</p>
            <p className="text-lg font-bold text-gray-900">
              {booking.bookingNumber || `B${String(booking.id).padStart(4, '0')}`}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* 예약 정보 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 좌측 - 골프장/일정 정보 */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">
              골프장/코스 정보
            </h4>
            <InfoItem
              icon={<MapPin className="h-4 w-4" />}
              label="골프장"
              value={booking.clubName || '-'}
            />
            <InfoItem
              icon={<FileText className="h-4 w-4" />}
              label="게임/코스"
              value={getCourseDisplayName(booking)}
            />
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label="예약 날짜"
              value={formatDate(booking.bookingDate)}
            />
            <InfoItem
              icon={<Clock className="h-4 w-4" />}
              label="시간"
              value={
                booking.endTime
                  ? `${booking.startTime} ~ ${booking.endTime}`
                  : booking.startTime
              }
            />
          </div>

          {/* 우측 - 예약자 정보 */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">
              예약자 정보
            </h4>
            <InfoItem
              icon={<User className="h-4 w-4" />}
              label="예약자명"
              value={getCustomerName(booking)}
            />
            <InfoItem
              icon={<Phone className="h-4 w-4" />}
              label="연락처"
              value={getCustomerPhone(booking)}
            />
            <InfoItem
              icon={<Mail className="h-4 w-4" />}
              label="이메일"
              value={getCustomerEmail(booking)}
            />
            <InfoItem
              icon={<Users className="h-4 w-4" />}
              label="플레이 인원"
              value={`${booking.playerCount || booking.numberOfPlayers || 0}명`}
            />
          </div>
        </div>

        {/* 결제 정보 */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">결제 정보</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
            <div>
              <p className="text-xs text-gray-500">인원당 금액</p>
              <p className="text-sm font-medium text-gray-900">
                ₩{(booking.pricePerPerson || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">수수료</p>
              <p className="text-sm font-medium text-gray-900">
                ₩{(booking.serviceFee || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">총 금액</p>
              <p className="text-lg font-bold text-blue-600">
                ₩{(booking.totalPrice || booking.totalAmount || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">결제 수단</p>
              <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                <CreditCard className="h-4 w-4 text-gray-400" />
                {booking.paymentMethod
                  ? PAYMENT_METHODS[booking.paymentMethod] || booking.paymentMethod
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* 특별 요청사항 */}
        {booking.specialRequests && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">특별 요청사항</h4>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {booking.specialRequests}
              </p>
            </div>
          </div>
        )}

        {/* 관리자 메모 */}
        {booking.notes && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">관리자 메모</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
            </div>
          </div>
        )}

        {/* SAGA 실패 사유 */}
        {booking.sagaFailReason && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-600 border-b pb-2">실패 사유</h4>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-700 whitespace-pre-wrap">
                {booking.sagaFailReason}
              </p>
            </div>
          </div>
        )}

        {/* 예약 생성 정보 */}
        <div className="text-xs text-gray-400 space-y-1 pt-2 border-t">
          <p>생성일시: {formatDateTime(booking.createdAt)}</p>
          <p>수정일시: {formatDateTime(booking.updatedAt)}</p>
          {booking.idempotencyKey && <p>거래 키: {booking.idempotencyKey}</p>}
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {/* CONFIRMED 상태일 때만 완료/노쇼/취소 가능 */}
          {booking.status === 'CONFIRMED' && (
            <>
              <ActionConfirmPopover
                actionType="complete"
                targetName={booking.bookingNumber || `B${String(booking.id).padStart(4, '0')}`}
                isPending={isActionPending}
                onConfirm={() => onComplete(booking)}
                side="top"
                align="center"
              >
                <Button className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  완료 처리
                </Button>
              </ActionConfirmPopover>
              <ActionConfirmPopover
                actionType="noshow"
                targetName={booking.bookingNumber || `B${String(booking.id).padStart(4, '0')}`}
                isPending={isActionPending}
                onConfirm={() => onNoShow(booking)}
                side="top"
                align="center"
              >
                <Button variant="secondary" className="bg-gray-600 text-white hover:bg-gray-700">
                  <UserX className="h-4 w-4 mr-1" />
                  노쇼 처리
                </Button>
              </ActionConfirmPopover>
              <ActionConfirmPopover
                actionType="cancel"
                targetName={booking.bookingNumber || `B${String(booking.id).padStart(4, '0')}`}
                isPending={isActionPending}
                onConfirm={() => onCancel(booking)}
                side="top"
                align="center"
              >
                <Button variant="destructive">
                  <XCircle className="h-4 w-4 mr-1" />
                  예약 취소
                </Button>
              </ActionConfirmPopover>
            </>
          )}

          {/* PENDING 상태일 때 취소만 가능 */}
          {booking.status === 'PENDING' && (
            <ActionConfirmPopover
              actionType="cancel"
              targetName={booking.bookingNumber || `B${String(booking.id).padStart(4, '0')}`}
              isPending={isActionPending}
              onConfirm={() => onCancel(booking)}
              side="top"
              align="center"
            >
              <Button variant="destructive">
                <XCircle className="h-4 w-4 mr-1" />
                예약 취소
              </Button>
            </ActionConfirmPopover>
          )}

          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </Modal>
  );
};
