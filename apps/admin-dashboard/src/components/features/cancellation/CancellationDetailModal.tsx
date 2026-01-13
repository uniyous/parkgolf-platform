import React from 'react';
import { Modal } from '@/components/ui/Modal';
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
  XCircle,
  RefreshCw,
  DollarSign,
} from 'lucide-react';
import type { CancellationRecord } from './CancellationTable';

const CANCELLATION_TYPES: Record<string, { label: string; color: string; description: string }> = {
  USER_NORMAL: {
    label: '고객 정상 취소',
    color: 'bg-blue-100 text-blue-800',
    description: '예약일 3일 이전 취소 (정책에 따른 환불)',
  },
  USER_LATE: {
    label: '고객 지연 취소',
    color: 'bg-yellow-100 text-yellow-800',
    description: '예약일 1~3일 전 취소 (부분 환불)',
  },
  USER_LASTMINUTE: {
    label: '고객 긴급 취소',
    color: 'bg-orange-100 text-orange-800',
    description: '예약일 24시간 이내 취소 (환불 불가/제한)',
  },
  ADMIN: {
    label: '관리자 취소',
    color: 'bg-purple-100 text-purple-800',
    description: '관리자에 의한 취소 (전액 환불)',
  },
  SYSTEM: {
    label: '시스템 취소',
    color: 'bg-gray-100 text-gray-800',
    description: '시스템 자동 취소 (전액 환불)',
  },
};

const REFUND_STATUSES: Record<string, { label: string; color: string }> = {
  PENDING: { label: '환불 대기', color: 'bg-yellow-100 text-yellow-800' },
  PROCESSING: { label: '처리 중', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: '환불 완료', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: '환불 거절', color: 'bg-red-100 text-red-800' },
  NO_REFUND: { label: '환불 없음', color: 'bg-gray-100 text-gray-800' },
};

const PAYMENT_METHODS: Record<string, string> = {
  CARD: '카드',
  CASH: '현금',
  TRANSFER: '계좌이체',
  MOBILE: '모바일',
};

interface CancellationDetailModalProps {
  record: CancellationRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onProcessRefund: (record: CancellationRecord) => void;
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

const getCourseDisplayName = (booking: CancellationRecord['booking']): string => {
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

const getCustomerName = (booking: CancellationRecord['booking']): string => {
  return booking.userName || booking.customerName || booking.guestName || '미등록';
};

const getCustomerPhone = (booking: CancellationRecord['booking']): string => {
  return booking.userPhone || booking.customerPhone || booking.guestPhone || '-';
};

const getCustomerEmail = (booking: CancellationRecord['booking']): string => {
  return booking.userEmail || booking.customerEmail || booking.guestEmail || '-';
};

export const CancellationDetailModal: React.FC<CancellationDetailModalProps> = ({
  record,
  isOpen,
  onClose,
  onProcessRefund,
  isActionPending = false,
}) => {
  if (!record) return null;

  const { booking } = record;
  const cancellationTypeConfig = CANCELLATION_TYPES[record.cancellationType] || {
    label: record.cancellationType,
    color: 'bg-gray-100 text-gray-800',
    description: '',
  };
  const refundStatusConfig = REFUND_STATUSES[record.refundStatus] || {
    label: record.refundStatus,
    color: 'bg-gray-100 text-gray-800',
  };
  const canProcessRefund = record.refundStatus === 'PENDING' && record.refundAmount > 0;

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
    <Modal isOpen={isOpen} onClose={onClose} title="취소/환불 상세 정보" maxWidth="lg">
      <div className="space-y-6">
        {/* 헤더 - 예약번호 & 상태 */}
        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
          <div>
            <p className="text-xs text-gray-500">예약번호</p>
            <p className="text-lg font-bold text-gray-900">
              {booking.bookingNumber || `B${String(booking.id).padStart(4, '0')}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800`}
            >
              <XCircle className="h-4 w-4 mr-1" />
              취소됨
            </span>
          </div>
        </div>

        {/* 취소 정보 */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            취소 정보
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">취소 유형</p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cancellationTypeConfig.color} mt-1`}
              >
                {cancellationTypeConfig.label}
              </span>
              <p className="text-xs text-gray-500 mt-1">{cancellationTypeConfig.description}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">취소 일시</p>
              <p className="text-sm font-medium text-gray-900">{formatDateTime(record.cancelledAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">취소 요청자</p>
              <p className="text-sm font-medium text-gray-900">{record.cancelledBy}</p>
            </div>
            {record.cancelReason && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">취소 사유</p>
                <p className="text-sm text-gray-700 mt-1 p-2 bg-white rounded border">
                  {record.cancelReason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 환불 정보 */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            환불 정보
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">결제 금액</p>
              <p className="text-sm font-medium text-gray-900">
                ₩{(booking.totalPrice || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">환불율</p>
              <p className="text-sm font-medium text-blue-600">{record.refundRate}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">환불 수수료</p>
              <p className="text-sm font-medium text-gray-900">
                ₩{record.refundFee.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">환불 금액</p>
              <p className="text-lg font-bold text-blue-600">
                ₩{record.refundAmount.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-blue-100">
            <div>
              <p className="text-xs text-gray-500">환불 상태</p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${refundStatusConfig.color} mt-1`}
              >
                {refundStatusConfig.label}
              </span>
            </div>
            {record.processedAt && (
              <div>
                <p className="text-xs text-gray-500">처리 일시</p>
                <p className="text-sm text-gray-900">{formatDateTime(record.processedAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* 예약 정보 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 좌측 - 골프장/일정 정보 */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">
              예약 정보
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
        <div className="space-y-2">
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
              <p className="text-sm font-medium text-gray-900">
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

        {/* 예약 생성 정보 */}
        <div className="text-xs text-gray-400 space-y-1 pt-2 border-t">
          <p>예약 생성일시: {formatDateTime(booking.createdAt)}</p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {canProcessRefund && (
            <button
              onClick={() => onProcessRefund(record)}
              disabled={isActionPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <DollarSign className="h-4 w-4" />
              환불 처리
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
};
