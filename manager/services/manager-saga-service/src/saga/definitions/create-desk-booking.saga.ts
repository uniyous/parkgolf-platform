import { SagaDefinition } from './saga-definition.interface';
import { NATS_TIMEOUTS } from '../../common/constants/nats.constants';

/**
 * 데스크 부킹 생성 Saga (데스크·전화·워크인) — UNI-127 ② chunk B.
 *
 * 흐름: 데스크 예약 레코드 생성 → 슬롯 선점(club-service, 공통 인벤토리 권위)
 *       → 현장 수납(payment-service 수납) → 예약 확정 → (확정 알림)
 *
 * ⚠️ frontdesk-service·payment-service(수납)는 greenfield([6]/G3). 아래 step action은
 *    그 서비스들이 구현할 **NATS 계약**(contract-first). 서비스 생성 전엔 실행 시 타임아웃.
 *    slot.reserve/release는 marketplace와 공통(club-service 인벤토리 권위 단일).
 */
export const CreateDeskBookingSaga: SagaDefinition = {
  name: 'CREATE_DESK_BOOKING',
  steps: [
    {
      name: 'CREATE_DESK_BOOKING_RECORD',
      action: 'frontdesk.deskBooking.create',
      compensate: 'frontdesk.deskBooking.markFailed',
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'FRONTDESK_SERVICE',
      buildRequest: (payload) => ({
        deskBookingData: payload.deskBookingData,
        channel: payload.channel, // DESK | PHONE | WALK_IN
        staffId: payload.staffId,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        bookingId: response.bookingId,
        bookingNumber: response.bookingNumber,
        gameTimeSlotId: response.gameTimeSlotId,
        playerCount: response.playerCount,
        clubId: response.clubId,
        totalPrice: response.totalPrice,
      }),
    },
    {
      name: 'RESERVE_SLOT',
      action: 'slot.reserve',
      compensate: 'slot.release',
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'CLUB_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        gameTimeSlotId: payload.gameTimeSlotId,
        playerCount: payload.playerCount,
        requestedAt: new Date().toISOString(),
      }),
    },
    {
      name: 'COLLECT_PAYMENT',
      action: 'payment.collect',
      compensate: 'payment.refund',
      timeout: NATS_TIMEOUTS.PAYMENT,
      targetService: 'PAYMENT_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        amount: payload.totalPrice,
        method: payload.paymentMethod, // CASH | CARD (현장)
        staffId: payload.staffId,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        receiptId: response.receiptId,
      }),
    },
    {
      name: 'CONFIRM_BOOKING',
      action: 'frontdesk.deskBooking.confirm',
      compensate: null,
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'FRONTDESK_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        receiptId: payload.receiptId,
        confirmedAt: new Date().toISOString(),
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        bookingStatus: response.status,
      }),
    },
    {
      name: 'SEND_CONFIRMATION',
      action: 'notification.booking.confirmed',
      compensate: null,
      timeout: NATS_TIMEOUTS.NOTIFICATION,
      targetService: 'NOTIFICATION_SERVICE',
      optional: true,
      condition: (payload) => payload.bookingStatus === 'CONFIRMED',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        bookingNumber: payload.bookingNumber,
        clubId: payload.clubId,
        confirmedAt: new Date().toISOString(),
      }),
    },
  ],
};
