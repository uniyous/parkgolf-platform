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
 * Booking 엔티티를 응답용으로 매핑
 */
export function mapBookingToResponse(booking: any) {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    userId: booking.userId,
    courseId: booking.singleCourseId,
    courseName: booking.singleCourseName,
    bookingDate: toISOString(booking.bookingDate),
    timeSlot: booking.startTime,
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
 * TimeSlotAvailability 엔티티를 응답용으로 매핑
 */
export function mapTimeSlotAvailabilityToResponse(slot: any) {
  return {
    id: slot.id,
    timeSlotId: slot.timeSlotId,
    courseId: slot.singleCourseId,
    courseName: slot.singleCourseName,
    date: toISOString(slot.date)?.split('T')[0],
    startTime: slot.startTime,
    endTime: slot.endTime,
    maxCapacity: slot.maxCapacity,
    currentBookings: slot.currentBookings,
    availableSlots: slot.availableSlots,
    price: Number(slot.price),
    isAvailable: slot.isAvailable,
    isPremium: slot.isPremium,
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
 * CourseCache 엔티티를 응답용으로 매핑
 */
export function mapCourseCacheToResponse(course: any) {
  return {
    id: course.id,
    courseId: course.courseId,
    name: course.name,
    location: course.location,
    description: course.description,
    rating: course.rating,
    pricePerHour: Number(course.pricePerHour),
    imageUrl: course.imageUrl,
    amenities: course.amenities,
    openTime: course.openTime,
    closeTime: course.closeTime,
    isActive: course.isActive,
    updatedAt: toISOString(course.updatedAt),
  };
}
