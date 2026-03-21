import { SagaDefinition } from './saga-definition.interface';
import { NATS_TIMEOUTS } from '../../common/constants/nats.constants';

/**
 * 예약 취소 Saga (사용자/관리자 공용)
 *
 * 흐름: 취소 정책 검증 → 환불 정책 계산 → 예약 취소 → 결제 환불
 *       → 슬롯 복구 → 파트너 확인 → (외부 취소 통보) → 알림
 */
export const CancelBookingSaga: SagaDefinition = {
  name: 'CANCEL_BOOKING',
  steps: [
    {
      name: 'CHECK_CANCELLATION_POLICY',
      action: 'policy.cancellation.resolve',
      compensate: null,
      timeout: NATS_TIMEOUTS.QUICK,
      targetService: 'BOOKING_SERVICE',
      buildRequest: (payload) => ({
        clubId: payload.clubId,
        companyId: payload.companyId,
      }),
    },
    {
      name: 'CALCULATE_REFUND',
      action: 'policy.refund.resolve',
      compensate: null,
      timeout: NATS_TIMEOUTS.QUICK,
      targetService: 'BOOKING_SERVICE',
      buildRequest: (payload) => ({
        clubId: payload.clubId,
        companyId: payload.companyId,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        refundRate: response.refundRate,
        calculatedRefundAmount: response.refundAmount,
      }),
    },
    {
      name: 'CANCEL_BOOKING_RECORD',
      action: 'booking.saga.cancel',
      compensate: 'booking.saga.restoreStatus',
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'BOOKING_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        cancelReason: payload.cancelReason,
        cancelledBy: payload.triggeredById,
        cancelledByType: payload.triggeredBy,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        previousStatus: response.previousStatus,
        gameTimeSlotId: response.gameTimeSlotId,
        playerCount: response.playerCount,
        paymentMethod: response.paymentMethod,
        userId: response.userId,
        bookingNumber: response.bookingNumber,
        userEmail: response.userEmail,
        userName: response.userName,
      }),
    },
    {
      name: 'CANCEL_PAYMENT',
      action: 'payment.cancelByBookingId',
      compensate: null,
      timeout: NATS_TIMEOUTS.PAYMENT,
      targetService: 'PAYMENT_SERVICE',
      condition: (payload) => {
        const method = payload.paymentMethod as string;
        return !!method && method !== 'onsite';
      },
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        cancelReason: payload.cancelReason || '예약 취소',
        cancelAmount: payload.cancelAmount || payload.calculatedRefundAmount,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        cancelAmount: response.cancelAmount,
        paymentKey: response.paymentKey,
      }),
    },
    {
      name: 'RELEASE_SLOT',
      action: 'slot.release',
      compensate: null,
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'COURSE_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        gameTimeSlotId: payload.gameTimeSlotId,
        playerCount: payload.playerCount,
        reason: payload.cancelReason || '예약 취소',
        requestedAt: new Date().toISOString(),
      }),
    },
    {
      name: 'CHECK_PARTNER',
      action: 'partner.config.checkByClub',
      compensate: null,
      timeout: NATS_TIMEOUTS.QUICK,
      targetService: 'PARTNER_SERVICE',
      condition: (payload) => !!payload.clubId,
      buildRequest: (payload) => ({
        clubId: payload.clubId,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        isPartnerClub: !!response.isPartnerClub,
      }),
    },
    {
      name: 'NOTIFY_EXTERNAL_CANCEL',
      action: 'partner.booking.notifyCancelled',
      compensate: null,
      timeout: NATS_TIMEOUTS.PARTNER,
      targetService: 'PARTNER_SERVICE',
      optional: true,
      condition: (payload) => !!payload.isPartnerClub,
      buildRequest: (payload) => ({
        clubId: payload.clubId,
        bookingId: payload.bookingId,
        bookingNumber: payload.bookingNumber,
        cancelReason: payload.cancelReason,
      }),
    },
    {
      name: 'SEND_CANCELLATION_NOTICE',
      action: 'notification.booking.cancelled',
      compensate: null,
      timeout: NATS_TIMEOUTS.NOTIFICATION,
      targetService: 'NOTIFICATION_SERVICE',
      optional: true,
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        bookingNumber: payload.bookingNumber,
        userId: payload.userId,
        cancelAmount: payload.cancelAmount,
        cancelReason: payload.cancelReason,
        cancelledAt: new Date().toISOString(),
        userEmail: payload.userEmail,
        userName: payload.userName,
      }),
    },
  ],
};
