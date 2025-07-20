# Park Golf Platform - API Documentation

## 📚 API 개요

### Base URLs
- **Admin API**: `http://localhost:3091/api`
- **User API**: `http://localhost:3001/api`
- **Auth Service**: `http://localhost:3011/api`
- **Course Service**: `http://localhost:3012/api`
- **Booking Service**: `http://localhost:3013/api`

### 인증 방식
모든 API는 JWT Bearer 토큰을 사용합니다:
```
Authorization: Bearer <access_token>
```

## 🔐 Auth Service APIs

### 사용자 인증

#### 로그인
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password123"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "user@example.com",
    "email": "user@example.com",
    "name": "홍길동",
    "roles": ["USER"]
  }
}
```

#### 회원가입
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "user@example.com",
  "email": "user@example.com",
  "password": "password123",
  "name": "홍길동"
}
```

#### 토큰 갱신
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

### 관리자 인증

#### 관리자 로그인
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "admin": {
    "id": 1,
    "username": "admin",
    "email": "admin@parkgolf.com",
    "name": "관리자",
    "role": "SUPER_ADMIN",
    "permissions": [
      {
        "code": "admin.manage",
        "name": "관리자 관리"
      }
    ]
  }
}
```

## 🏌️ Course Service APIs

### 회사 관리

#### 회사 목록 조회
```http
GET /api/companies?page=1&limit=10&search=골프장

