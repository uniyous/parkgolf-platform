import { NotificationType } from '@prisma/client';

export const defaultTemplates = [
  {
    type: NotificationType.BOOKING_CONFIRMED,
    title: '예약이 확정되었습니다 - {{courseName}}',
    content: `안녕하세요!

{{courseName}}에서 예약이 성공적으로 확정되었습니다.

📅 예약 날짜: {{bookingDate}}
⏰ 예약 시간: {{bookingTime}}
🏌️ 코스: {{courseName}}
📋 예약 번호: {{bookingId}}

예약 시간에 맞춰 방문해 주시기 바랍니다.
즐거운 골프 되세요!

감사합니다.`,
    variables: {
      courseName: '코스명',
      bookingDate: '예약날짜',
      bookingTime: '예약시간',
      bookingId: '예약번호'
    },
    isActive: true,
  },
  {
    type: NotificationType.BOOKING_CANCELLED,
    title: '예약이 취소되었습니다 - {{courseName}}',
    content: `안녕하세요!

{{courseName}}에서 예약이 취소되었습니다.

📅 예약 날짜: {{bookingDate}}
⏰ 예약 시간: {{bookingTime}}
🏌️ 코스: {{courseName}}
📋 예약 번호: {{bookingId}}

다른 시간대로 새로 예약하시거나 문의사항이 있으시면 고객센터로 연락 부탁드립니다.

감사합니다.`,
    variables: {
      courseName: '코스명',
      bookingDate: '예약날짜',
      bookingTime: '예약시간',
      bookingId: '예약번호'
    },
    isActive: true,
  },
  {
    type: NotificationType.PAYMENT_SUCCESS,
    title: '결제가 완료되었습니다',
    content: `결제가 성공적으로 완료되었습니다.

💳 결제 금액: {{amount}}원
📋 결제 번호: {{paymentId}}
📋 예약 번호: {{bookingId}}

결제 완료와 함께 예약이 확정됩니다.
영수증이 필요하시면 마이페이지에서 확인하실 수 있습니다.

감사합니다.`,
    variables: {
      amount: '결제금액',
      paymentId: '결제번호',
      bookingId: '예약번호'
    },
    isActive: true,
  },
  {
    type: NotificationType.PAYMENT_FAILED,
    title: '결제가 실패했습니다',
    content: `결제 처리 중 오류가 발생했습니다.

💳 결제 금액: {{amount}}원
📋 결제 번호: {{paymentId}}
📋 예약 번호: {{bookingId}}
❌ 실패 사유: {{failureReason}}

다시 결제를 시도해 주시거나, 다른 결제수단을 이용해 주세요.
문제가 지속되면 고객센터로 연락 부탁드립니다.

감사합니다.`,
    variables: {
      amount: '결제금액',
      paymentId: '결제번호',
      bookingId: '예약번호',
      failureReason: '실패사유'
    },
    isActive: true,
  },
  {
    type: NotificationType.BOOKING_REMINDER,
    title: '내일 예약이 있습니다 - {{courseName}}',
    content: `안녕하세요!

내일 예약이 있어 알려드립니다.

📅 예약 날짜: {{bookingDate}}
⏰ 예약 시간: {{bookingTime}}
🏌️ 코스: {{courseName}}
📋 예약 번호: {{bookingId}}

준비물과 날씨를 미리 확인하시고, 여유를 가지고 방문해 주세요.
즐거운 골프 되세요!

감사합니다.`,
    variables: {
      courseName: '코스명',
      bookingDate: '예약날짜',
      bookingTime: '예약시간',
      bookingId: '예약번호'
    },
    isActive: true,
  },
  {
    type: NotificationType.PROMOTIONAL,
    title: '🎉 특별 할인 혜택을 놓치지 마세요!',
    content: `안녕하세요!

{{userName}}님을 위한 특별 혜택을 준비했습니다.

🎁 혜택 내용: {{promotionTitle}}
💰 할인율: {{discountRate}}%
📅 유효기간: {{validUntil}}

지금 바로 예약하고 특가 혜택을 받아보세요!

[지금 예약하기]

감사합니다.`,
    variables: {
      userName: '사용자명',
      promotionTitle: '프로모션제목',
      discountRate: '할인율',
      validUntil: '유효기간'
    },
    isActive: true,
  },
  {
    type: NotificationType.SYSTEM_ALERT,
    title: '시스템 공지사항',
    content: `안녕하세요!

중요한 공지사항을 알려드립니다.

📢 제목: {{alertTitle}}
📄 내용: {{alertContent}}
📅 공지일: {{alertDate}}

자세한 내용은 공지사항 페이지를 확인해 주세요.

감사합니다.`,
    variables: {
      alertTitle: '공지제목',
      alertContent: '공지내용',
      alertDate: '공지일'
    },
    isActive: true,
  },
];