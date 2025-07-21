# Park Golf Platform - Database Schema Documentation

## 📊 데이터베이스 개요

### 아키텍처 원칙
- **Database per Service**: 각 마이크로서비스가 독립적인 데이터베이스 사용
- **ACID 준수**: PostgreSQL을 통한 트랜잭션 보장
- **관계 최소화**: 서비스 간 직접적인 FK 관계 제거
- **이벤트 기반 동기화**: NATS를 통한 데이터 일관성 유지

### 데이터베이스 목록
- `parkgolf_auth`: 인증 및 사용자 관리
- `parkgolf_course`: 코스 및 타임슬롯 관리
- `parkgolf_booking`: 예약 및 결제 관리
- `parkgolf_notify`: 알림 및 템플릿 관리
- `parkgolf_search`: 검색 인덱스 (예정)

## 🔐 Auth Database (`parkgolf_auth`)

### Users 테이블
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  roles TEXT[] DEFAULT '{"USER"}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**필드 설명**:
- `roles`: 사용자 역할 배열 (USER, ADMIN, MODERATOR, VIEWER)
- `is_active`: 계정 활성화 상태

### Refresh Tokens 테이블
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Admins 테이블
```sql
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role admin_role DEFAULT 'VIEWER',
  phone VARCHAR(20),
  department VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'VIEWER');
```

### Permissions 시스템
```sql
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  level VARCHAR(20) DEFAULT 'low',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admin_permissions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(admin_id, permission_id)
);
```

### Activity Logs
```sql
CREATE TABLE admin_activity_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🏌️ Course Database (`parkgolf_course`)

### Companies 테이블
```sql
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  phone_number VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Courses 테이블
```sql
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone_number VARCHAR(20),
  status course_status DEFAULT 'ACTIVE',
  company_id INTEGER REFERENCES companies(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE course_status AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');
```

### Holes 테이블
```sql
CREATE TABLE holes (
  id SERIAL PRIMARY KEY,
  hole_number INTEGER NOT NULL,
  par INTEGER NOT NULL,
  distance INTEGER,
  course_id INTEGER REFERENCES courses(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, hole_number)
);
```

