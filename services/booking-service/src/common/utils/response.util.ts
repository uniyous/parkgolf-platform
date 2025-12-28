/**
 * Common Response Utilities
 * NATS 응답 및 유틸리티 함수 통합
 */

/**
 * 성공 응답 생성
 */
export function successResponse<T>(data: T, meta?: Record<string, any>) {
  return {
    success: true,
    data,
    ...meta,
  };
}

/**
 * 에러 응답 생성
 */
export function errorResponse(code: string, message: string, details?: any) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * 페이지네이션 메타 데이터 생성
 */
export function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 날짜를 ISO 문자열로 변환 (null-safe)
 */
export function toISOString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * Booking 엔티티를 응답용으로 매핑 (Game 기반)
 */
export function mapBookingToResponse(booking: any) {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    userId: booking.userId,
    gameId: booking.gameId,
    gameTimeSlotId: booking.gameTimeSlotId,
    gameName: booking.gameName,
    gameCode: booking.gameCode,
    frontNineCourseId: booking.frontNineCourseId,
    frontNineCourseName: booking.frontNineCourseName,
    backNineCourseId: booking.backNineCourseId,
    backNineCourseName: booking.backNineCourseName,
    clubId: booking.clubId,
    clubName: booking.clubName,
    bookingDate: toISOString(booking.bookingDate),
    startTime: booking.startTime,
    endTime: booking.endTime,
    playerCount: booking.playerCount,
    pricePerPerson: Number(booking.pricePerPerson),
    serviceFee: Number(booking.serviceFee),
    totalPrice: Number(booking.totalPrice),
    status: booking.status,
    paymentMethod: booking.paymentMethod,
    specialRequests: booking.specialRequests,
    userEmail: booking.userEmail,
    userName: booking.userName,
    userPhone: booking.userPhone,
    createdAt: toISOString(booking.createdAt),
    updatedAt: toISOString(booking.updatedAt),
  };
}

/**
 * GameTimeSlotCache 엔티티를 응답용으로 매핑
 */
export function mapGameTimeSlotCacheToResponse(slot: any) {
  return {
    id: slot.id,
    gameTimeSlotId: slot.gameTimeSlotId,
    gameId: slot.gameId,
    gameName: slot.gameName,
    gameCode: slot.gameCode,
    frontNineCourseName: slot.frontNineCourseName,
    backNineCourseName: slot.backNineCourseName,
    clubId: slot.clubId,
    clubName: slot.clubName,
    date: toISOString(slot.date)?.split('T')[0],
    startTime: slot.startTime,
    endTime: slot.endTime,
    maxPlayers: slot.maxPlayers,
    bookedPlayers: slot.bookedPlayers,
    availablePlayers: slot.availablePlayers,
    isAvailable: slot.isAvailable,
    price: Number(slot.price),
    isPremium: slot.isPremium,
    status: slot.status,
  };
}

/**
 * BookingHistory 엔티티를 응답용으로 매핑
 */
export function mapBookingHistoryToResponse(history: any) {
  return {
    id: history.id,
    bookingId: history.bookingId,
    action: history.action,
    userId: history.userId,
    details: history.details,
    createdAt: toISOString(history.createdAt),
  };
}

/**
 * Payment 엔티티를 응답용으로 매핑
 */
export function mapPaymentToResponse(payment: any) {
  return {
    id: payment.id,
    bookingId: payment.bookingId,
    amount: Number(payment.amount),
    paymentMethod: payment.paymentMethod,
    paymentStatus: payment.paymentStatus,
    transactionId: payment.transactionId,
    paidAt: toISOString(payment.paidAt),
    createdAt: toISOString(payment.createdAt),
  };
}

/**
 * GameCache 엔티티를 응답용으로 매핑
 */
export function mapGameCacheToResponse(game: any) {
  return {
    id: game.id,
    gameId: game.gameId,
    name: game.name,
    code: game.code,
    description: game.description,
    frontNineCourseId: game.frontNineCourseId,
    frontNineCourseName: game.frontNineCourseName,
    backNineCourseId: game.backNineCourseId,
    backNineCourseName: game.backNineCourseName,
    totalHoles: game.totalHoles,
    estimatedDuration: game.estimatedDuration,
    breakDuration: game.breakDuration,
    maxPlayers: game.maxPlayers,
    basePrice: Number(game.basePrice),
    weekendPrice: game.weekendPrice ? Number(game.weekendPrice) : null,
    holidayPrice: game.holidayPrice ? Number(game.holidayPrice) : null,
    clubId: game.clubId,
    clubName: game.clubName,
    isActive: game.isActive,
    lastSyncAt: toISOString(game.lastSyncAt),
    createdAt: toISOString(game.createdAt),
    updatedAt: toISOString(game.updatedAt),
  };
}
