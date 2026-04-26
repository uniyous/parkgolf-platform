import { SagaDefinition } from './saga-definition.interface';
import { NATS_TIMEOUTS } from '../../common/constants/nats.constants';

/**
 * 결제 실패/취소 Saga
 *
 * 트리거: payment-service의 outbox 이벤트 `booking.paymentFailed`
 * 흐름: 예약 FAILED 처리 → 슬롯 복구 → 실패 알림
 *
 * PAYMENT_TIMEOUT과 동일한 정리 단계를 사용하지만 트리거 시점이 다름:
 * - PAYMENT_FAILED: 클라이언트 결제 실패 통지 직후 (즉시)
 * - PAYMENT_TIMEOUT: SLOT_RESERVED 10분 초과 (지연)
 */
export const PaymentFailedSaga: SagaDefinition = {
  name: 'PAYMENT_FAILED',
  steps: [
    {
      name: 'MARK_BOOKING_FAILED',
      action: 'booking.saga.paymentTimeout',
      compensate: null,
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'BOOKING_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        reason:
          (payload.reason as string) === 'cancelled'
            ? '사용자가 결제를 취소했습니다'
            : `결제 실패 (${(payload.errorCode as string) ?? 'UNKNOWN'})`,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        gameTimeSlotId: response.gameTimeSlotId,
        playerCount: response.playerCount,
        userId: response.userId ?? payload.userId,
        bookingNumber: response.bookingNumber,
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
        reason: 'Payment failed',
        requestedAt: new Date().toISOString(),
      }),
    },
    {
      name: 'NOTIFY_FAILURE',
      action: 'notification.booking.paymentFailed',
      compensate: null,
      timeout: NATS_TIMEOUTS.NOTIFICATION,
      targetService: 'NOTIFICATION_SERVICE',
      optional: true,
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        bookingNumber: payload.bookingNumber,
        userId: payload.userId,
        reason: payload.reason,
        errorCode: payload.errorCode,
        errorMessage: payload.errorMessage,
        failedAt: new Date().toISOString(),
      }),
    },
  ],
};
