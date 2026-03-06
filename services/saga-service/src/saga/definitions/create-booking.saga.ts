import { SagaDefinition } from './saga-definition.interface';
import { NATS_TIMEOUTS } from '../../common/constants/nats.constants';

/**
 * 예약 생성 Saga
 *
 * 흐름: 예약 레코드 생성 → 슬롯 예약 → 상태 업데이트 → 확정 알림
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
