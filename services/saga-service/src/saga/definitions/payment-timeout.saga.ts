import { SagaDefinition } from './saga-definition.interface';
import { NATS_TIMEOUTS } from '../../common/constants/nats.constants';

/**
 * 결제 타임아웃 Saga
 *
 * 흐름: 예약 FAILED 처리 → 슬롯 복구 → 타임아웃 알림
 */
export const PaymentTimeoutSaga: SagaDefinition = {
  name: 'PAYMENT_TIMEOUT',
  steps: [
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
      targetService: 'COURSE_SERVICE',
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
        timeoutAt: new Date().toISOString(),
      }),
    },
  ],
};
