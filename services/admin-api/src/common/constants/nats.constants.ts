/**
 * NATS Timeout Constants
 * 작업 유형에 따른 일관된 타임아웃 설정
 */
export const NATS_TIMEOUTS = {
  /** 기본 조회 작업 (단건 조회, 검증 등) */
  DEFAULT: 5000,

  /** 목록 조회 작업 (페이지네이션 포함) */
  LIST_QUERY: 10000,

  /** 분석/통계 조회 작업 */
  ANALYTICS: 15000,

  /** 대량 처리 작업 */
  BULK_OPERATION: 20000,

  /** 대시보드 데이터 조회 */
  DASHBOARD: 15000,
} as const;

/**
 * NATS Subject Patterns
 * 서비스 간 통신에 사용되는 NATS 주제 패턴
 */
export const NATS_SUBJECTS = {
  // Auth Service
  AUTH: {
    LOGIN: 'auth.login',
    LOGOUT: 'auth.logout',
    VALIDATE: 'auth.validate',
    REFRESH: 'auth.refresh',
    GET_CURRENT_USER: 'auth.getCurrentUser',
  },

  // Admin Service
  ADMINS: {
    LIST: 'admins.list',
    FIND_BY_ID: 'admins.findById',
    CREATE: 'admins.create',
    UPDATE: 'admins.update',
    DELETE: 'admins.delete',
    UPDATE_STATUS: 'admins.updateStatus',
    UPDATE_ROLE: 'admins.updateRole',
    UPDATE_PERMISSIONS: 'admins.updatePermissions',
  },

  // User Service
  USERS: {
    LIST: 'users.list',
    FIND_BY_ID: 'users.findById',
    CREATE: 'users.create',
    UPDATE: 'users.update',
    DELETE: 'users.delete',
    STATS: 'users.stats',
  },

  // Course Service
  COURSES: {
    LIST: 'course.list',
    FIND_BY_ID: 'course.findById',
    CREATE: 'course.create',
    UPDATE: 'course.update',
    DELETE: 'course.delete',
  },

  // Company Service
  COMPANIES: {
    LIST: 'company.list',
    FIND_BY_ID: 'company.findById',
    CREATE: 'company.create',
    UPDATE: 'company.update',
    DELETE: 'company.delete',
  },

  // Booking Service
  BOOKINGS: {
    LIST: 'booking.list',
    FIND_BY_ID: 'booking.findById',
    CREATE: 'booking.create',
    UPDATE: 'booking.update',
    CANCEL: 'booking.cancel',
    STATS: 'booking.stats',
  },

  // Notification Service
  NOTIFICATIONS: {
    LIST: 'notification.list',
    SEND: 'notification.send',
    MARK_READ: 'notification.markRead',
  },
} as const;

export type NatsSubject = typeof NATS_SUBJECTS;
