# Park Golf Platform - Development Roadmap

**Overall Progress**: `██████████` 97%
**Last Updated**: 2026-02-24
**Target Release**: 2026-Q1

---

## Milestone 1: Core Infrastructure ✅
- Microservices architecture (NestJS + NATS + Prisma + PostgreSQL)
- GKE Autopilot 배포 (asia-northeast3)
- CI/CD pipeline (GitHub Actions, 수동 workflow_dispatch)
- Firebase Hosting (Admin/Platform/User 3개 앱)

## Milestone 2: Authentication & IAM ✅
- JWT (Access 15min + Refresh 7days), RBAC (40+ permissions)
- 사용자/관리자 인증 분리, 계층적 역할 관리 (RoleMaster)
- 가맹점별 회원 관리 (CompanyMember: BOOKING/MANUAL/WALK_IN)
- DB 기반 동적 메뉴 시스템 (MenuMaster, 가맹점 유형별 필터링)
- 친구 관리 (요청/수락/거절, 연락처 기반 검색)

## Milestone 3: Course Management ✅
- Company → Club → Course → Hole → TeeBox 도메인
- Game (18홀, SlotMode: TEE_TIME/SESSION), GameTimeSlot (Optimistic Lock)
- GameWeeklySchedule (같은 요일 복수 세션), 타임슬롯 자동 생성
- 근처 골프장 검색 (Haversine, DB Haversine raw SQL)

## Milestone 4: Booking Engine ✅
- Saga 패턴 (Choreography): PENDING → SLOT_RESERVED → CONFIRMED / FAILED
- Transactional Outbox, Idempotency Key, Optimistic Locking
- 계층형 정책 시스템 (PLATFORM > COMPANY > CLUB, 3단계 상속 resolve)
  - CancellationPolicy, RefundPolicy (시간대별 환불률)
  - NoShowPolicy (단계별 패널티), OperatingPolicy
- 환불 처리, 노쇼 추적

## Milestone 5: Payment ✅
- Toss Payments 연동 (결제위젯, 빌링키, 자동결제)
- 결제 상태 (PENDING → COMPLETED → REFUNDED)
- payment.prepare (orderId 발급), payment.confirm, 환불
- Webhook 수신/검증, Transactional Outbox

## Milestone 6: AI Agent ✅
- Gemini 1.5 Flash + Function Calling (9개 도구)
- 5개 서비스 NATS 연동 (Course, Booking, Payment, Weather, Location)
- 원샷 처리: booking.create → Saga 폴링 → payment.prepare
- Direct Handlers (LLM 없이 UI 카드 이벤트 직접 처리)
- 대화 상태 관리 (IDLE → COLLECTING → CONFIRMING → BOOKING → COMPLETED)

## Milestone 7: Social (Chat + Notification) ✅
- 실시간 채팅 (Socket.IO + NATS, DIRECT/GROUP/BOOKING)
- Chat Gateway (WebSocket → NATS bridge)
- Multi-channel 알림 (Email/SMS/Push), 템플릿 관리, 재시도

## Milestone 8: Frontend Apps ✅
- Admin Dashboard: React 19 + React Query, 정책 관리 (상속 UI), 게임/예약/회원 관리
- Platform Dashboard: 플랫폼 스코프 전용, 가맹점/관리자/정책 관리
- User WebApp: 예약 플로우, 채팅, AI 어시스턴트, 친구 관리
- iOS App: SwiftUI + MVVM, Socket.IO 채팅, 예약/친구/프로필
- Android App: Kotlin + Compose + Hilt, 동일 기능 세트

## Milestone 9: External API Integration ✅
- Weather Service: 기상청 API (초단기실황/예보, 단기예보, LCC 좌표 변환)
- Location Service: 카카오 로컬 API (주소/키워드/카테고리 검색, 좌표 변환)

---

## Remaining (3%)

### Toss 결제위젯 실제 연동
- [ ] PaymentCard에서 Toss 위젯 requestPayment() 호출
- [ ] 결제 승인 콜백 → paymentApi.confirmPayment()
- [ ] 결제 실패/취소 UX 완성

### Production 준비
- [ ] 프로덕션 환경 GKE 클러스터 구성 (prod)
- [ ] 도메인 + SSL 인증서 연결
- [ ] 모니터링 (Cloud Logging, 알림 설정)

### 품질 보증
- [ ] 주요 서비스 테스트 커버리지 확보
- [ ] E2E 예약→결제 플로우 테스트
- [ ] 부하 테스트 (동시 예약 시나리오)

---

**Last Updated**: 2026-02-24
