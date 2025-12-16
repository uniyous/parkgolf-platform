import { ApiError } from '../api/client';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    if ('captureStackTrace' in Error) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

export const errorHandler = {
  handle: (error: Error | ApiError | AppError, context?: string): void => {
    console.error(`Error ${context ? `in ${context}` : 'occurred'}:`, error);
    
    // 개발 환경에서는 상세한 에러 로그
    if (import.meta.env.DEV) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        ...(error instanceof ApiError && {
          status: error.status,
          code: error.code,
          details: error.details,
        }),
        ...(error instanceof AppError && {
          code: error.code,
          statusCode: error.statusCode,
          isOperational: error.isOperational,
        }),
      });
    }

    // 사용자에게 표시할 메시지 결정
    let userMessage = '예상치 못한 오류가 발생했습니다.';
    
    if (error instanceof ApiError) {
      if (error.status === 401) {
        userMessage = '인증이 필요합니다. 다시 로그인해주세요.';
      } else if (error.status === 403) {
        userMessage = '접근 권한이 없습니다.';
      } else if (error.status === 404) {
        userMessage = '요청한 리소스를 찾을 수 없습니다.';
      } else if (error.status >= 500) {
        userMessage = '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message) {
        userMessage = error.message;
      }
    } else if (error instanceof AppError && error.isOperational) {
      userMessage = error.message;
    }

    // 실제 애플리케이션에서는 toast나 notification 라이브러리 사용
    if (typeof window !== 'undefined') {
      // 임시로 alert 사용 (실제로는 toast 라이브러리 사용 권장)
      console.warn('User error message:', userMessage);
    }
  },

  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      errorHandler.handle(error as Error, context);
      return null;
    }
  },

  createUserFriendlyError: (message: string, _originalError?: Error): AppError => {
    return new AppError(
      message,
      'USER_FRIENDLY_ERROR',
      400,
      true
    );
  },
} as const;