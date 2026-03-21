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
import type { Booking, BookingParticipant } from '@/types';

const BOOKING_STATUSES: Record<string, { label: string; color: string }> = {
  PENDING: { label: '대기', color: 'bg-yellow-500/20 text-yellow-400' },
  SLOT_RESERVED: { label: '결제대기', color: 'bg-orange-500/20 text-orange-400' },
  CONFIRMED: { label: '확정', color: 'bg-emerald-500/20 text-emerald-400' },
  COMPLETED: { label: '완료', color: 'bg-green-500/20 text-green-400' },
  CANCELLED: { label: '취소', color: 'bg-red-500/20 text-red-400' },
  NO_SHOW: { label: '노쇼', color: 'bg-white/20 text-white/70' },
  FAILED: { label: '실패', color: 'bg-red-500/20 text-red-400' },
  SAGA_PENDING: { label: '처리중', color: 'bg-purple-500/20 text-purple-400' },
  SAGA_FAILED: { label: '실패', color: 'bg-red-500/20 text-red-400' },
};

const PAYMENT_METHODS: Record<string, { label: string; color: string }> = {
  onsite: { label: '현장결제', color: 'text-blue-400' },
  card: { label: '카드결제', color: 'text-emerald-400' },
  dutchpay: { label: '더치페이', color: 'text-purple-400' },
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
    color: 'bg-white/20 text-white/70',
  };

  const InfoItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | React.ReactNode;
    className?: string;
  }> = ({ icon, label, value, className }) => (
    <div className={`flex items-start gap-3 ${className || ''}`}>
      <div className="text-white/40 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/50">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="예약 상세 정보" maxWidth="lg">
      <div className="space-y-6">
        {/* 헤더 - 예약번호 & 상태 */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="text-xs text-white/50">예약번호</p>
            <p className="text-lg font-bold text-white">
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
            <h4 className="text-sm font-semibold text-white/70 border-b border-white/15 pb-2">
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
            <h4 className="text-sm font-semibold text-white/70 border-b border-white/15 pb-2">
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
          <h4 className="text-sm font-semibold text-white/70 border-b border-white/15 pb-2">결제 정보</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/5 rounded-lg p-4">
            <div>
              <p className="text-xs text-white/50">인원당 금액</p>
              <p className="text-sm font-medium text-white">
                ₩{(booking.pricePerPerson || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50">수수료</p>
              <p className="text-sm font-medium text-white">
                ₩{(booking.serviceFee || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50">총 금액</p>
              <p className="text-lg font-bold text-emerald-400">
                ₩{(booking.totalPrice || booking.totalAmount || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50">결제 수단</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <CreditCard className="h-4 w-4 text-white/40" />
                {booking.paymentMethod && PAYMENT_METHODS[booking.paymentMethod] ? (
                  <span className={PAYMENT_METHODS[booking.paymentMethod].color}>
                    {PAYMENT_METHODS[booking.paymentMethod].label}
                  </span>
                ) : (
                  <span className="text-white">{booking.paymentMethod || '-'}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 그룹/더치페이 정보 */}
        {booking.paymentMethod === 'dutchpay' && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/70 border-b border-white/15 pb-2">더치페이 정보</h4>
            {/* 그룹 요약 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-purple-500/10 rounded-lg p-4">
              {booking.groupId && (
                <div>
                  <p className="text-xs text-white/50">그룹 ID</p>
                  <p className="text-sm font-medium text-purple-400">{booking.groupId}</p>
                </div>
              )}
              {booking.teamNumber && (
                <div>
                  <p className="text-xs text-white/50">팀 번호</p>
                  <p className="text-sm font-medium text-white">{booking.teamNumber}팀</p>
                </div>
              )}
              <div>
                <p className="text-xs text-white/50">결제 현황</p>
                <p className="text-sm font-medium text-purple-400">
                  {booking.participants?.filter((p) => p.status === 'PAID').length || 0}
                  /{booking.participants?.length || 0}명 결제완료
                </p>
              </div>
            </div>
            {/* 참가자별 결제 상태 */}
            {booking.participants && booking.participants.length > 0 && (
              <div className="bg-white/5 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-xs text-white/50 font-medium px-4 py-2">참가자</th>
                      <th className="text-left text-xs text-white/50 font-medium px-4 py-2">역할</th>
                      <th className="text-right text-xs text-white/50 font-medium px-4 py-2">금액</th>
                      <th className="text-center text-xs text-white/50 font-medium px-4 py-2">결제상태</th>
                      <th className="text-right text-xs text-white/50 font-medium px-4 py-2">결제일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.participants.map((participant: BookingParticipant) => (
                      <tr key={participant.userId} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-2.5">
                          <p className="text-white font-medium">{participant.userName}</p>
                          <p className="text-xs text-white/40">{participant.userEmail}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            participant.role === 'BOOKER'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-white/10 text-white/60'
                          }`}>
                            {participant.role === 'BOOKER' ? '대표' : '참여'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-white">
                          ₩{participant.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            participant.status === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : participant.status === 'CANCELLED'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {participant.status === 'PAID' ? '결제완료' : participant.status === 'CANCELLED' ? '취소' : '대기'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-white/50">
                          {participant.paidAt ? formatDateTime(participant.paidAt) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 특별 요청사항 */}
        {booking.specialRequests && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white/70 border-b border-white/15 pb-2">특별 요청사항</h4>
            <div className="bg-yellow-500/10 rounded-lg p-4">
              <p className="text-sm text-white/70 whitespace-pre-wrap">
                {booking.specialRequests}
              </p>
            </div>
          </div>
        )}

        {/* 관리자 메모 */}
        {booking.notes && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white/70 border-b border-white/15 pb-2">관리자 메모</h4>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-sm text-white/70 whitespace-pre-wrap">{booking.notes}</p>
            </div>
          </div>
        )}

        {/* SAGA 실패 사유 */}
        {booking.sagaFailReason && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-400 border-b border-white/15 pb-2">실패 사유</h4>
            <div className="bg-red-500/10 rounded-lg p-4">
              <p className="text-sm text-red-400 whitespace-pre-wrap">
                {booking.sagaFailReason}
              </p>
            </div>
          </div>
        )}

        {/* 예약 생성 정보 */}
        <div className="text-xs text-white/40 space-y-1 pt-2 border-t border-white/15">
          <p>생성일시: {formatDateTime(booking.createdAt)}</p>
          <p>수정일시: {formatDateTime(booking.updatedAt)}</p>
          {booking.idempotencyKey && <p>거래 키: {booking.idempotencyKey}</p>}
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t border-white/15">
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
                <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
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

          {/* PENDING / SLOT_RESERVED 상태일 때 취소만 가능 */}
          {(booking.status === 'PENDING' || booking.status === 'SLOT_RESERVED') && (
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
