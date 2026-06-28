import { SagaDefinition } from './saga-definition.interface';
import { NATS_TIMEOUTS } from '../../common/constants/nats.constants';

/**
 * 키오스크 체크인·현장수납 Saga — UNI-127 ② chunk B.
 *
 * 흐름: 키오스크 체크인 레코드 → 슬롯 선점(club-service) → 현장 수납(payment 수납) → 확정
 *
 * ⚠️ frontdesk-service·payment-service(수납) greenfield → action은 NATS 계약(contract-first).
 */
export const KioskCheckinSaga: SagaDefinition = {
  name: 'KIOSK_CHECKIN',
  steps: [
    {
      name: 'CREATE_KIOSK_CHECKIN',
      action: 'frontdesk.kiosk.checkin',
      compensate: 'frontdesk.kiosk.markFailed',
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'FRONTDESK_SERVICE',
      buildRequest: (payload) => ({
        kioskId: payload.kioskId,
        clubId: payload.clubId,
        gameTimeSlotId: payload.gameTimeSlotId,
        playerCount: payload.playerCount,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        bookingId: response.bookingId,
        bookingNumber: response.bookingNumber,
        totalPrice: response.totalPrice,
        pricingSnapshot: response.pricingSnapshot, // frontdesk 산정 근거 → COLLECT_PAYMENT로 전달 (UNI-129)
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
        clubId: payload.clubId, // 일마감·정산 클럽 식별 (키오스크 트리거 payload.clubId)
        amount: payload.totalPrice,
        pricingSnapshot: payload.pricingSnapshot, // 산정 근거 (정산 대사) — UNI-129
        method: payload.paymentMethod, // CARD (키오스크 무인)
        kioskId: payload.kioskId,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        receiptId: response.receiptId,
      }),
    },
    {
      name: 'CONFIRM_CHECKIN',
      action: 'frontdesk.kiosk.confirm',
      compensate: null,
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'FRONTDESK_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        receiptId: payload.receiptId,
        confirmedAt: new Date().toISOString(),
      }),
    },
  ],
};
