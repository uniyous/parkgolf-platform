---
name: service-dev
description: Park Golf Platform 백엔드 서비스 개발 가이드. 새 서비스 생성, API 개발, NATS 메시징, 데이터베이스 연동 방법 안내. "서비스 만들기", "API 추가", "NATS", "마이크로서비스" 관련 질문 시 사용합니다.
---

# 백엔드 서비스 개발 가이드

## 서비스 구조

```
services/
├── auth-service/        # 인증/인가
├── course-service/      # 골프장/코스 관리
├── booking-service/     # 예약 관리
├── notify-service/      # 알림 (이메일, 푸시)
├── admin-api/           # 관리자 BFF
└── user-api/            # 사용자 BFF
```

## 서비스 아키텍처

```
┌─────────────┐     ┌─────────────┐
│ admin-api   │     │  user-api   │  ← BFF (Backend for Frontend)
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 │
         ┌───────┴───────┐
         │  NATS JetStream  │  ← 메시지 브로커
         └───────┬───────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───┴───┐  ┌────┴────┐  ┌────┴────┐
│ auth  │  │ course  │  │ booking │  ← 마이크로서비스
└───────┘  └─────────┘  └─────────┘
```

---

## 새 서비스 생성

### 1. 폴더 구조 생성

```bash
mkdir -p services/new-service/src/{domain,infrastructure,application,interfaces}
```

### 2. 기본 파일 생성

```
services/new-service/
├── src/
│   ├── domain/           # 도메인 모델, 엔티티
│   ├── infrastructure/   # DB, 외부 서비스 연동
│   ├── application/      # 비즈니스 로직
│   ├── interfaces/       # API 컨트롤러
│   └── main.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

### 3. package.json 템플릿

```json
{
  "name": "new-service",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "lint": "eslint src/",
    "test": "vitest"
  },
  "dependencies": {
    "fastify": "^4.x",
    "nats": "^2.x",
    "@prisma/client": "^5.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsx": "^4.x",
    "vitest": "^1.x"
  }
}
```

### 4. Dockerfile 템플릿

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 8080
CMD ["node", "dist/main.js"]
```

---

## NATS 메시징

### 연결 설정

```typescript
import { connect, NatsConnection, StringCodec } from 'nats';

const sc = StringCodec();
let nc: NatsConnection;

async function connectNats() {
  nc = await connect({
    servers: process.env.NATS_URL || 'nats://localhost:4222',
  });
  console.log('Connected to NATS');
}
```

### 메시지 발행 (Publish)

```typescript
// 이벤트 발행
nc.publish('booking.created', sc.encode(JSON.stringify({
  bookingId: '123',
  userId: 'user-456',
  courseId: 'course-789',
  timestamp: new Date().toISOString()
})));
```

### 메시지 구독 (Subscribe)

```typescript
// 이벤트 구독
const sub = nc.subscribe('booking.created');
for await (const msg of sub) {
  const data = JSON.parse(sc.decode(msg.data));
  console.log('Booking created:', data);
  // 처리 로직
}
```

### Request-Reply 패턴

```typescript
// 요청 보내기
const response = await nc.request('auth.validate', sc.encode(JSON.stringify({
  token: 'jwt-token-here'
})), { timeout: 5000 });

const result = JSON.parse(sc.decode(response.data));

// 요청 처리하기
const sub = nc.subscribe('auth.validate');
for await (const msg of sub) {
  const data = JSON.parse(sc.decode(msg.data));
  const isValid = validateToken(data.token);
  msg.respond(sc.encode(JSON.stringify({ valid: isValid })));
}
```

---

## 이벤트 명명 규칙

```
{도메인}.{동작}

예시:
- booking.created
- booking.cancelled
- user.registered
- course.updated
- notification.send
```

---

## 데이터베이스 연동 (Prisma)

### schema.prisma

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Booking {
  id        String   @id @default(uuid())
  userId    String
  courseId  String
  date      DateTime
  status    String   @default("pending")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 사용

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 생성
const booking = await prisma.booking.create({
  data: { userId, courseId, date }
});

// 조회
const bookings = await prisma.booking.findMany({
  where: { userId }
});
```

---

## API 엔드포인트 (Fastify)

```typescript
import Fastify from 'fastify';

const app = Fastify({ logger: true });

// Health check
app.get('/health', async () => ({ status: 'ok' }));

// API 라우트
app.get('/api/bookings', async (request, reply) => {
  const bookings = await bookingService.findAll();
  return bookings;
});

app.post('/api/bookings', async (request, reply) => {
  const booking = await bookingService.create(request.body);
  return reply.code(201).send(booking);
});

// 서버 시작
app.listen({ port: 8080, host: '0.0.0.0' });
```

---

## 환경 변수

```bash
# .env.example
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
NATS_URL=nats://localhost:4222
JWT_SECRET=your-secret-key
```

---

## 테스트

```typescript
// src/__tests__/booking.test.ts
import { describe, it, expect } from 'vitest';
import { BookingService } from '../application/BookingService';

describe('BookingService', () => {
  it('should create a booking', async () => {
    const service = new BookingService();
    const booking = await service.create({
      userId: 'user-1',
      courseId: 'course-1',
      date: new Date()
    });
    expect(booking.id).toBeDefined();
  });
});
```

---

## 로컬 개발

```bash
# 서비스 폴더로 이동
cd services/auth-service

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 테스트
npm test

# 빌드
npm run build
```

---

## CD Services 워크플로우에 추가

새 서비스를 배포하려면 `cd-services.yml`의 서비스 목록에 추가:

```yaml
ALL_SERVICES='["auth-service","course-service","booking-service","notify-service","admin-api","user-api","new-service"]'
```
