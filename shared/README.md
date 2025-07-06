# Shared Resources

## 📋 개요

이 디렉토리는 Park Golf Platform의 모든 서비스에서 공유하는 리소스를 포함합니다.

## 📁 디렉토리 구조

```
shared/
├── types/                    # 공유 TypeScript 타입 정의
│   ├── api/                 # API 관련 타입
│   ├── models/              # 데이터 모델 타입
│   └── common/              # 공통 유틸리티 타입
├── configs/                  # 공통 설정 파일
│   ├── eslint/              # ESLint 설정
│   ├── prettier/            # Prettier 설정
│   ├── typescript/          # TypeScript 설정
│   └── jest/                # Jest 설정
├── constants/                # 공유 상수
│   ├── api.constants.ts     # API 관련 상수
│   ├── error.constants.ts   # 에러 코드 정의
│   └── regex.constants.ts   # 정규 표현식
├── utils/                    # 공유 유틸리티 함수
│   ├── validation/          # 검증 함수
│   ├── formatting/          # 포맷팅 함수
│   └── helpers/             # 헬퍼 함수
└── docs/                    # 공통 문서
    ├── API.md               # API 설계 가이드
    ├── DATABASE.md          # 데이터베이스 스키마
    └── CONVENTIONS.md       # 코딩 컨벤션
```

## 🔧 공통 설정

### ESLint 설정 (configs/eslint/.eslintrc.shared.js)
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

### Prettier 설정 (configs/prettier/.prettierrc.shared.json)
```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### TypeScript 설정 (configs/typescript/tsconfig.shared.json)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../../shared/*"]
    },
    "incremental": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## 📝 공유 타입 정의

### API Response Type (types/api/response.type.ts)
```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ResponseMeta {
  timestamp: string;
  version: string;
  pagination?: PaginationMeta;
}
```

### Pagination Type (types/api/pagination.type.ts)
```typescript
export interface PaginationRequest {
  page: number;
  limit: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

### Common Model Types (types/models/base.model.ts)
```typescript
export interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeletableEntity extends BaseEntity {
  deletedAt?: Date | null;
}

export interface AuditableEntity extends BaseEntity {
  createdBy?: number;
  updatedBy?: number;
}
```

## 🛠️ 공유 유틸리티

### Validation Utilities (utils/validation/index.ts)
```typescript
export const isEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+82|0)1[0-9]{1}-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const isBusinessNumber = (bizNo: string): boolean => {
  const bizNoRegex = /^\d{3}-\d{2}-\d{5}$/;
  return bizNoRegex.test(bizNo);
};
```

### Date Formatting (utils/formatting/date.ts)
```typescript
export const formatDate = (date: Date | string, format = 'YYYY-MM-DD'): string => {
  // Implementation
};

export const formatTime = (time: string, format = 'HH:mm'): string => {
  // Implementation
};

export const formatDateTime = (dateTime: Date | string): string => {
  // Implementation
};
```

## 📋 공통 상수

### API Constants (constants/api.constants.ts)
```typescript
export const API_VERSION = 'v1';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
```

### Error Codes (constants/error.constants.ts)
```typescript
export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'AUTH001',
  AUTH_TOKEN_EXPIRED: 'AUTH002',
  AUTH_UNAUTHORIZED: 'AUTH003',
  
  // Validation
  VALIDATION_FAILED: 'VAL001',
  INVALID_INPUT: 'VAL002',
  
  // Business Logic
  COURSE_NOT_FOUND: 'CRS001',
  BOOKING_CONFLICT: 'BKG001',
  TIMESLOT_UNAVAILABLE: 'TSL001',
} as const;
```

## 🔄 사용 방법

### 서비스에서 공유 리소스 사용하기

1. **TypeScript 경로 설정** (tsconfig.json)
```json
{
  "extends": "../../shared/configs/typescript/tsconfig.shared.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../../shared/*"],
      "@/*": ["./src/*"]
    }
  }
}
```

2. **ESLint 설정 확장** (.eslintrc.js)
```javascript
module.exports = {
  extends: ['../../shared/configs/eslint/.eslintrc.shared.js'],
  rules: {
    // 서비스별 추가 규칙
  }
};
```

3. **공유 타입 사용**
```typescript
import { ApiResponse, PaginationRequest } from '@shared/types/api';
import { BaseEntity } from '@shared/types/models';
import { isEmail, formatDate } from '@shared/utils';
import { ERROR_CODES } from '@shared/constants';
```

## 📚 추가 문서

- [API 설계 가이드](./docs/API.md)
- [데이터베이스 스키마](./docs/DATABASE.md)
- [코딩 컨벤션](./docs/CONVENTIONS.md)

---

Last updated: 2024-07-06