Response:
{
  "data": [
    {
      "id": 1,
      "name": "그린필드 골프장",
      "description": "최고의 파크골프 경험",
      "address": "서울시 강남구",
      "phoneNumber": "02-1234-5678",
      "isActive": true,
      "courseCount": 3
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

#### 회사 생성
```http
POST /api/companies
Content-Type: application/json

{
  "name": "새로운 골프장",
  "description": "설명",
  "address": "주소",
  "phoneNumber": "전화번호",
  "email": "email@example.com"
}
```

### 코스 관리

#### 코스 목록 조회
```http
GET /api/courses?companyId=1&status=ACTIVE

Response:
{
  "data": [
    {
      "id": 1,
      "name": "레이크 코스",
      "description": "호수가 보이는 아름다운 코스",
      "address": "서울시 강남구 123",
      "status": "ACTIVE",
      "company": {
        "id": 1,
        "name": "그린필드 골프장"
      },
      "holes": 18
    }
  ],
  "meta": {...}
}
```

#### 코스 상세 조회
```http
GET /api/courses/1

Response:
{
  "id": 1,
  "name": "레이크 코스",
  "holes": [
    {
      "id": 1,
      "holeNumber": 1,
      "par": 4,
      "distance": 350,
      "teeBoxes": [
        {
          "id": 1,
          "name": "Red",
          "color": "#FF0000",
          "distance": 320
        }
      ]
    }
  ],
  "timeSlots": [...],
  "weeklySchedules": [...]
}
```

### 타임슬롯 관리

#### 타임슬롯 목록 조회
```http
GET /api/time-slots?courseId=1&date=2024-07-13

Response:
{
  "data": [
    {
      "id": 1,
      "date": "2024-07-13",
      "startTime": "09:00",
      "endTime": "09:50",
      "maxPlayers": 4,
      "price": "50000",
      "isActive": true,
      "availableSlots": 2
    }
  ]
}
```

#### 타임슬롯 벌크 생성
```http
POST /api/time-slots/bulk
Content-Type: application/json

{
  "courseId": 1,
  "dates": ["2024-07-13", "2024-07-14"],
  "startTime": "09:00",
  "endTime": "18:00",
  "interval": 60,
  "maxPlayers": 4,
  "price": 50000
}

Response:
{
  "created": 18,
  "failed": 0,
  "message": "18개의 타임슬롯이 생성되었습니다"
}
```

## 📅 Booking Service APIs

### 예약 관리

#### 예약 생성
```http
POST /api/bookings
Content-Type: application/json

{
  "courseId": 1,
  "bookingDate": "2024-07-13",
  "timeSlot": "09:00",
  "playerCount": 4,
  "specialRequests": "특별 요청사항",
  "paymentMethod": "card"
}

Response:
{
  "id": 1,
  "bookingNumber": "BK20240713001",
  "status": "CONFIRMED",
  "totalPrice": "200000",
  "qrCode": "data:image/png;base64..."
}
```

#### 예약 목록 조회
```http
GET /api/bookings?userId=1&status=CONFIRMED&startDate=2024-07-01

Response:
{
  "data": [
    {
      "id": 1,
      "bookingNumber": "BK20240713001",
      "courseName": "레이크 코스",
      "bookingDate": "2024-07-13T00:00:00Z",
      "timeSlot": "09:00",
      "playerCount": 4,
      "status": "CONFIRMED",
      "totalPrice": "200000"
    }
  ],
  "meta": {...}
}
```

#### 예약 취소
```http
POST /api/bookings/1/cancel
Content-Type: application/json

{
  "reason": "개인 사정"
}

Response:
{
  "id": 1,
  "status": "CANCELLED",
  "refundAmount": "200000",
  "message": "예약이 취소되었습니다"
}
```

## 👤 Admin API (BFF)

### 대시보드

#### 통계 조회
```http
GET /api/dashboard/stats

Response:
{
  "overview": {
    "totalBookings": 1234,
    "totalRevenue": "12340000",
    "activeUsers": 456,
    "activeCourses": 15
  },
  "trends": {
    "bookings": [
      { "date": "2024-07-01", "count": 45 },
      { "date": "2024-07-02", "count": 52 }
    ],
    "revenue": [...]
  }
}
```

### 관리자 관리

#### 관리자 목록 조회
```http
GET /api/admins?role=ADMIN&isActive=true

Response:
{
  "data": [
    {
      "id": 1,
      "username": "admin1",
      "email": "admin1@parkgolf.com",
      "name": "관리자1",
      "role": "ADMIN",
      "department": "운영팀",
      "isActive": true,
      "lastLoginAt": "2024-07-13T10:00:00Z",
      "permissions": [...]
    }
  ],
  "meta": {...}
}
```

#### 관리자 권한 수정
```http
PUT /api/admins/1/permissions
Content-Type: application/json

{
  "permissions": [
    "admin.view",
    "course.manage",
    "booking.manage"
  ]
}
```

### 알림 관리

#### 알림 전송
```http
POST /api/notifications/send
Content-Type: application/json

{
  "type": "EMAIL",
  "recipients": ["user@example.com"],
  "templateId": "booking_confirmation",
  "data": {
    "bookingNumber": "BK20240713001",
    "courseName": "레이크 코스"
  }
}
```

## 📡 WebSocket Events (NATS)

### 예약 이벤트
```javascript
// 예약 생성
nats.publish('booking.create', {
  userId: 1,
  courseId: 1,
  bookingDate: '2024-07-13',
  timeSlot: '09:00'
});

// 예약 생성 완료
nats.subscribe('booking.created', (data) => {
  console.log('예약 생성됨:', data.bookingNumber);
});

// 예약 취소
nats.publish('booking.cancel', {
  bookingId: 1,
  reason: '고객 요청'
});
```

### 실시간 알림
```javascript
// 알림 구독
nats.subscribe('notification.user.1', (notification) => {
  console.log('새 알림:', notification);
});
```

## 🔍 공통 응답 형식

### 성공 응답
```json
{
  "data": {...},
  "meta": {
    "timestamp": "2024-07-13T10:00:00Z",
    "version": "1.0.0"
  }
}
```

### 에러 응답
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "유효하지 않은 요청입니다",
    "details": [
      {
        "field": "email",
        "message": "올바른 이메일 형식이 아닙니다"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-07-13T10:00:00Z",
    "requestId": "req_123456"
  }
}
```

## 📝 HTTP 상태 코드

- `200 OK`: 성공
- `201 Created`: 생성 성공
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 필요
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 충돌 (중복 등)
- `422 Unprocessable Entity`: 유효성 검사 실패
- `500 Internal Server Error`: 서버 오류

## 🛡️ Rate Limiting

모든 API는 Rate Limiting이 적용됩니다:
- 일반 사용자: 100 requests/minute
- 인증된 사용자: 1000 requests/minute
- 관리자: 무제한

Rate Limit 정보는 응답 헤더에 포함됩니다:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1689320400
```

## 🔧 API 테스트

### cURL 예제
```bash
# 로그인
curl -X POST http://localhost:3091/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 인증된 요청
curl -X GET http://localhost:3091/api/courses \
  -H "Authorization: Bearer <access_token>"
```

### Postman Collection
프로젝트 루트의 `postman/` 디렉토리에서 Postman Collection을 찾을 수 있습니다.

---

*마지막 업데이트: 2025-07-13*