### Tee Boxes 테이블
```sql
CREATE TABLE tee_boxes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20),
  distance INTEGER NOT NULL,
  hole_id INTEGER REFERENCES holes(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Time Slots 테이블
```sql
CREATE TABLE course_time_slots (
  id SERIAL PRIMARY KEY,
  date VARCHAR(10) NOT NULL, -- YYYY-MM-DD format
  start_time VARCHAR(5) NOT NULL, -- HH:MM format
  end_time VARCHAR(5) NOT NULL, -- HH:MM format
  max_players INTEGER DEFAULT 4,
  price DECIMAL(10,2) NOT NULL,
  course_id INTEGER REFERENCES courses(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, date, start_time, end_time)
);
```

### Weekly Schedules 테이블
```sql
CREATE TABLE course_weekly_schedules (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  open_time VARCHAR(5) NOT NULL, -- HH:MM format
  close_time VARCHAR(5) NOT NULL, -- HH:MM format
  course_id INTEGER REFERENCES courses(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, day_of_week)
);
```

## 📅 Booking Database (`parkgolf_booking`)

### Bookings 테이블
```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL, -- 외부 참조 (auth DB)
  course_id INTEGER NOT NULL, -- 외부 참조 (course DB)
  course_name VARCHAR(255) NOT NULL, -- 캐시된 데이터
  course_location VARCHAR(255) NOT NULL, -- 캐시된 데이터
  booking_date TIMESTAMP NOT NULL,
  time_slot VARCHAR(5) NOT NULL, -- HH:MM format
  player_count INTEGER DEFAULT 1,
  price_per_person DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status booking_status DEFAULT 'CONFIRMED',
  payment_method VARCHAR(50),
  special_requests TEXT,
  booking_number VARCHAR(20) UNIQUE NOT NULL, -- BK12345678
  user_email VARCHAR(255) NOT NULL, -- 캐시된 데이터
  user_name VARCHAR(255) NOT NULL, -- 캐시된 데이터
  user_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- 인덱스
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_course_id ON bookings(course_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_number ON bookings(booking_number);
CREATE INDEX idx_bookings_status ON bookings(status);
```

### Payments 테이블
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_status payment_status DEFAULT 'PENDING',
  transaction_id VARCHAR(100),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
```

### Booking History 테이블
```sql
CREATE TABLE booking_history (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  action VARCHAR(50) NOT NULL, -- CREATED, UPDATED, CANCELLED, etc.
  details JSONB,
  user_id INTEGER NOT NULL, -- 작업 수행한 사용자
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_booking_history_booking_id ON booking_history(booking_id);
```

### Time Slot Availability 테이블
```sql
CREATE TABLE time_slot_availability (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL,
  date TIMESTAMP NOT NULL,
  time_slot VARCHAR(5) NOT NULL, -- HH:MM format
  max_capacity INTEGER DEFAULT 4,
  booked INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, date, time_slot)
);

CREATE INDEX idx_time_slot_course_id ON time_slot_availability(course_id);
CREATE INDEX idx_time_slot_date ON time_slot_availability(date);
```

### Course Cache 테이블 (동기화)
```sql
CREATE TABLE course_cache (
  id SERIAL PRIMARY KEY,
  course_id INTEGER UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  description TEXT,
  rating DECIMAL(3,2),
  price_per_hour DECIMAL(10,2),
  image_url TEXT,
  amenities TEXT[], -- PostgreSQL array
  open_time VARCHAR(5), -- HH:MM format
  close_time VARCHAR(5), -- HH:MM format
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 📬 Notify Database (`parkgolf_notify`)

### Notification Templates 테이블
```sql
CREATE TABLE notification_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  type notification_type NOT NULL,
  subject VARCHAR(255),
  content TEXT NOT NULL,
  variables JSONB, -- 템플릿 변수 정의
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE notification_type AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');
```

### Notifications 테이블
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL, -- 외부 참조 (auth DB)
  type notification_type NOT NULL,
  title VARCHAR(255),
  content TEXT NOT NULL,
  status notification_status DEFAULT 'PENDING',
  read_at TIMESTAMP,
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at);
```

## 🔍 데이터 동기화 전략

### 1. 이벤트 기반 동기화
```javascript
// 예약 생성 시 코스 정보 캐싱
nats.subscribe('course.updated', async (data) => {
  await bookingService.updateCourseCache(data.courseId, data);
});

// 사용자 정보 변경 시 예약 정보 업데이트
nats.subscribe('user.updated', async (data) => {
  await bookingService.updateUserInfo(data.userId, {
    email: data.email,
    name: data.name,
    phone: data.phone
  });
});
```

### 2. 캐시 무효화
- TTL 기반 자동 만료
- 이벤트 기반 즉시 갱신
- 배치 작업을 통한 정기 동기화

## 📈 성능 최적화

### 인덱스 전략
```sql
-- 복합 인덱스
CREATE INDEX idx_bookings_user_date ON bookings(user_id, booking_date);
CREATE INDEX idx_time_slots_course_date ON course_time_slots(course_id, date);

-- 부분 인덱스
CREATE INDEX idx_active_courses ON courses(id) WHERE is_active = true;
CREATE INDEX idx_pending_notifications ON notifications(user_id) WHERE status = 'PENDING';
```

### 파티셔닝 (향후 계획)
```sql
-- 예약 테이블 월별 파티셔닝
CREATE TABLE bookings_2024_01 PARTITION OF bookings
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE bookings_2024_02 PARTITION OF bookings
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

## 🔒 보안 고려사항

### 1. 민감 정보 암호화
- 비밀번호: bcrypt 해싱
- 개인정보: 필요시 AES 암호화
- 토큰: JWT 서명 검증

### 2. 접근 제어
- Row Level Security (RLS) 적용
- 서비스별 DB 사용자 분리
- 최소 권한 원칙

### 3. 감사 로그
- 모든 중요 작업 로깅
- 개인정보 접근 기록
- 변경 이력 추적

## 🚀 마이그레이션 전략

### 1. Prisma 마이그레이션
```bash
# 마이그레이션 생성
npx prisma migrate dev --name init_user_system

# 프로덕션 마이그레이션
npx prisma migrate deploy
```

### 2. 데이터 시딩
```typescript
// prisma/seed.ts
async function main() {
  // 기본 관리자 생성
  await prisma.admin.create({
    data: {
      username: 'admin',
      email: 'admin@parkgolf.com',
      password: await bcrypt.hash('admin123', 10),
      name: '시스템 관리자',
      role: 'SUPER_ADMIN'
    }
  });

  // 기본 권한 생성
  await prisma.permission.createMany({
    data: [
      { code: 'admin.manage', name: '관리자 관리', category: 'admin' },
      { code: 'course.manage', name: '코스 관리', category: 'course' },
      { code: 'booking.manage', name: '예약 관리', category: 'booking' }
    ]
  });
}
```

---

*마지막 업데이트: 2025-07-13*