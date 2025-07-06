export enum ErrorCodes {
  // System Errors
  SYS_001 = 'SYS_001',
  SYS_002 = 'SYS_002',
  SYS_003 = 'SYS_003',

  // Authentication Errors
  AUT_001 = 'AUT_001',
  AUT_002 = 'AUT_002',
  AUT_003 = 'AUT_003',
  AUT_004 = 'AUT_004',
  AUT_005 = 'AUT_005',
  AUT_006 = 'AUT_006',

  // Business Logic Errors
  BUS_001 = 'BUS_001',
  BUS_002 = 'BUS_002',
  BUS_003 = 'BUS_003',
  BUS_004 = 'BUS_004',
  BUS_005 = 'BUS_005',
  BUS_006 = 'BUS_006',
  BUS_007 = 'BUS_007',
  BUS_008 = 'BUS_008',
  BUS_009 = 'BUS_009',
  BUS_010 = 'BUS_010',
  BUS_011 = 'BUS_011',
  BUS_012 = 'BUS_012',
  BUS_013 = 'BUS_013',
  BUS_014 = 'BUS_014',
  BUS_015 = 'BUS_015',
  BUS_016 = 'BUS_016',
}

const ErrorMessages: Record<ErrorCodes, string> = {
  // System Errors
  [ErrorCodes.SYS_001]: '처리 중 오류가 발생했습니다.',
  [ErrorCodes.SYS_002]: '처리 중 오류가 발생했습니다. 담당자에게 확인 바랍니다.',
  [ErrorCodes.SYS_003]: '데이터베이스 처리 중 오류가 발생했습니다.',

  // Authentication Errors
  [ErrorCodes.AUT_001]: '사용자 정보가 없습니다.',
  [ErrorCodes.AUT_002]: '사용자 정보는 있으나, 비밀번호가 다릅니다.',
  [ErrorCodes.AUT_003]: '유효하지 않은 토큰입니다.',
  [ErrorCodes.AUT_004]: '토큰(access token) 유효기간이 만료되었습니다.',
  [ErrorCodes.AUT_005]: '토큰(refresh token) 유효기간이 만료되었습니다.',
  [ErrorCodes.AUT_006]: '접근 권한이 없습니다.',

  // Business Logic Errors
  [ErrorCodes.BUS_001]: '게임 정보가 없습니다.',
  [ErrorCodes.BUS_002]: '게임 라운드 정보가 없습니다.',
  [ErrorCodes.BUS_003]: '티켓 정보가 없습니다.',
  [ErrorCodes.BUS_004]: '티켓 통화 정보가 없습니다.',
  [ErrorCodes.BUS_005]: '계정 정보가 없습니다.',
  [ErrorCodes.BUS_006]: '클라이언트 계정 정보가 없습니다.',
  [ErrorCodes.BUS_007]: '등록된 계정입니다. 다른 아이디를 사용하세요.',
  [ErrorCodes.BUS_008]: '데이터 등록 중 오류가 발생했습니다.',
  [ErrorCodes.BUS_009]: '데이터 수정 중 오류가 발생했습니다.',
  [ErrorCodes.BUS_010]: '데이터 삭제 중 오류가 발생했습니다.',
  [ErrorCodes.BUS_011]: '데이터 조회 결과가 없습니다.',
  [ErrorCodes.BUS_012]: '필수 헤더 정보가 없습니다.',
  [ErrorCodes.BUS_013]: '필수 매개 변수 정보가 없습니다.',
  [ErrorCodes.BUS_014]: '잔액이 부족합니다.',
  [ErrorCodes.BUS_015]: '생성된 자산(지갑)이 없습니다.',
  [ErrorCodes.BUS_016]: '배치잡 정보가 이미 등록된 상태입니다.',
};

export interface ErrorPayload {
  errorCode: ErrorCodes;
  errorMessage: string;
}

export const isErrorMessage = (code: ErrorCodes) => {
  const message = ErrorMessages[code];
  if (message === undefined) {
    return false;
  }
  return true;
};

export const getErrorMessage = (code: ErrorCodes): ErrorPayload => {
  const message = ErrorMessages[code];

  if (message === undefined) {
    console.error(`Error message for code '${code}' not found. This is a development error.`);
    return {
      errorCode: code,
      errorMessage: '정의되지 않은 오류 메시지입니다. 시스템 관리자에게 문의하세요.',
    };
  }

  return {
    errorCode: code,
    errorMessage: message,
  };
};

export interface ErrorResponse {
  errorCode: ErrorCodes;
  errorMessage: string;
  httpStatus?: number;
  timestamp: string;
}

export const createErrorResponse = (code: ErrorCodes, overrideMessage?: string, httpStatus?: number): ErrorResponse => {
  const defaultMessage = getErrorMessage(code).errorMessage;
  return {
    errorCode: code,
    errorMessage: overrideMessage || defaultMessage,
    httpStatus: httpStatus,
    timestamp: new Date().toISOString(),
  };
};
