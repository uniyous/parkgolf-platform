/**
 * 에러 코드 체계:
 * - WEATHER_xxx: 날씨 관련
 * - KMA_xxx: 기상청 API 관련
 * - SYS_xxx: 시스템 에러
 */

export interface ErrorDef {
  readonly code: string;
  readonly message: string;
  readonly httpStatus: number;
}

function defineErrors<T extends Record<string, ErrorDef>>(errors: T): Readonly<T> {
  return Object.freeze(errors);
}

// ============================================
// 날씨 에러 (WEATHER_xxx)
// ============================================
export const WeatherErrors = defineErrors({
  INVALID_COORDINATES: { code: 'WEATHER_001', message: '유효하지 않은 좌표입니다', httpStatus: 400 },
  LOCATION_NOT_FOUND: { code: 'WEATHER_002', message: '위치 정보를 찾을 수 없습니다', httpStatus: 404 },
  FORECAST_NOT_AVAILABLE: { code: 'WEATHER_003', message: '예보 정보를 조회할 수 없습니다', httpStatus: 503 },
});

// ============================================
// 기상청 API 에러 (KMA_xxx)
// ============================================
export const KmaErrors = defineErrors({
  API_ERROR: { code: 'KMA_001', message: '기상청 API 오류가 발생했습니다', httpStatus: 502 },
  API_TIMEOUT: { code: 'KMA_002', message: '기상청 API 응답 시간 초과', httpStatus: 504 },
  API_UNAVAILABLE: { code: 'KMA_003', message: '기상청 서비스에 연결할 수 없습니다', httpStatus: 503 },
  INVALID_API_KEY: { code: 'KMA_004', message: '기상청 API 키가 유효하지 않습니다', httpStatus: 401 },
  NO_DATA: { code: 'KMA_005', message: '해당 시간대의 날씨 데이터가 없습니다', httpStatus: 404 },
});

// ============================================
// 시스템 에러 (SYS_xxx)
// ============================================
export const SystemErrors = defineErrors({
  INTERNAL: { code: 'SYS_001', message: '내부 서버 오류', httpStatus: 500 },
  UNAVAILABLE: { code: 'SYS_002', message: '서비스를 일시적으로 사용할 수 없습니다', httpStatus: 503 },
});

// ============================================
// 통합 export
// ============================================
export const Errors = {
  Weather: WeatherErrors,
  Kma: KmaErrors,
  System: SystemErrors,
} as const;
