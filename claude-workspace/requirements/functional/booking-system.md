# FR-003: 예약 시스템 상세 요구사항

> 상태: 🟡 진행중 (70% 완료)
> 우선순위: P0 (MVP 필수)
> 최종 업데이트: 2025-01-23

## 📋 요구사항 개요

파크골프장 예약 시스템은 사용자가 원하는 날짜와 시간에 골프장을 예약하고 관리할 수 있는 핵심 기능입니다.

## 🎯 기능 요구사항 상세

### 1. 예약 생성

#### 1.1 타임슬롯 기반 예약
- **요구사항**: 30분 단위 타임슬롯으로 예약 가능
- **구현 상태**: ✅ 완료
- **상세**:
  - 운영시간: 06:00 ~ 22:00
  - 슬롯 단위: 30분
  - 동시 예약 방지 로직 구현

#### 1.2 실시간 가용성 확인
- **요구사항**: 예약 가능한 타임슬롯 실시간 표시
- **구현 상태**: 🔄 진행중
- **상세**:
  - WebSocket 기반 실시간 업데이트
  - 캘린더 뷰 제공
  - 가용 슬롯 색상 구분

#### 1.3 예약 정보 입력
- **요구사항**: 필수/선택 정보 수집
- **구현 상태**: ✅ 완료
- **필수 정보**:
  - 예약자 이름
  - 연락처
  - 인원수 (1-4명)
  - 예약 날짜/시간

### 2. 예약 관리

#### 2.1 예약 조회
- **요구사항**: 사용자별 예약 내역 조회
- **구현 상태**: ✅ 완료
- **기능**:
  - 예정된 예약
  - 과거 예약 이력
  - 예약 상세 정보

#### 2.2 예약 변경
- **요구사항**: 예약 날짜/시간 변경
- **구현 상태**: 🔄 진행중
- **제약사항**:
  - 예약 24시간 전까지만 변경 가능
  - 변경 시 가용성 재확인
  - 변경 이력 기록

#### 2.3 예약 취소
- **요구사항**: 예약 취소 및 환불 처리
- **구현 상태**: ✅ 완료
- **정책**:
  - 48시간 전: 100% 환불
  - 24시간 전: 50% 환불
  - 24시간 이내: 환불 불가

### 3. 알림 기능

#### 3.1 예약 확인 알림
- **요구사항**: 예약 완료 시 즉시 알림
- **구현 상태**: 🔴 미구현
- **채널**:
  - SMS
  - 이메일
  - 앱 푸시

#### 3.2 예약 리마인더
- **요구사항**: 예약 전날 리마인더 발송
- **구현 상태**: 🔴 미구현
- **내용**:
  - 예약 정보
  - 골프장 위치
  - 준비물 안내

## 🔧 기술 구현 상세

### API 엔드포인트
```
POST   /api/bookings          # 예약 생성
GET    /api/bookings          # 예약 목록 조회
GET    /api/bookings/:id      # 예약 상세 조회
PUT    /api/bookings/:id      # 예약 수정
DELETE /api/bookings/:id      # 예약 취소
GET    /api/bookings/slots    # 가용 슬롯 조회
```

### 데이터베이스 스키마
```prisma
model Booking {
  id              String   @id @default(cuid())
  userId          String
  courseId        String
  timeSlotId      String
  numberOfPlayers Int
  status          BookingStatus
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user     User     @relation(fields: [userId])
  course   Course   @relation(fields: [courseId])
  timeSlot TimeSlot @relation(fields: [timeSlotId])
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}
```

## ✅ 승인 기준

- [ ] 동시 예약 시 충돌 없음
- [ ] 예약 변경/취소 정책 정확히 적용
- [ ] 실시간 가용성 업데이트 (지연 < 1초)
- [ ] 모든 예약 알림 정상 발송
- [ ] 부하 테스트 통과 (1000 TPS)

## 🔗 관련 문서

- [마스터 요구사항](../../../.claude/REQUIREMENTS.md#fr-003)
- [현재 작업](../../../.claude/TASKS.md#task-003)
- [API 문서](../../documentation/api/booking-api.md)

## 🚧 미해결 이슈

1. **동시 예약 버그**: 같은 타임슬롯에 중복 예약 발생
   - 원인: 트랜잭션 격리 수준 문제
   - 해결방안: Pessimistic locking 적용 예정

2. **성능 이슈**: 피크 시간대 응답 지연
   - 원인: N+1 쿼리 문제
   - 해결방안: Query optimization 진행 중