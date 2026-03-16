import { SagaDefinition } from './saga-definition.interface';
import { NATS_TIMEOUTS } from '../../common/constants/nats.constants';

/**
 * 예약 생성 Saga
 *
 * 흐름: 예약 레코드 생성 → 파트너 확인 → (외부 슬롯 검증) → 슬롯 예약
 *       → 상태 업데이트 → (외부 예약 통보) → 확정 알림 → 회원 등록
 *
 * CHECK_PARTNER: clubId로 파트너 연동 여부 자동 판별
 * 외부 연동 골프장: VERIFY_EXTERNAL → NOTIFY_EXTERNAL 단계 추가
 * 내부 골프장: 기존 흐름 그대로 (condition으로 SKIP)
 */
export const CreateBookingSaga: SagaDefinition = {
  name: 'CREATE_BOOKING',
  steps: [
    {
      name: 'CREATE_BOOKING_RECORD',
      action: 'booking.saga.create',
      compensate: 'booking.saga.markFailed',
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'BOOKING_SERVICE',
      buildRequest: (payload) => ({
        bookingData: payload.bookingData,
        token: payload.token,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        bookingId: response.bookingId,
        bookingNumber: response.bookingNumber,
        gameTimeSlotId: response.gameTimeSlotId,
        playerCount: response.playerCount,
        paymentMethod: response.paymentMethod,
        clubId: response.clubId,
        userId: response.userId,
        gameName: response.gameName,
        bookingDate: response.bookingDate,
        startTime: response.startTime,
        userEmail: response.userEmail,
        userName: response.userName,
        totalPrice: response.totalPrice,
        pricePerPerson: response.pricePerPerson,
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
      name: 'VERIFY_EXTERNAL',
      action: 'partner.slot.verifyAvailability',
      compensate: null,
      timeout: NATS_TIMEOUTS.PARTNER,
      targetService: 'PARTNER_SERVICE',
      condition: (payload) => !!payload.isPartnerClub,
      buildRequest: (payload) => ({
        clubId: payload.clubId,
        gameTimeSlotId: payload.gameTimeSlotId,
        playerCount: payload.playerCount,
        bookingDate: payload.bookingDate,
        startTime: payload.startTime,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        externalSlotId: response.externalSlotId,
        externalAvailable: response.available,
      }),
    },
    {
      name: 'RESERVE_SLOT',
      action: 'slot.reserve',
      compensate: 'slot.release',
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'COURSE_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        gameTimeSlotId: payload.gameTimeSlotId,
        playerCount: payload.playerCount,
        requestedAt: new Date().toISOString(),
      }),
    },
    {
      name: 'UPDATE_BOOKING_STATUS',
      action: 'booking.saga.slotReserved',
      compensate: null,
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'BOOKING_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        gameTimeSlotId: payload.gameTimeSlotId,
        playerCount: payload.playerCount,
        paymentMethod: payload.paymentMethod,
        reservedAt: new Date().toISOString(),
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        bookingStatus: response.status,
      }),
    },
    {
      name: 'NOTIFY_EXTERNAL',
      action: 'partner.booking.notifyCreated',
      compensate: 'partner.booking.notifyCancelled',
      timeout: NATS_TIMEOUTS.PARTNER,
      targetService: 'PARTNER_SERVICE',
      condition: (payload) => !!payload.isPartnerClub && payload.bookingStatus === 'CONFIRMED',
      buildRequest: (payload) => ({
        clubId: payload.clubId,
        bookingId: payload.bookingId,
        bookingNumber: payload.bookingNumber,
        externalSlotId: payload.externalSlotId,
        playerCount: payload.playerCount,
        playerName: payload.userName,
        bookingDate: payload.bookingDate,
        startTime: payload.startTime,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        externalBookingId: response.externalBookingId,
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
        userId: payload.userId,
        gameName: payload.gameName,
        bookingDate: payload.bookingDate,
        timeSlot: payload.startTime,
        confirmedAt: new Date().toISOString(),
        userEmail: payload.userEmail,
        userName: payload.userName,
      }),
    },
    {
      name: 'REGISTER_COMPANY_MEMBER',
      action: 'iam.companyMembers.addByBooking',
      compensate: null,
      timeout: NATS_TIMEOUTS.QUICK,
      targetService: 'IAM_SERVICE',
      optional: true,
      condition: (payload) => payload.bookingStatus === 'CONFIRMED' && !!payload.clubId && !!payload.userId,
      buildRequest: (payload) => ({
        clubId: payload.clubId,
        userId: payload.userId,
      }),
    },
  ],
};
