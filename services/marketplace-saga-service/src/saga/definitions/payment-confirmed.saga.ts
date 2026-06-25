import { SagaDefinition } from './saga-definition.interface';
import { NATS_TIMEOUTS } from '../../common/constants/nats.constants';

/**
 * 결제 완료 후속 Saga
 *
 * 흐름: 예약 확정 → 확정 알림 → CompanyMember 등록
 */
export const PaymentConfirmedSaga: SagaDefinition = {
  name: 'PAYMENT_CONFIRMED',
  steps: [
    {
      name: 'CONFIRM_BOOKING',
      action: 'booking.saga.confirmPayment',
      compensate: null,
      timeout: NATS_TIMEOUTS.DEFAULT,
      targetService: 'BOOKING_SERVICE',
      buildRequest: (payload) => ({
        bookingId: payload.bookingId,
        paymentId: payload.paymentId,
        paymentKey: payload.paymentKey,
        orderId: payload.orderId,
        amount: payload.amount,
        userId: payload.userId,
      }),
      mergeResponse: (payload, response) => ({
        ...payload,
        bookingNumber: response.bookingNumber,
        gameName: response.gameName,
        bookingDate: response.bookingDate,
        startTime: response.startTime,
        clubId: response.clubId,
        userEmail: response.userEmail,
        userName: response.userName,
        paymentMethod: response.paymentMethod,
      }),
    },
    {
      name: 'SEND_CONFIRMATION',
      action: 'notification.booking.confirmed',
      compensate: null,
      timeout: NATS_TIMEOUTS.NOTIFICATION,
      targetService: 'NOTIFICATION_SERVICE',
      optional: true,
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
        paymentMethod: payload.paymentMethod,
      }),
    },
    {
      name: 'REGISTER_COMPANY_MEMBER',
      action: 'iam.companyMembers.addByBooking',
      compensate: null,
      timeout: NATS_TIMEOUTS.QUICK,
      targetService: 'IAM_SERVICE',
      optional: true,
      condition: (payload) => !!payload.clubId && !!payload.userId,
      buildRequest: (payload) => ({
        clubId: payload.clubId,
        userId: payload.userId,
      }),
    },
  ],
};
