/**
 * 에러 코드 체계:
 * - LOCATION_xxx: 위치 서비스 관련
 * - KAKAO_xxx: 카카오 API 관련
 * - SYS_xxx: 시스템 에러
 */

import { ErrorDef } from '../app.exception';

function defineErrors<T extends Record<string, ErrorDef>>(errors: T): Readonly<T> {
  return Object.freeze(errors);
}

// ============================================
// 위치 에러 (LOCATION_xxx)
// ============================================
export const LocationErrors = defineErrors({
  ADDRESS_NOT_FOUND: { code: 'LOCATION_001', message: '주소를 찾을 수 없습니다', httpStatus: 404 },
  INVALID_COORDINATES: { code: 'LOCATION_002', message: '유효하지 않은 좌표입니다', httpStatus: 400 },
  SEARCH_FAILED: { code: 'LOCATION_003', message: '검색에 실패했습니다', httpStatus: 503 },
});

// ============================================
// 카카오 API 에러 (KAKAO_xxx)
// ============================================
export const KakaoErrors = defineErrors({
  API_ERROR: { code: 'KAKAO_001', message: '카카오 API 호출 중 오류가 발생했습니다', httpStatus: 502 },
  API_TIMEOUT: { code: 'KAKAO_002', message: '카카오 API 응답 시간 초과', httpStatus: 504 },
  API_KEY_NOT_CONFIGURED: { code: 'KAKAO_003', message: '카카오 API 키가 설정되지 않았습니다', httpStatus: 500 },
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
  Location: LocationErrors,
  Kakao: KakaoErrors,
  System: SystemErrors,
} as const;
