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
 * Course 엔티티를 응답용으로 매핑
 */
export function mapCourseToResponse(course: any) {
  return {
    id: course.id,
    name: course.name,
    code: course.code,
    subtitle: course.subtitle,
    description: course.description,
    companyId: course.companyId,
    clubId: course.clubId,
    holeCount: course.holeCount,
    par: course.par,
    totalDistance: course.totalDistance,
    difficulty: course.difficulty,
    scenicRating: course.scenicRating,
    courseRating: course.courseRating,
    slopeRating: course.slopeRating,
    imageUrl: course.imageUrl,
    status: course.status,
    isActive: course.isActive,
    createdAt: toISOString(course.createdAt),
    updatedAt: toISOString(course.updatedAt),
  };
}

/**
 * Weekly Schedule 엔티티를 응답용으로 매핑
 */
export function mapWeeklyScheduleToResponse(schedule: any) {
  return {
    id: schedule.id,
    courseId: schedule.courseId,
    dayOfWeek: schedule.dayOfWeek,
    openTime: schedule.openTime,
    closeTime: schedule.closeTime,
    isActive: schedule.isActive,
    createdAt: toISOString(schedule.createdAt),
    updatedAt: toISOString(schedule.updatedAt),
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
