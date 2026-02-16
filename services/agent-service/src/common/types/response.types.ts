export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export class NatsResponse {
  static success<T>(data: T): ApiResponse<T> {
    return { success: true, data };
  }

  static error(code: string, message: string): ErrorResponse {
    return {
      success: false,
      error: { code, message },
      timestamp: new Date().toISOString(),
    };
  }
}
