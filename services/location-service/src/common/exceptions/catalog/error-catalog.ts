import { HttpStatus } from '@nestjs/common';
import { ErrorInfo } from '../app.exception';

export const Errors = {
  Location: {
    KAKAO_API_ERROR: {
      code: 'LOCATION_001',
      message: '카카오 API 호출 중 오류가 발생했습니다',
      httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    } as ErrorInfo,
    ADDRESS_NOT_FOUND: {
      code: 'LOCATION_002',
      message: '주소를 찾을 수 없습니다',
      httpStatus: HttpStatus.NOT_FOUND,
    } as ErrorInfo,
    INVALID_COORDINATES: {
      code: 'LOCATION_003',
      message: '유효하지 않은 좌표입니다',
      httpStatus: HttpStatus.BAD_REQUEST,
    } as ErrorInfo,
    API_KEY_NOT_CONFIGURED: {
      code: 'LOCATION_004',
      message: '카카오 API 키가 설정되지 않았습니다',
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    } as ErrorInfo,
  },
};
