import { SagaDefinition } from './saga-definition.interface';
import { NATS_TIMEOUTS } from '../../common/constants/nats.constants';

/**
 * 결제 타임아웃 Saga
 *
 * 흐름:
 *   (조건부) 분할결제 환불 → 예약 FAILED 처리 → 슬롯 복구 → 타임아웃 알림
 *
 * 더치페이 분할결제의 경우 일부만 PAID여도 booking 전체 SLOT_RESERVED 10분 초과 시
 * PAID split을 모두 Toss 환불(REFUNDED)하고 PENDING split은 EXPIRED로 변경.
 */
export const PaymentTimeoutSaga: SagaDefinition = {
  name: 'PAYMENT_TIMEOUT',
  steps: [
    {
      name: 'REFUND_PAID_SPLITS',
      action: 'payment.refundPaidSplits',
      compensate: null,
      timeout: NATS_TIMEOUTS.PAYMENT,
      targetService: 'PAYMENT_SERVICE',
      condition: (payload) => payload.paymentMethod === 'dutchpay',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        reason: '결제 타임아웃 - 분할결제 미완료로 자동 환불',
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        refundedCount: response.refundedCount ?? 0,
        refundedAmount: response.refundedAmount ?? 0,
        expiredSplitCount: response.expiredCount ?? 0,
      }),
    },
    {
      name: 'MARK_BOOKING_FAILED',
      action: 'booking.saga.paymentTimeout',
      compensate: null,
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'BOOKING_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        reason: 'Payment timeout - payment not completed within deadline',
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        gameTimeSlotId: response.gameTimeSlotId,
        playerCount: response.playerCount,
        userId: response.userId,
        bookingNumber: response.bookingNumber,
      }),
    },
    {
      name: 'RELEASE_SLOT',
      action: 'slot.release',
      compensate: null,
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'CLUB_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        gameTimeSlotId: payload.gameTimeSlotId,
        playerCount: payload.playerCount,
        reason: 'Payment timeout',
        requestedAt: new Date().toISOString(),
      }),
    },
    {
      name: 'NOTIFY_TIMEOUT',
      action: 'notification.booking.paymentTimeout',
      compensate: null,
      timeout: NATS_TIMEOUTS.NOTIFICATION,
      targetService: 'NOTIFICATION_SERVICE',
      optional: true,
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        bookingNumber: payload.bookingNumber,
        userId: payload.userId,
        paymentMethod: payload.paymentMethod,
        refundedCount: payload.refundedCount,
        refundedAmount: payload.refundedAmount,
        timeoutAt: new Date().toISOString(),
      }),
    },
  ],
};
