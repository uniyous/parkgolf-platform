# 에러 코드 & 메시지 전달 체계

## 목차

- [1. 개요](#1-개요)
- [2. 에러 응답 형식](#2-에러-응답-형식)
- [3. Backend 에러 처리](#3-backend-에러-처리)
- [4. BFF 에러 전파](#4-bff-에러-전파)
- [5. Frontend 에러 처리](#5-frontend-에러-처리)
- [6. 에러 코드 카탈로그](#6-에러-코드-카탈로그)
- [7. 전체 에러 흐름](#7-전체-에러-흐름)

---

## 1. 개요

### 1.1 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **Backend = 에러 코드 발급** | Microservice에서 `AppException`으로 도메인 에러 코드(`BOOK_004` 등)를 정확하게 발급 |
| **BFF = 패스스루** | `user-api`/`admin-api`는 Microservice 응답을 변환 없이 그대로 전달 |
| **Frontend = 코드 기반 메시지** | 에러 코드를 키로 사용하여 사용자 친화적 메시지를 표시 |

### 1.2 플랫폼별 현황

| 계층 | 구현 | 파일 |
|------|------|------|
| **Backend** | `ErrorDef` 카탈로그 + `AppException` + `UnifiedExceptionFilter` | `error-catalog.ts`, `app.exception.ts`, `unified-exception.filter.ts` |
| **BFF** | `NatsClientService.handleError` — 에러 코드 기반 HTTP 상태 매핑 | `nats-client.service.ts` |
| **Web** | `ERROR_MESSAGES` 매핑 + `ApiError` 클래스 + Toast 헬퍼 | `common.ts`, `errors.ts` |
| **iOS** | `APIError.serverError(code, message)` — 서버 메시지 직접 표시 | `APIClient.swift` |
| **Android** | `parseHttpErrorMessage` — 서버 메시지 직접 표시 | `ApiResponseExtensions.kt` |

---

## 2. 에러 응답 형식

모든 API 에러 응답은 아래 형식을 따른다.

```json
{
  "success": false,
  "error": {
    "code": "BOOK_004",
    "message": "취소 가능 시간이 지났습니다"
  },
  "timestamp": "2025-01-02T12:00:00.000Z"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `success` | `false` | 항상 `false` |
| `error.code` | `string` | 도메인 에러 코드 (`{PREFIX}_{NUMBER}`) |
| `error.message` | `string` | 한국어 기본 메시지 (참고용, Frontend는 code 기반 매핑 우선) |
| `timestamp` | `string` | ISO 8601 |

---

## 3. Backend 에러 처리

### 3.1 에러 정의 (`error-catalog.ts`)

```typescript
export interface ErrorDef {
  readonly code: string;       // 'BOOK_004'
  readonly message: string;    // '취소 가능 시간이 지났습니다'
  readonly httpStatus: number; // 400
}

export const BookingErrors = defineErrors({
  NOT_FOUND:              { code: 'BOOK_001', message: '예약을 찾을 수 없습니다', httpStatus: 404 },
  SLOT_UNAVAILABLE:       { code: 'BOOK_002', message: '해당 시간대는 예약할 수 없습니다', httpStatus: 409 },
  ALREADY_CANCELLED:      { code: 'BOOK_003', message: '이미 취소된 예약입니다', httpStatus: 400 },
  CANCEL_DEADLINE_PASSED: { code: 'BOOK_004', message: '취소 가능 시간이 지났습니다', httpStatus: 400 },
  // ...
});

export const Errors = {
  Auth: AuthErrors,
  User: UserErrors,
  Admin: AdminErrors,
  Booking: BookingErrors,
  Course: CourseErrors,
  Validation: ValidationErrors,
  External: ExternalErrors,
  Database: DatabaseErrors,
  System: SystemErrors,
} as const;
```

### 3.2 예외 발생 (`AppException`)

```typescript
// Service에서 AppException throw (Controller에 try-catch 불필요)
throw new AppException(Errors.Booking.CANCEL_DEADLINE_PASSED);
throw new AppException(Errors.User.NOT_FOUND, '사용자 ID: 123을 찾을 수 없습니다');
```

`AppException`은 `ErrorDef`를 받아 `StandardErrorResponse` 형식의 응답을 생성한다.

```typescript
export class AppException extends HttpException {
  constructor(errorDef: ErrorDef, customMessage?: string) {
    const response: StandardErrorResponse = {
      success: false,
      error: {
        code: errorDef.code,
        message: customMessage || errorDef.message,
      },
      timestamp: new Date().toISOString(),
    };
    super(response, errorDef.httpStatus);
  }
}
```

### 3.3 통합 예외 필터 (`UnifiedExceptionFilter`)

모든 서비스의 `main.ts`에서 전역 적용되며, HTTP/RPC 컨텍스트를 자동 판별한다.

```
예외 유형             → 처리 방식
─────────────────────────────────────────────────
AppException         → toRpcError() 호출
RpcException         → 표준 형식 확인 후 패스스루
HttpException        → 표준 형식으로 변환
ValidationPipe 에러  → message 배열 join → VAL_001
Prisma P2002         → DB_001 (UNIQUE_VIOLATION, 409)
Prisma P2025         → DB_002 (NOT_FOUND, 404)
Prisma P2003         → DB_003 (FK_VIOLATION, 400)
기타 Error           → SYS_001 (Internal, 500)
```

**RPC 컨텍스트에서의 동작:**
```
Microservice에서 예외 발생
    ↓ UnifiedExceptionFilter.catch()
    ↓ createErrorResponse() → StandardErrorResponse 생성
    ↓ throw new RpcException(JSON.stringify(errorResponse))
    ↓ NATS를 통해 BFF로 전파
```

### 3.4 규칙

- Service 계층에서 `AppException`을 throw — Controller에 try-catch **금지**
- `BadRequestException` 등 NestJS 기본 예외 직접 throw **지양** → `AppException` 사용
- 정책 위반 에러도 도메인 에러 코드로 발급 (예: `Errors.Booking.CANCEL_DEADLINE_PASSED`)

---

## 4. BFF 에러 전파

### 4.1 NatsClientService.handleError

BFF(`user-api`, `admin-api`)의 `NatsClientService`가 NATS 에러를 `HttpException`으로 변환한다.

```
Microservice → RpcException(JSON) → NATS → BFF NatsClientService
    ↓
JSON.parse(error.message) → { success: false, error: { code, message } }
    ↓
getStatusFromErrorCode(code) → HTTP 상태 코드 결정
    ↓
throw new HttpException(parsed, statusCode)
    ↓
클라이언트에 HTTP 응답으로 전달
```

### 4.2 에러 코드 → HTTP 상태 매핑

| 접두사 | HTTP 상태 | 비고 |
|--------|-----------|------|
| `AUTH_` | 401/403 | AUTH_005, AUTH_006은 403 |
| `USER_` / `ADMIN_` | 404/409/403 | _001: 404, _002~003: 409, _004: 403 |
| `BOOK_` | 404/409/400 | BOOK_001: 404, BOOK_002: 409, 나머지: 400 |
| `COURSE_` | 404/400 | COURSE_007: 400, 나머지: 404 |
| `VAL_` | 400 | |
| `EXT_` | 503/504/502 | EXT_001: 503, EXT_002: 504, 나머지: 502 |
| `DB_` | 409/404/400/503 | DB_001: 409, DB_002: 404, DB_003: 400, DB_004: 503 |
| `SYS_` | 500/503/408/429 | SYS_002/005: 503, SYS_003: 408, SYS_004: 429 |
| `PAY_` | 404/400 | PAY_001: 404, 나머지: 400 |
| `REFUND_` | 404/400 | REFUND_001: 404, 나머지: 400 |
| `BILLING_` | 404/409/400 | BILLING_001: 404, BILLING_003: 409, 나머지: 400 |

### 4.3 BFF 규칙

- Microservice 응답을 **그대로 전달** (변환/언래핑 금지)
- `ResponseTransformInterceptor` 사용 금지

---

## 5. Frontend 에러 처리

### 5.1 Web (React) — 완성 상태

#### 에러 코드 → 사용자 메시지 매핑

`apps/user-app-web/src/types/common.ts`:

```typescript
export const ERROR_MESSAGES: Record<string, string> = {
  AUTH_001: '이메일 또는 비밀번호가 올바르지 않습니다',
  AUTH_002: '토큰이 만료되었습니다. 다시 로그인해 주세요',
  BOOK_001: '예약을 찾을 수 없습니다',
  BOOK_004: '취소 가능 시간이 지났습니다',
  // ... 50+ 에러 코드 전체 매핑
};
```

#### 메시지 결정 로직

`apps/user-app-web/src/types/common.ts`:

```typescript
export function getErrorMessage(code?: string, fallbackMessage?: string): string {
  if (!code) {
    return fallbackMessage ? translateErrorMessage(fallbackMessage) : '오류가 발생했습니다';
  }
  // VAL_ 에러는 서버 메시지가 더 구체적이므로 우선 사용
  if (code.startsWith('VAL_') && fallbackMessage && fallbackMessage !== ERROR_MESSAGES[code]) {
    return translateErrorMessage(fallbackMessage);
  }
  return ERROR_MESSAGES[code] || (fallbackMessage ? translateErrorMessage(fallbackMessage) : '오류가 발생했습니다');
}
```

**우선순위:**
1. `ERROR_MESSAGES[code]` — 에러 코드 매핑 **(유일한 정규 경로)**
2. `translateErrorMessage(fallbackMessage)` — 영어 패턴 매칭 (deprecated, 제거 예정)
3. `'오류가 발생했습니다'` — 기본 메시지

> **목표**: Backend 에러 코드 표준화 완료 후 2순위를 제거하고, 에러 코드 매핑만으로 모든 에러 메시지를 처리한다.

#### 영어 메시지 번역 (deprecated)

> **제거 예정**: 아래 regex 패턴 매칭 방식은 Backend에서 `BadRequestException`을 직접 throw하던 시기의 임시 대응이다.
> Backend의 모든 에러를 `AppException` + 도메인 에러 코드로 전환 완료 후 제거한다.
> 새 에러 추가 시 이 패턴 목록에 추가하지 말고, **반드시 Backend 에러 카탈로그에 에러 코드를 추가**한다.

```typescript
// ❌ 제거 예정 — 새 에러 추가 금지
const ENGLISH_ERROR_TRANSLATIONS: Array<{
  pattern: RegExp;
  translate: (match: RegExpMatchArray) => string;
}> = [
  {
    pattern: /Not enough capacity\. Available: (\d+), Requested: (\d+)/,
    translate: (match) => `잔여 인원이 부족합니다. (남은 자리: ${match[1]}명, 요청: ${match[2]}명)`,
  },
  // ...
];
```

#### ApiError 클래스

`apps/user-app-web/src/lib/errors.ts`:

```typescript
export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;

  getUserMessage(): string {
    return this.code ? getErrorMessage(this.code, this.message) : this.message;
  }

  isAuthError(): boolean { return this.status === 401 || this.code?.startsWith('AUTH_') || false; }
  isServerError(): boolean { return this.status >= 500; }
  isNetworkError(): boolean { return this.status === 0; }
}
```

#### Toast 표시

```typescript
export function showErrorToast(error: unknown, fallbackMessage?: string): void {
  // 네트워크 에러 → "인터넷 연결을 확인해주세요."
  // 인증 에러 (401) → Toast 생략 (자동 리다이렉트)
  // 일반 에러 → getUserMessage() 결과 표시
}
```

### 5.2 iOS — 서버 메시지 직접 표시

`apps/user-app-ios/Sources/Core/Network/APIClient.swift`:

```swift
enum APIError: Error, LocalizedError {
    case serverError(code: String, message: String)
    case unauthorized
    case networkError(Error)
    // ...

    var errorDescription: String? {
        switch self {
        case .serverError(_, let message):
            return message  // 서버 메시지 그대로 사용
        case .unauthorized:
            return "인증이 필요합니다. 다시 로그인해 주세요."
        // ...
        }
    }
}
```

**현재 한계:** `code` 필드는 수신하지만 메시지 매핑 없이 서버 메시지를 직접 표시.

### 5.3 Android — 서버 메시지 직접 표시

`apps/user-app-android/.../util/ApiResponseExtensions.kt`:

```kotlin
fun parseHttpErrorMessage(e: HttpException): String {
    return try {
        val errorBody = e.response()?.errorBody()?.string()
        val errorResponse = json.decodeFromString<ApiResponse<Unit?>>(errorBody)
        errorResponse.error?.message ?: "요청에 실패했습니다 (${e.code()})"
    } catch (_: Exception) {
        "요청에 실패했습니다 (${e.code()})"
    }
}
```

**현재 한계:** `error.code`를 파싱하지만 메시지 변환 없이 `error.message`를 그대로 사용.

### 5.4 에러 유형별 UX 분기

| 에러 유형 | 코드 접두사 | UX 동작 |
|-----------|-------------|---------|
| **Auth** (인증) | `AUTH_` / HTTP 401 | 로그인 화면 이동, Toast 생략 |
| **Business** (비즈니스) | `BOOK_`, `COURSE_`, `VAL_`, `PAY_`, `REFUND_` | 에러 메시지 표시 (Snackbar/Alert) |
| **Network** (네트워크) | 연결 실패 | "네트워크 연결을 확인해 주세요" |
| **System** (시스템) | `SYS_`, `DB_`, `EXT_` | 일반 에러 메시지 표시 |

---

## 6. 에러 코드 카탈로그

### 인증 (AUTH_xxx)

| 코드 | 메시지 | HTTP |
|------|--------|------|
| `AUTH_001` | 이메일 또는 비밀번호가 올바르지 않습니다 | 401 |
| `AUTH_002` | 토큰이 만료되었습니다 | 401 |
| `AUTH_003` | 유효하지 않은 토큰입니다 | 401 |
| `AUTH_004` | 리프레시 토큰이 만료되었습니다 | 401 |
| `AUTH_005` | 권한이 부족합니다 | 403 |
| `AUTH_006` | 비활성화된 계정입니다 | 403 |
| `AUTH_007` | 인증 토큰이 필요합니다 | 401 |

### 사용자 (USER_xxx)

| 코드 | 메시지 | HTTP |
|------|--------|------|
| `USER_001` | 사용자를 찾을 수 없습니다 | 404 |
| `USER_002` | 이미 등록된 이메일입니다 | 409 |
| `USER_003` | 이미 등록된 전화번호입니다 | 409 |
| `USER_004` | 비활성화된 사용자입니다 | 403 |

### 관리자 (ADMIN_xxx)

| 코드 | 메시지 | HTTP |
|------|--------|------|
| `ADMIN_001` | 관리자를 찾을 수 없습니다 | 404 |
| `ADMIN_002` | 이미 등록된 관리자 이메일입니다 | 409 |
| `ADMIN_003` | 비활성화된 관리자입니다 | 403 |
| `ADMIN_004` | 유효하지 않은 관리자 역할입니다 | 400 |

### 예약 (BOOK_xxx)

| 코드 | 메시지 | HTTP |
|------|--------|------|
| `BOOK_001` | 예약을 찾을 수 없습니다 | 404 |
| `BOOK_002` | 해당 시간대는 예약할 수 없습니다 | 409 |
| `BOOK_003` | 이미 취소된 예약입니다 | 400 |
| `BOOK_004` | 취소 가능 시간이 지났습니다 | 400 |
| `BOOK_005` | 최대 예약 가능 횟수를 초과했습니다 | 400 |
| `BOOK_006` | 유효하지 않은 예약 날짜입니다 | 400 |
| `BOOK_007` | 과거 날짜는 예약할 수 없습니다 | 400 |

### 코스 (COURSE_xxx)

| 코드 | 메시지 | HTTP |
|------|--------|------|
| `COURSE_001` | 코스를 찾을 수 없습니다 | 404 |
| `COURSE_002` | 클럽을 찾을 수 없습니다 | 404 |
| `COURSE_003` | 홀을 찾을 수 없습니다 | 404 |
| `COURSE_004` | 게임을 찾을 수 없습니다 | 404 |
| `COURSE_005` | 스케줄을 찾을 수 없습니다 | 404 |
| `COURSE_006` | 타임슬롯을 찾을 수 없습니다 | 404 |
| `COURSE_007` | 비활성화된 코스입니다 | 400 |

### 결제 (PAY_xxx)

| 코드 | 메시지 | HTTP |
|------|--------|------|
| `PAY_001` | 결제 정보를 찾을 수 없습니다 | 404 |
| `PAY_002` | 이미 승인된 결제입니다 | 400 |
| `PAY_003` | 이미 취소된 결제입니다 | 400 |
| `PAY_004` | 결제 금액이 일치하지 않습니다 | 400 |
| `PAY_005` | 결제 상태가 올바르지 않습니다 | 400 |
| `PAY_006` | 결제 승인에 실패했습니다 | 400 |
| `PAY_007` | 결제 취소에 실패했습니다 | 400 |
| `PAY_008` | 결제 유효 시간이 만료되었습니다 | 400 |
| `PAY_009` | 유효하지 않은 카드입니다 | 400 |
| `PAY_010` | 잔액이 부족합니다 | 400 |
| `PAY_011` | 결제 한도를 초과했습니다 | 400 |

### 환불 (REFUND_xxx)

| 코드 | 메시지 | HTTP |
|------|--------|------|
| `REFUND_001` | 환불 정보를 찾을 수 없습니다 | 404 |
| `REFUND_002` | 이미 환불 처리된 결제입니다 | 400 |
| `REFUND_003` | 환불 금액이 결제 금액을 초과합니다 | 400 |
| `REFUND_004` | 환불 처리에 실패했습니다 | 400 |
| `REFUND_005` | 환불 계좌 정보가 올바르지 않습니다 | 400 |

### 빌링 (BILLING_xxx)

| 코드 | 메시지 | HTTP |
|------|--------|------|
| `BILLING_001` | 빌링키를 찾을 수 없습니다 | 404 |
| `BILLING_002` | 빌링키 발급에 실패했습니다 | 400 |
| `BILLING_003` | 이미 등록된 카드입니다 | 409 |
| `BILLING_004` | 자동결제에 실패했습니다 | 400 |

### 유효성 검증 (VAL_xxx)

| 코드 | 메시지 | HTTP |
|------|--------|------|
| `VAL_001` | 입력값이 올바르지 않습니다 | 400 |
| `VAL_002` | 필수 항목이 누락되었습니다 | 400 |
| `VAL_003` | 형식이 올바르지 않습니다 | 400 |
| `VAL_004` | 이메일 형식이 올바르지 않습니다 | 400 |
| `VAL_005` | 전화번호 형식이 올바르지 않습니다 | 400 |

### 외부 API (EXT_xxx)

| 코드 | 메시지 | HTTP |
|------|--------|------|
| `EXT_001` | 외부 서비스에 연결할 수 없습니다 | 503 |
| `EXT_002` | 외부 서비스 응답 시간 초과 | 504 |
| `EXT_003` | 외부 서비스 오류 | 502 |
| `EXT_004` | 결제 처리에 실패했습니다 | 502 |
| `EXT_005` | SMS 발송에 실패했습니다 | 502 |

### 데이터베이스 (DB_xxx)

| 코드 | 메시지 | HTTP |
|------|--------|------|
| `DB_001` | 중복된 데이터입니다 | 409 |
| `DB_002` | 데이터를 찾을 수 없습니다 | 404 |
| `DB_003` | 참조 무결성 위반 | 400 |
| `DB_004` | 데이터베이스 연결 오류 | 503 |

### 시스템 (SYS_xxx)

| 코드 | 메시지 | HTTP |
|------|--------|------|
| `SYS_001` | 내부 서버 오류 | 500 |
| `SYS_002` | 서비스를 일시적으로 사용할 수 없습니다 | 503 |
| `SYS_003` | 요청 시간 초과 | 408 |
| `SYS_004` | 요청 한도 초과 | 429 |
| `SYS_005` | 서비스 점검 중입니다 | 503 |

---

## 7. 전체 에러 흐름

### 7.1 정상 흐름 (AppException 사용)

```
[Microservice]
  policy.service.ts: throw new AppException(Errors.Booking.CANCEL_DEADLINE_PASSED)
      ↓
  UnifiedExceptionFilter → StandardErrorResponse 생성
      ↓
  throw new RpcException(JSON.stringify({
    success: false,
    error: { code: "BOOK_004", message: "취소 가능 시간이 지났습니다" },
    timestamp: "..."
  }))
      ↓ NATS
[BFF - user-api]
  NatsClientService.handleError
      ↓ JSON.parse → getStatusFromErrorCode("BOOK_004") → 400
      ↓ throw new HttpException(parsed, 400)
      ↓
  HTTP 400 → { success: false, error: { code: "BOOK_004", message: "취소 가능 시간이 지났습니다" } }
      ↓
[Frontend]
  Web:     ERROR_MESSAGES["BOOK_004"] → "취소 가능 시간이 지났습니다"  → Toast
  iOS:     APIError.serverError("BOOK_004", "취소 가능 시간이 지났습니다") → Alert
  Android: ApiResponse.error.message → "취소 가능 시간이 지났습니다" → Snackbar
```

### 7.2 ValidationPipe 에러

```
[BFF - user-api]
  ValidationPipe: class-validator 에러 감지
      ↓
  HttpException(400, { message: ["clubId must be a string", "date is required"] })
      ↓
  UnifiedExceptionFilter → message 배열 join
      ↓
  { success: false, error: { code: "VAL_001", message: "clubId must be a string, date is required" } }
```

### 7.3 Prisma 에러

```
[Microservice]
  Prisma: Unique constraint violation (P2002)
      ↓
  UnifiedExceptionFilter.handlePrismaError
      ↓
  { success: false, error: { code: "DB_001", message: "중복된 데이터입니다" } }
      ↓ HTTP 409
```

### 7.4 에러 코드 추가 시 체크리스트

새 에러 코드를 추가할 때 아래 파일을 함께 업데이트한다.

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `services/{service}/src/common/exceptions/catalog/error-catalog.ts` | `ErrorDef` 추가 |
| 2 | `services/user-api/src/common/nats/nats-client.service.ts` | 접두사 매핑 확인 (기존 접두사면 불필요) |
| 3 | `apps/user-app-web/src/types/common.ts` | `BffErrorCode` 타입 + `ERROR_MESSAGES` 추가 |
| 4 | `apps/user-app-ios` / `apps/user-app-android` | 에러 메시지 매핑 추가 (구현 시) |
