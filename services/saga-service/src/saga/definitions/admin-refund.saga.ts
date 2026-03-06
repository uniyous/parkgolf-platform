import { SagaDefinition } from './saga-definition.interface';
import { NATS_TIMEOUTS } from '../../common/constants/nats.constants';

/**
 * 관리자 환불 Saga
 *
 * 흐름: 환불 정책 검증 → 예약 CANCEL_REQUESTED → 결제 환불 → 슬롯 복구 → 예약 CANCELLED → 알림
 */
export const AdminRefundSaga: SagaDefinition = {
  name: 'ADMIN_REFUND',
  steps: [
    {
      name: 'CHECK_REFUND_POLICY',
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
      action: 'booking.saga.adminCancel',
      compensate: 'booking.saga.restoreStatus',
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'BOOKING_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        cancelReason: payload.cancelReason,
        adminNote: payload.adminNote,
        adminId: payload.triggeredById,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        previousStatus: response.previousStatus,
        gameTimeSlotId: response.gameTimeSlotId,
        playerCount: response.playerCount,
        userId: response.userId,
        bookingNumber: response.bookingNumber,
        userEmail: response.userEmail,
        userName: response.userName,
      }),
    },
    {
      name: 'PROCESS_REFUND',
      action: 'payment.cancelByBookingId',
      compensate: null,
      timeout: NATS_TIMEOUTS.PAYMENT,
      targetService: 'PAYMENT_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        cancelReason: payload.cancelReason || '관리자 환불',
        cancelAmount: payload.cancelAmount || payload.calculatedRefundAmount,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        actualCancelAmount: response.cancelAmount,
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
        reason: '관리자 환불',
        requestedAt: new Date().toISOString(),
      }),
    },
    {
      name: 'FINALIZE_BOOKING',
      action: 'booking.saga.finalizeCancelled',
      compensate: null,
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'BOOKING_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        cancelAmount: payload.actualCancelAmount,
        adminId: payload.triggeredById,
      }),
    },
    {
      name: 'SEND_REFUND_NOTICE',
      action: 'notification.booking.refundCompleted',
      compensate: null,
      timeout: NATS_TIMEOUTS.NOTIFICATION,
      targetService: 'NOTIFICATION_SERVICE',
      optional: true,
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        bookingNumber: payload.bookingNumber,
        userId: payload.userId,
        cancelAmount: payload.actualCancelAmount,
        refundedAt: new Date().toISOString(),
        userEmail: payload.userEmail,
        userName: payload.userName,
      }),
    },
  ],
};
