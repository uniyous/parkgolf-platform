export interface ErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
  method: string;
}

export interface RpcErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export enum ErrorCodes {
  // System errors (SYS)
  SYSTEM_ERROR = 'SYS_001',
  DATABASE_ERROR = 'SYS_002',
  NETWORK_ERROR = 'SYS_003',
  SERVICE_UNAVAILABLE = 'SYS_004',
  
  // Authentication errors (AUT)
  UNAUTHORIZED = 'AUT_001',
  FORBIDDEN = 'AUT_002',
  TOKEN_EXPIRED = 'AUT_003',
  INVALID_CREDENTIALS = 'AUT_004',
  
  // Business logic errors (BUS)
  VALIDATION_ERROR = 'BUS_001',
  RESOURCE_NOT_FOUND = 'BUS_002',
  DUPLICATE_RESOURCE = 'BUS_003',
  BUSINESS_RULE_VIOLATION = 'BUS_004',
}