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
 * Game 엔티티를 응답용으로 매핑
 */
export function mapGameToResponse(game: any) {
  return {
    id: game.id,
    name: game.name,
    code: game.code,
    description: game.description,
    frontNineCourseId: game.frontNineCourseId,
    backNineCourseId: game.backNineCourseId,
    frontNineCourse: game.frontNineCourse ? mapCourseToResponse(game.frontNineCourse) : null,
    backNineCourse: game.backNineCourse ? mapCourseToResponse(game.backNineCourse) : null,
    totalHoles: game.totalHoles,
    estimatedDuration: game.estimatedDuration,
    breakDuration: game.breakDuration,
    maxPlayers: game.maxPlayers,
    basePrice: Number(game.basePrice),
    weekendPrice: game.weekendPrice ? Number(game.weekendPrice) : null,
    holidayPrice: game.holidayPrice ? Number(game.holidayPrice) : null,
    clubId: game.clubId,
    club: game.club ? mapClubToResponse(game.club) : null,
    status: game.status,
    isActive: game.isActive,
    createdAt: toISOString(game.createdAt),
    updatedAt: toISOString(game.updatedAt),
  };
}

/**
 * GameTimeSlot 엔티티를 응답용으로 매핑
 */
export function mapGameTimeSlotToResponse(slot: any) {
  return {
    id: slot.id,
    gameId: slot.gameId,
    game: slot.game ? mapGameToResponse(slot.game) : null,
    date: slot.date instanceof Date ? slot.date.toISOString().split('T')[0] : slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    maxPlayers: slot.maxPlayers,
    bookedPlayers: slot.bookedPlayers,
    availablePlayers: slot.maxPlayers - slot.bookedPlayers,
    price: Number(slot.price),
    isPremium: slot.isPremium,
    status: slot.status,
    isActive: slot.isActive,
    createdAt: toISOString(slot.createdAt),
    updatedAt: toISOString(slot.updatedAt),
  };
}

/**
 * GameWeeklySchedule 엔티티를 응답용으로 매핑
 */
export function mapGameWeeklyScheduleToResponse(schedule: any) {
  return {
    id: schedule.id,
    gameId: schedule.gameId,
    dayOfWeek: schedule.dayOfWeek,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    interval: schedule.interval,
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

/**
 * Club 엔티티를 응답용으로 매핑
 */
export function mapClubToResponse(club: any) {
  return {
    id: club.id,
    name: club.name,
    companyId: club.companyId,
    location: club.location,
    address: club.address,
    phone: club.phone,
    email: club.email,
    website: club.website,
    totalHoles: club.totalHoles,
    totalCourses: club.totalCourses,
    status: club.status,
    operatingHours: club.operatingHours,
    seasonInfo: club.seasonInfo,
    facilities: club.facilities,
    isActive: club.isActive,
    createdAt: toISOString(club.createdAt),
    updatedAt: toISOString(club.updatedAt),
  };
}

/**
 * Company 엔티티를 응답용으로 매핑
 */
export function mapCompanyToResponse(company: any) {
  return {
    id: company.id,
    name: company.name,
    businessNumber: company.businessNumber,
    description: company.description,
    address: company.address,
    phoneNumber: company.phoneNumber,
    email: company.email,
    website: company.website,
    establishedDate: toISOString(company.establishedDate),
    logoUrl: company.logoUrl,
    status: company.status,
    isActive: company.isActive,
    createdAt: toISOString(company.createdAt),
    updatedAt: toISOString(company.updatedAt),
  };
}

/**
 * Hole 엔티티를 응답용으로 매핑
 */
export function mapHoleToResponse(hole: any) {
  return {
    id: hole.id,
    courseId: hole.courseId,
    holeNumber: hole.holeNumber,
    par: hole.par,
    distance: hole.distance,
    handicap: hole.handicap,
    description: hole.description,
    tips: hole.tips,
    imageUrl: hole.imageUrl,
    createdAt: toISOString(hole.createdAt),
    updatedAt: toISOString(hole.updatedAt),
  };
}

