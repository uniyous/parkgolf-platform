# NATS 메시징 패턴 가이드

이 문서는 parkgolf 프로젝트에서 사용하는 NATS 메시징 패턴과 규칙을 정의합니다.

## 목차
1. [NATS 아키텍처 개요](#nats-아키텍처-개요)
2. [메시지 패턴 명명 규칙](#메시지-패턴-명명-규칙)
3. [BFF 서비스에서 NATS 사용](#bff-서비스에서-nats-사용)
4. [Microservice에서 NATS 핸들러 구현](#microservice에서-nats-핸들러-구현)
5. [타임아웃 설정](#타임아웃-설정)
6. [에러 처리](#에러-처리)
7. [인증 토큰 전달](#인증-토큰-전달)

---

## NATS 아키텍처 개요

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────────┐
│   클라이언트     │────▶│   BFF API    │────▶│    NATS Server      │
│  (Web/Mobile)   │     │ (admin-api)  │     │                     │
└─────────────────┘     │ (user-api)   │     └──────────┬──────────┘
                        └──────────────┘                │
                                                        ▼
                        ┌───────────────────────────────────────────┐
                        │              Microservices                 │
                        │  ┌─────────────┐  ┌─────────────────────┐ │
                        │  │auth-service │  │  course-service     │ │
                        │  └─────────────┘  └─────────────────────┘ │
                        │  ┌─────────────┐  ┌─────────────────────┐ │
                        │  │booking-svc  │  │  payment-service    │ │
                        │  └─────────────┘  └─────────────────────┘ │
                        └───────────────────────────────────────────┘
```

### 서비스 역할
- **BFF API (admin-api, user-api)**: HTTP 엔드포인트 제공, NATS Client로 동작
- **Microservices**: NATS Server로부터 메시지 수신, 비즈니스 로직 처리

---

## 메시지 패턴 명명 규칙

### 기본 형식
```
{domain}.{action}
{domain}.{subdomain}.{action}
```

### 도메인별 패턴

#### Auth Service
```typescript
// 관리자 인증
'admin.login'              // 관리자 로그인
'admin.register'           // 관리자 등록
'admin.findById'           // ID로 관리자 조회
'admin.update'             // 관리자 정보 업데이트
'admin.changePassword'     // 비밀번호 변경

// 사용자 인증
'user.login'               // 사용자 로그인
'user.register'            // 사용자 등록
'user.findById'            // ID로 사용자 조회
'user.refreshToken'        // 토큰 갱신
```

#### Course Service
```typescript
// 클럽 관리
'clubs.list'               // 클럽 목록 조회
'clubs.findById'           // ID로 클럽 조회
'clubs.create'             // 클럽 생성
'clubs.update'             // 클럽 수정
'clubs.delete'             // 클럽 삭제

// 코스 관리
'courses.list'             // 코스 목록 조회
'courses.findById'         // ID로 코스 조회
'courses.create'           // 코스 생성
'courses.update'           // 코스 수정
'courses.delete'           // 코스 삭제
'courses.findByClub'       // 클럽별 코스 조회

// 게임 관리
'games.list'               // 게임 목록 조회
'games.findById'           // ID로 게임 조회
'games.create'             // 게임 생성
'games.update'             // 게임 수정
'games.delete'             // 게임 삭제
'games.findByClub'         // 클럽별 게임 조회

// 주간 스케줄
'gameWeeklySchedules.getByGame'  // 게임별 주간 스케줄 조회
'gameWeeklySchedules.get'        // 스케줄 상세 조회
'gameWeeklySchedules.create'     // 스케줄 생성
'gameWeeklySchedules.update'     // 스케줄 수정
'gameWeeklySchedules.delete'     // 스케줄 삭제

// 타임슬롯
'gameTimeSlots.list'             // 타임슬롯 목록 조회
'gameTimeSlots.findById'         // ID로 타임슬롯 조회
'gameTimeSlots.getByGameAndDate' // 게임+날짜별 타임슬롯 조회
'gameTimeSlots.create'           // 타임슬롯 생성
'gameTimeSlots.update'           // 타임슬롯 수정
'gameTimeSlots.delete'           // 타임슬롯 삭제
'gameTimeSlots.generate'         // 타임슬롯 자동 생성
'gameTimeSlots.stats'            // 타임슬롯 통계
```

#### Booking Service
```typescript
// 예약 관리
'booking.list'             // 예약 목록 조회
'booking.findById'         // ID로 예약 조회
'booking.create'           // 예약 생성
'booking.update'           // 예약 수정
'booking.cancel'           // 예약 취소
'booking.confirm'          // 예약 확정

// 타임슬롯 가용성
'timeSlots.availability'   // 타임슬롯 가용성 조회
'timeSlots.book'           // 타임슬롯 예약
'timeSlots.release'        // 타임슬롯 예약 해제
```

---

## BFF 서비스에서 NATS 사용

### NatsClientService 설정

```typescript
// common/nats/nats-client.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { connect, NatsConnection, JSONCodec, RequestOptions } from 'nats';
import { NatsConfigService } from './nats-config.service';

@Injectable()
export class NatsClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsClientService.name);
  private connection: NatsConnection | null = null;
  private readonly codec = JSONCodec();

  constructor(private readonly configService: NatsConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    const config = this.configService.getConfig();
    this.connection = await connect({
      servers: config.servers,
      name: config.name,
      reconnect: true,
      maxReconnectAttempts: config.maxReconnectAttempts,
      reconnectTimeWait: config.reconnectTimeWait,
    });
    this.logger.log(`Connected to NATS: ${config.servers.join(', ')}`);
  }

  async send<T = any>(
    subject: string,
    data: any,
    timeout: number = 30000
  ): Promise<T> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    const options: RequestOptions = { timeout };
    const response = await this.connection.request(
      subject,
      this.codec.encode(data),
      options
    );

    const decoded = this.codec.decode(response.data) as any;

    if (decoded.error) {
      throw new Error(decoded.error.message || 'Unknown error');
    }

    return decoded;
  }
}
```

### 타임아웃 상수 정의

```typescript
// common/nats/nats-timeouts.ts
export const NATS_TIMEOUTS = {
  QUICK: 5000,           // 단순 조회 (5초)
  DEFAULT: 30000,        // 기본 작업 (30초)
  LIST_QUERY: 15000,     // 목록 조회 (15초)
  ANALYTICS: 60000,      // 분석/통계 (60초)
  LONG_RUNNING: 120000,  // 긴 작업 (2분)
} as const;
```

### Service에서 NATS 사용 예시

```typescript
// games/games.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // 목록 조회 - LIST_QUERY 타임아웃 사용
  async getGames(filters: any = {}, adminToken?: string): Promise<any> {
    this.logger.log('Fetching games');
    const params: any = { ...filters };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('games.list', params, NATS_TIMEOUTS.LIST_QUERY);
  }

  // 단일 조회 - QUICK 타임아웃 사용
  async getGameById(gameId: number, adminToken?: string): Promise<any> {
    this.logger.log(`Fetching game: ${gameId}`);
    const params: any = { gameId };
    if (adminToken) params.token = adminToken;
    return this.natsClient.send('games.findById', params, NATS_TIMEOUTS.QUICK);
  }

  // 생성 - DEFAULT 타임아웃 사용
  async createGame(gameData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating game');
    return this.natsClient.send('games.create', {
      data: gameData,
      token: adminToken
    });
  }

  // 자동 생성 (긴 작업) - LIST_QUERY 또는 LONG_RUNNING 타임아웃
  async generateTimeSlots(
    gameId: number,
    startDate: string,
    endDate: string,
    adminToken: string
  ): Promise<any> {
    this.logger.log(`Generating time slots for game: ${gameId}`);
    return this.natsClient.send('gameTimeSlots.generate', {
      data: { gameId, startDate, endDate },
      token: adminToken
    }, NATS_TIMEOUTS.LIST_QUERY);
  }
}
```

---

## Microservice에서 NATS 핸들러 구현

### NestJS Microservice 설정

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: [process.env.NATS_URL || 'nats://localhost:4222'],
        name: 'course-service',
        queue: 'course-service-queue',  // 로드밸런싱을 위한 큐 그룹
      },
    },
  );

  await app.listen();
}
bootstrap();
```

### Controller에서 MessagePattern 사용

```typescript
// game/controller/game.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GameService } from '../service/game.service';

@Controller()
export class GameController {
  private readonly logger = new Logger(GameController.name);

  constructor(private readonly gameService: GameService) {}

  @MessagePattern('games.list')
  async findAll(@Payload() data: any) {
    this.logger.log('Received games.list request');
    try {
      const result = await this.gameService.findAll(data);
      return result;
    } catch (error) {
      this.logger.error('Error in games.list', error);
      return { error: { message: error.message, code: error.status || 500 } };
    }
  }

  @MessagePattern('games.findById')
  async findOne(@Payload() data: { gameId: number; token?: string }) {
    this.logger.log(`Received games.findById request: ${data.gameId}`);
    try {
      const result = await this.gameService.findOne(data.gameId);
      return result;
    } catch (error) {
      this.logger.error('Error in games.findById', error);
      return { error: { message: error.message, code: error.status || 500 } };
    }
  }

  @MessagePattern('games.create')
  async create(@Payload() data: { data: any; token: string }) {
    this.logger.log('Received games.create request');
    try {
      const result = await this.gameService.create(data.data);
      return result;
    } catch (error) {
      this.logger.error('Error in games.create', error);
      return { error: { message: error.message, code: error.status || 500 } };
    }
  }

  @MessagePattern('games.update')
  async update(@Payload() data: { gameId: number; data: any; token: string }) {
    this.logger.log(`Received games.update request: ${data.gameId}`);
    try {
      const result = await this.gameService.update(data.gameId, data.data);
      return result;
    } catch (error) {
      this.logger.error('Error in games.update', error);
      return { error: { message: error.message, code: error.status || 500 } };
    }
  }

  @MessagePattern('games.delete')
  async remove(@Payload() data: { gameId: number; token: string }) {
    this.logger.log(`Received games.delete request: ${data.gameId}`);
    try {
      const result = await this.gameService.remove(data.gameId);
      return result;
    } catch (error) {
      this.logger.error('Error in games.delete', error);
      return { error: { message: error.message, code: error.status || 500 } };
    }
  }
}
```

---

## 타임아웃 설정

### 타임아웃 선택 가이드

| 작업 유형 | 타임아웃 | 사용 사례 |
|----------|---------|----------|
| QUICK (5초) | 단순 조회 | findById, 단일 레코드 조회 |
| LIST_QUERY (15초) | 목록 조회 | list, 페이지네이션 쿼리 |
| DEFAULT (30초) | 일반 작업 | create, update, delete |
| ANALYTICS (60초) | 분석/통계 | stats, 집계 쿼리 |
| LONG_RUNNING (120초) | 배치 작업 | generate, bulk 작업 |

### 타임아웃 적용 예시

```typescript
// 단순 조회
await this.natsClient.send('games.findById', params, NATS_TIMEOUTS.QUICK);

// 목록 조회
await this.natsClient.send('games.list', params, NATS_TIMEOUTS.LIST_QUERY);

// CRUD 작업 (타임아웃 생략 시 DEFAULT 사용)
await this.natsClient.send('games.create', params);

// 통계 조회
await this.natsClient.send('gameTimeSlots.stats', params, NATS_TIMEOUTS.ANALYTICS);

// 타임슬롯 자동 생성
await this.natsClient.send('gameTimeSlots.generate', params, NATS_TIMEOUTS.LONG_RUNNING);
```

---

## 에러 처리

### BFF 서비스에서 에러 처리

```typescript
// Controller에서 NATS 에러 처리
@Get(':id')
async findOne(@Param('id') id: string, @Req() req: any) {
  try {
    return await this.gamesService.getGameById(+id, req.adminToken);
  } catch (error) {
    if (error.message?.includes('timeout')) {
      throw new HttpException(
        'Service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    if (error.message?.includes('not found')) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
    throw new HttpException(
      error.message || 'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
```

### Microservice에서 에러 응답 형식

```typescript
// 성공 응답
return result;

// 에러 응답 (표준 형식)
return {
  error: {
    message: 'Game with ID 123 not found',
    code: 404,
    details: { gameId: 123 }  // 선택적
  }
};
```

---

## 인증 토큰 전달

### BFF에서 토큰 추출 및 전달

```typescript
// Middleware에서 토큰 추출
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      req.adminToken = authHeader.substring(7);
    }
    next();
  }
}

// Service에서 토큰 전달
async createGame(gameData: any, adminToken: string): Promise<any> {
  return this.natsClient.send('games.create', {
    data: gameData,
    token: adminToken  // 토큰 포함
  });
}
```

### Microservice에서 토큰 검증

```typescript
// Guard에서 토큰 검증 (선택적)
@Injectable()
export class NatsAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const data = context.switchToRpc().getData();

    if (!data.token) {
      return false;
    }

    try {
      const verified = await this.authService.verifyToken(data.token);
      return !!verified;
    } catch {
      return false;
    }
  }
}
```

---

## 패턴 추가 시 체크리스트

새로운 NATS 메시지 패턴을 추가할 때:

1. **명명 규칙 준수**: `{domain}.{action}` 형식
2. **타임아웃 설정**: 작업 유형에 맞는 타임아웃 선택
3. **에러 처리**: 표준 에러 응답 형식 사용
4. **로깅**: 요청/응답 로깅 추가
5. **토큰 전달**: 인증이 필요한 경우 토큰 포함
6. **문서화**: 이 파일에 새 패턴 추가

---

## 디버깅 팁

### NATS 연결 확인
```bash
# NATS 서버 상태 확인
nats-server --ping

# 구독 목록 확인
nats sub ">"
```

### 로컬 개발 시 NATS 실행
```bash
# Docker로 NATS 실행
docker run -d --name nats -p 4222:4222 nats:latest

# Docker Compose (권장)
docker-compose up -d nats
```
