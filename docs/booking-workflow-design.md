# 예약 워크플로우 설계 문서

> 작성일: 2026-01-12
> 버전: 1.0 (Draft)

## 목차
1. [개요](#1-개요)
2. [예약 상태 정의](#2-예약-상태-정의)
3. [비즈니스 프로세스 흐름](#3-비즈니스-프로세스-흐름)
4. [Saga Transaction 흐름](#4-saga-transaction-흐름)
5. [취소 유형 분류](#5-취소-유형-분류)
6. [환불 정책 및 프로세스](#6-환불-정책-및-프로세스)
7. [데이터 무결성 및 멱등성](#7-데이터-무결성-및-멱등성)
8. [검토 필요 사항](#8-검토-필요-사항)

---

## 1. 개요

파크골프 예약 시스템의 전체 예약 생명주기를 정의합니다.

### 1.1 주요 액터
- **고객(User)**: 예약 생성, 취소 요청
- **관리자(Admin)**: 예약 확정, 취소 처리, 환불 처리, 노쇼 처리
- **시스템(System)**: Saga 오케스트레이션, 자동 상태 전이

### 1.2 관련 서비스
- `user-api`: 고객 예약 요청 처리
- `admin-api`: 관리자 예약 관리
- `booking-service`: 예약 비즈니스 로직, Saga 오케스트레이터
- `course-service`: 타임슬롯 관리
- `notify-service`: 알림 발송

---

## 2. 예약 상태 정의

### 2.1 BookingStatus (예약 상태)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         예약 상태 (BookingStatus)                        │
├──────────────┬──────────────────────────────────────────────────────────┤
│ PENDING      │ 예약 생성됨, Saga 진행 중 (슬롯 예약 대기)                 │
│ SLOT_RESERVED│ 슬롯 예약 완료, 결제 대기                                  │
│ CONFIRMED    │ 예약 확정 (결제 완료)                                      │
│ COMPLETED    │ 이용 완료                                                  │
│ CANCELLED    │ 취소됨                                                     │
│ NO_SHOW      │ 노쇼 (미방문)                                              │
│ FAILED       │ Saga 실패 (슬롯 예약 실패 등)                              │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### 2.2 PaymentStatus (결제 상태)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         결제 상태 (PaymentStatus)                        │
├────────────────────┬────────────────────────────────────────────────────┤
│ PENDING            │ 결제 대기                                           │
│ PAID               │ 결제 완료                                           │
│ FAILED             │ 결제 실패                                           │
│ REFUNDED           │ 전액 환불 완료                                       │
│ PARTIALLY_REFUNDED │ 부분 환불 완료                                       │
└────────────────────┴────────────────────────────────────────────────────┘
```

### 2.3 RefundStatus (환불 상태) - 신규 추가 필요

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         환불 상태 (RefundStatus)                         │
├──────────────┬──────────────────────────────────────────────────────────┤
│ REQUESTED    │ 환불 요청됨                                               │
│ PENDING      │ 환불 처리 대기 (관리자 검토 중)                            │
│ APPROVED     │ 환불 승인됨                                               │
│ PROCESSING   │ 환불 처리 중 (PG사 연동 등)                                │
│ COMPLETED    │ 환불 완료                                                  │
│ REJECTED     │ 환불 거절                                                  │
└──────────────┴──────────────────────────────────────────────────────────┘
```

---

## 3. 비즈니스 프로세스 흐름

### 3.1 전체 예약 생명주기 다이어그램

```mermaid
stateDiagram-v2
    [*] --> PENDING: 예약 생성

    %% 정상 흐름
    PENDING --> SLOT_RESERVED: 슬롯 예약 성공
    SLOT_RESERVED --> CONFIRMED: 결제 완료
    CONFIRMED --> COMPLETED: 이용 완료 처리
    COMPLETED --> [*]

    %% 실패 흐름
    PENDING --> FAILED: 슬롯 예약 실패
    SLOT_RESERVED --> FAILED: 결제 실패/타임아웃
    FAILED --> [*]

    %% 취소 흐름
    PENDING --> CANCELLED: 고객/관리자 취소
    SLOT_RESERVED --> CANCELLED: 고객/관리자 취소
    CONFIRMED --> CANCELLED: 취소 (환불 필요)
    CANCELLED --> [*]

    %% 노쇼 흐름
    CONFIRMED --> NO_SHOW: 노쇼 처리
    NO_SHOW --> [*]

    note right of PENDING
        Saga 시작
        멱등성 키 생성
    end note

    note right of CONFIRMED
        결제 완료 상태
        취소 시 환불 필요
    end note

    note right of CANCELLED
        취소 사유 기록
        환불 프로세스 시작
    end note
```

### 3.2 예약 생성 → 확정 프로세스

```mermaid
sequenceDiagram
    autonumber
    actor User as 고객
    participant UA as User-API
    participant BS as Booking-Service
    participant CS as Course-Service
    participant PG as Payment Gateway
    participant NS as Notify-Service

    User->>UA: 예약 요청
    UA->>BS: createBooking(data, idempotencyKey)

    Note over BS: 멱등성 체크
    BS->>BS: 중복 요청 확인

    alt 중복 요청
        BS-->>UA: 기존 예약 반환
    else 신규 요청
        BS->>BS: Booking 생성 (PENDING)
        BS->>CS: 슬롯 예약 요청 (NATS)

        alt 슬롯 예약 성공
            CS-->>BS: 슬롯 예약 완료
            BS->>BS: 상태 변경 (SLOT_RESERVED)
            BS->>PG: 결제 요청

            alt 결제 성공
                PG-->>BS: 결제 완료
                BS->>BS: 상태 변경 (CONFIRMED)
                BS->>NS: 예약 확정 알림
                NS-->>User: SMS/Push 알림
                BS-->>UA: 예약 완료 응답
            else 결제 실패
                PG-->>BS: 결제 실패
                BS->>CS: 슬롯 해제 요청 (보상 트랜잭션)
                BS->>BS: 상태 변경 (FAILED)
                BS-->>UA: 예약 실패 응답
            end
        else 슬롯 예약 실패
            CS-->>BS: 슬롯 없음/실패
            BS->>BS: 상태 변경 (FAILED)
            BS-->>UA: 예약 실패 응답
        end
    end
```

### 3.3 취소 → 환불 프로세스

```mermaid
sequenceDiagram
    autonumber
    actor Actor as 고객/관리자
    participant API as Admin-API/User-API
    participant BS as Booking-Service
    participant CS as Course-Service
    participant PG as Payment Gateway
    participant NS as Notify-Service

    Actor->>API: 취소 요청 (bookingId, reason)
    API->>BS: cancelBooking(id, reason, cancelledBy)

    Note over BS: 취소 가능 여부 확인
    BS->>BS: 상태 검증 (PENDING/SLOT_RESERVED/CONFIRMED)
    BS->>BS: 취소 정책 검증 (3일 전 등)

    alt 취소 불가
        BS-->>API: 취소 불가 응답 (사유)
    else 취소 가능
        BS->>BS: 상태 변경 (CANCELLED)
        BS->>BS: BookingHistory 기록
        BS->>CS: 슬롯 해제 요청 (NATS)
        CS-->>BS: 슬롯 해제 완료

        alt 결제 완료 상태였음 (환불 필요)
            BS->>BS: Refund 레코드 생성 (REQUESTED)
            BS->>NS: 취소 완료 + 환불 안내 알림

            Note over BS: 환불 처리 (별도 프로세스)
            rect rgb(255, 240, 240)
                BS->>PG: 환불 요청
                PG-->>BS: 환불 완료
                BS->>BS: Payment 상태 변경 (REFUNDED)
                BS->>BS: Refund 상태 변경 (COMPLETED)
                BS->>NS: 환불 완료 알림
            end
        else 결제 전 상태
            BS->>NS: 취소 완료 알림
        end

        NS-->>Actor: 알림 발송
        BS-->>API: 취소 완료 응답
    end
```

### 3.4 노쇼 처리 프로세스

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 관리자
    participant API as Admin-API
    participant BS as Booking-Service
    participant NS as Notify-Service

    Note over Admin: 예약 시간 경과 후
    Admin->>API: 노쇼 처리 요청 (bookingId)
    API->>BS: markNoShow(id)

    BS->>BS: 상태 검증 (CONFIRMED만 가능)
    BS->>BS: 예약 시간 검증 (과거 시간)

    alt 노쇼 처리 가능
        BS->>BS: 상태 변경 (NO_SHOW)
        BS->>BS: BookingHistory 기록

        Note over BS: 노쇼 정책에 따른 처리
        alt 노쇼 패널티 적용
            BS->>BS: 고객 노쇼 카운트 증가
            BS->>NS: 노쇼 경고 알림
        end

        BS-->>API: 노쇼 처리 완료
    else 노쇼 처리 불가
        BS-->>API: 처리 불가 응답
    end
```

---

## 4. Saga Transaction 흐름

### 4.1 예약 생성 Saga 패턴

```mermaid
flowchart TB
    subgraph "Saga Orchestrator (Booking-Service)"
        START([예약 요청]) --> CHECK_IDEM{멱등성 체크}
        CHECK_IDEM -->|중복| RETURN_EXISTING[기존 예약 반환]
        CHECK_IDEM -->|신규| CREATE_BOOKING[Booking 생성<br/>status: PENDING]

        CREATE_BOOKING --> RESERVE_SLOT[슬롯 예약 요청<br/>→ Course-Service]

        RESERVE_SLOT --> SLOT_RESULT{슬롯 예약<br/>결과}
        SLOT_RESULT -->|성공| UPDATE_RESERVED[상태 변경<br/>status: SLOT_RESERVED]
        SLOT_RESULT -->|실패| SAGA_FAIL_1[상태 변경<br/>status: FAILED]

        UPDATE_RESERVED --> PROCESS_PAYMENT[결제 처리<br/>→ Payment Gateway]

        PROCESS_PAYMENT --> PAYMENT_RESULT{결제 결과}
        PAYMENT_RESULT -->|성공| UPDATE_CONFIRMED[상태 변경<br/>status: CONFIRMED]
        PAYMENT_RESULT -->|실패| COMPENSATE_SLOT[보상: 슬롯 해제<br/>→ Course-Service]

        COMPENSATE_SLOT --> SAGA_FAIL_2[상태 변경<br/>status: FAILED]

        UPDATE_CONFIRMED --> SEND_NOTIFICATION[알림 발송<br/>→ Notify-Service]
        SEND_NOTIFICATION --> SUCCESS([예약 완료])

        SAGA_FAIL_1 --> FAIL([예약 실패])
        SAGA_FAIL_2 --> FAIL
    end

    style CREATE_BOOKING fill:#e1f5fe
    style UPDATE_RESERVED fill:#e1f5fe
    style UPDATE_CONFIRMED fill:#c8e6c9
    style SAGA_FAIL_1 fill:#ffcdd2
    style SAGA_FAIL_2 fill:#ffcdd2
    style COMPENSATE_SLOT fill:#fff3e0
```

### 4.2 예약 취소 Saga 패턴

```mermaid
flowchart TB
    subgraph "Cancel Saga (Booking-Service)"
        START([취소 요청]) --> VALIDATE{검증}

        VALIDATE -->|실패| REJECT[취소 거절]
        VALIDATE -->|성공| UPDATE_CANCELLED[상태 변경<br/>status: CANCELLED]

        UPDATE_CANCELLED --> RELEASE_SLOT[슬롯 해제<br/>→ Course-Service]

        RELEASE_SLOT --> CHECK_PAYMENT{결제 상태<br/>확인}

        CHECK_PAYMENT -->|PAID| CREATE_REFUND[Refund 생성<br/>status: REQUESTED]
        CHECK_PAYMENT -->|PENDING/NONE| SKIP_REFUND[환불 불필요]

        CREATE_REFUND --> CALC_AMOUNT[환불 금액 계산<br/>정책 적용]
        CALC_AMOUNT --> PROCESS_REFUND[환불 처리<br/>→ Payment Gateway]

        PROCESS_REFUND --> REFUND_RESULT{환불 결과}
        REFUND_RESULT -->|성공| UPDATE_PAYMENT[Payment 상태 변경<br/>REFUNDED/PARTIALLY_REFUNDED]
        REFUND_RESULT -->|실패| REFUND_RETRY[환불 재시도 큐]

        UPDATE_PAYMENT --> SEND_NOTI[알림 발송]
        SKIP_REFUND --> SEND_NOTI
        REFUND_RETRY --> SEND_NOTI

        SEND_NOTI --> SUCCESS([취소 완료])
        REJECT --> FAIL([취소 실패])
    end

    style UPDATE_CANCELLED fill:#ffcdd2
    style CREATE_REFUND fill:#fff3e0
    style UPDATE_PAYMENT fill:#c8e6c9
```

### 4.3 상태 전이 규칙 (State Machine)

```mermaid
stateDiagram-v2
    direction LR

    [*] --> PENDING: createBooking()

    PENDING --> SLOT_RESERVED: onSlotReserved()
    PENDING --> FAILED: onSlotFailed()
    PENDING --> CANCELLED: cancel()

    SLOT_RESERVED --> CONFIRMED: onPaymentSuccess()
    SLOT_RESERVED --> FAILED: onPaymentFailed()
    SLOT_RESERVED --> CANCELLED: cancel()

    CONFIRMED --> COMPLETED: complete()
    CONFIRMED --> CANCELLED: cancel() [환불 필요]
    CONFIRMED --> NO_SHOW: markNoShow()

    FAILED --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]
    NO_SHOW --> [*]

    note right of PENDING: Saga Step 1
    note right of SLOT_RESERVED: Saga Step 2
    note right of CONFIRMED: Saga Complete
```

---

## 5. 취소 유형 분류

### 5.1 취소 유형 매트릭스

| 취소 유형 | 요청자 | 시점 제한 | 환불 | 사용 사례 |
|----------|--------|----------|------|----------|
| **고객 자진 취소** | 고객 | 3일 전까지 | 정책에 따름 | 일정 변경, 개인 사정 |
| **고객 당일 취소** | 고객 | 당일~3일 이내 | 부분/불가 | 급한 사정 |
| **관리자 취소** | 관리자 | 제한 없음 | 전액 | 운영상 취소 (기상악화, 시설점검) |
| **시스템 취소** | 시스템 | 자동 | 전액 | Saga 실패, 결제 타임아웃 |
| **노쇼 후 취소** | 관리자 | 이용일 경과 후 | 불가 | 환불 없이 처리 |

### 5.2 취소 유형 결정 플로우

```mermaid
flowchart TD
    START([취소 요청]) --> WHO{요청자}

    WHO -->|고객| CHECK_TIME{예약일까지<br/>남은 시간}
    WHO -->|관리자| ADMIN_CANCEL[관리자 취소<br/>type: ADMIN]
    WHO -->|시스템| SYSTEM_CANCEL[시스템 취소<br/>type: SYSTEM]

    CHECK_TIME -->|3일 초과| USER_NORMAL[고객 정상 취소<br/>type: USER_NORMAL]
    CHECK_TIME -->|1~3일| USER_LATE[고객 지연 취소<br/>type: USER_LATE]
    CHECK_TIME -->|24시간 이내| USER_LASTMIN[고객 긴급 취소<br/>type: USER_LASTMINUTE]
    CHECK_TIME -->|예약시간 경과| REJECT[취소 불가<br/>노쇼 처리만 가능]

    ADMIN_CANCEL --> CALC_REFUND[환불 금액 계산]
    SYSTEM_CANCEL --> CALC_REFUND
    USER_NORMAL --> CALC_REFUND
    USER_LATE --> CALC_REFUND
    USER_LASTMIN --> CALC_REFUND

    CALC_REFUND --> PROCESS[취소 처리]
```

### 5.3 검토 필요: 추가 취소 유형

| 취소 유형 | 필요성 | 구현 우선순위 | 비고 |
|----------|--------|-------------|------|
| **강제 취소** | ⚠️ 검토 필요 | 낮음 | 고객 블랙리스트, 중복 예약 등 |
| **부분 취소** | ⚠️ 검토 필요 | 중간 | 인원 변경 시 일부 취소 |
| **예약 변경** | ✅ 권장 | 중간 | 취소+재예약 vs 변경 트랜잭션 |
| **자동 취소** | ✅ 권장 | 높음 | 결제 미완료 타임아웃 |

---

## 6. 환불 정책 및 프로세스

### 6.1 환불 정책 (기본)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            환불 정책 (기본)                              │
├──────────────────────┬──────────────────────────────────────────────────┤
│ 예약일 7일 전 취소   │ 100% 환불                                        │
│ 예약일 3~7일 전 취소 │ 80% 환불 (20% 수수료)                            │
│ 예약일 1~3일 전 취소 │ 50% 환불 (50% 수수료)                            │
│ 예약일 24시간 이내   │ 환불 불가 (또는 30%)                             │
│ 노쇼                 │ 환불 불가                                        │
│ 관리자/시스템 취소   │ 100% 환불                                        │
└──────────────────────┴──────────────────────────────────────────────────┘
```

### 6.2 환불 금액 계산 로직

```mermaid
flowchart TD
    START([환불 계산 시작]) --> GET_POLICY[환불 정책 조회<br/>골프장별/기본]

    GET_POLICY --> CALC_DAYS[예약일까지<br/>남은 일수 계산]

    CALC_DAYS --> CHECK_TYPE{취소 유형}

    CHECK_TYPE -->|관리자/시스템| FULL_REFUND[환불율: 100%]
    CHECK_TYPE -->|고객| CHECK_DAYS{남은 일수}

    CHECK_DAYS -->|7일 초과| RATE_100[환불율: 100%]
    CHECK_DAYS -->|3~7일| RATE_80[환불율: 80%]
    CHECK_DAYS -->|1~3일| RATE_50[환불율: 50%]
    CHECK_DAYS -->|24시간 이내| RATE_0[환불율: 0~30%]

    FULL_REFUND --> CALC_AMOUNT
    RATE_100 --> CALC_AMOUNT
    RATE_80 --> CALC_AMOUNT
    RATE_50 --> CALC_AMOUNT
    RATE_0 --> CALC_AMOUNT

    CALC_AMOUNT[환불 금액 계산<br/>= 결제금액 × 환불율]

    CALC_AMOUNT --> RESULT([환불 금액 반환])
```

### 6.3 환불 프로세스 상세

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 관리자
    participant UI as Admin Dashboard
    participant API as Admin-API
    participant BS as Booking-Service
    participant PG as Payment Gateway
    participant NS as Notify-Service

    Note over Admin,NS: 환불 처리 프로세스

    Admin->>UI: 환불 처리 요청
    UI->>API: POST /bookings/payments/{id}/refund
    API->>BS: processRefund(paymentId, amount, reason)

    BS->>BS: 환불 가능 여부 검증
    BS->>BS: 환불 금액 검증 (≤ 결제금액)

    alt 전액 환불
        BS->>BS: refundType = FULL
    else 부분 환불
        BS->>BS: refundType = PARTIAL
    end

    BS->>BS: Refund 레코드 생성/갱신<br/>status: PROCESSING

    BS->>PG: 환불 요청 (transactionId, amount)

    alt PG 환불 성공
        PG-->>BS: 환불 완료 (refundTransactionId)
        BS->>BS: Refund status: COMPLETED
        BS->>BS: Payment status: REFUNDED/PARTIALLY_REFUNDED
        BS->>NS: 환불 완료 알림
        NS-->>Admin: 처리 완료 알림
        BS-->>API: 환불 완료 응답
        API-->>UI: 성공 표시
    else PG 환불 실패
        PG-->>BS: 환불 실패 (error)
        BS->>BS: Refund status: PENDING (재시도 대기)
        BS-->>API: 환불 실패 응답
        API-->>UI: 오류 표시
    end
```

---

## 7. 데이터 무결성 및 멱등성

### 7.1 멱등성 키 (Idempotency Key) 처리

```mermaid
flowchart TD
    subgraph "멱등성 처리 흐름"
        REQ([API 요청]) --> CHECK_KEY{idempotencyKey<br/>존재 여부}

        CHECK_KEY -->|없음| GEN_KEY[키 생성<br/>UUID v4]
        CHECK_KEY -->|있음| LOOKUP[DB 조회<br/>기존 요청 확인]

        GEN_KEY --> PROCESS[비즈니스 로직 실행]

        LOOKUP --> FOUND{기존 요청<br/>발견}

        FOUND -->|있음| CHECK_STATUS{처리 상태}
        FOUND -->|없음| PROCESS

        CHECK_STATUS -->|완료| RETURN_CACHED[캐시된 응답 반환]
        CHECK_STATUS -->|진행중| WAIT_OR_RETURN[대기 또는<br/>진행중 응답]
        CHECK_STATUS -->|실패| PROCESS

        PROCESS --> SAVE[결과 저장<br/>idempotencyKey 연결]
        SAVE --> RESPONSE([응답 반환])

        RETURN_CACHED --> RESPONSE
        WAIT_OR_RETURN --> RESPONSE
    end
```

### 7.2 데이터 무결성 보장

```mermaid
flowchart TB
    subgraph "트랜잭션 경계"
        subgraph "Booking-Service (Orchestrator)"
            T1[1. Booking 생성<br/>status: PENDING]
            T2[2. IdempotencyRecord 저장]
            T3[3. BookingHistory 기록]
        end

        subgraph "Course-Service"
            T4[4. TimeSlot 업데이트<br/>availablePlayers 감소]
            T5[5. SlotReservation 생성]
        end

        subgraph "Payment Processing"
            T6[6. Payment 생성<br/>status: PENDING]
            T7[7. PG 결제 요청]
            T8[8. Payment 상태 업데이트]
        end
    end

    T1 --> T2 --> T3
    T3 -.->|NATS Event| T4
    T4 --> T5
    T5 -.->|NATS Response| T6
    T6 --> T7 --> T8

    style T1 fill:#e3f2fd
    style T4 fill:#fff3e0
    style T6 fill:#e8f5e9
```

### 7.3 보상 트랜잭션 (Compensation)

```mermaid
flowchart LR
    subgraph "정상 흐름"
        direction LR
        A1[Booking 생성] --> A2[슬롯 예약] --> A3[결제] --> A4[완료]
    end

    subgraph "보상 흐름 (결제 실패 시)"
        direction RL
        B1[결제 실패] --> B2[슬롯 해제] --> B3[Booking FAILED]
    end

    A3 -.->|실패| B1

    style A1 fill:#e3f2fd
    style A2 fill:#e3f2fd
    style A3 fill:#ffcdd2
    style B1 fill:#ffcdd2
    style B2 fill:#fff3e0
    style B3 fill:#ffcdd2
```

### 7.4 동시성 제어

```typescript
// 낙관적 락 (Optimistic Locking) 예시
interface Booking {
  id: number;
  version: number;  // 버전 필드
  status: BookingStatus;
  // ...
}

// 업데이트 시 버전 체크
async updateBookingStatus(id: number, newStatus: BookingStatus, expectedVersion: number) {
  const result = await prisma.booking.updateMany({
    where: {
      id,
      version: expectedVersion  // 버전 일치 확인
    },
    data: {
      status: newStatus,
      version: { increment: 1 }  // 버전 증가
    }
  });

  if (result.count === 0) {
    throw new OptimisticLockException('Booking was modified by another transaction');
  }
}
```

---

## 8. 검토 필요 사항

### 8.1 비즈니스 결정 필요

| 항목 | 현재 상태 | 검토 필요 내용 |
|------|----------|---------------|
| **취소 기한** | 3일 전 하드코딩 | 골프장별 다른 정책 필요? |
| **환불 정책** | 미구현 | 기본 정책 확정 필요 |
| **노쇼 패널티** | 미구현 | 노쇼 횟수 제한, 블랙리스트 필요? |
| **부분 취소** | 미구현 | 인원 감소 시 부분 취소 허용? |
| **강제 취소** | 미구현 | 관리자 강제 취소 권한 범위? |
| **예약 변경** | 미구현 | 취소+재예약 vs 변경 기능? |

### 8.2 기술적 결정 필요

| 항목 | 현재 상태 | 검토 필요 내용 |
|------|----------|---------------|
| **Refund 테이블** | 없음 | Payment와 별도 관리 vs 통합? |
| **환불 자동화** | 없음 | PG사 연동 범위? 수동 처리? |
| **멱등성 키 TTL** | 미정 | 키 보관 기간? (24시간? 7일?) |
| **동시성 제어** | 미구현 | 낙관적 락 vs 비관적 락? |
| **이벤트 저장** | BookingHistory | Event Sourcing 도입 필요? |

### 8.3 다음 단계

1. **Phase 1**: 비즈니스 정책 확정
   - [ ] 환불 정책 확정
   - [ ] 취소 유형 확정
   - [ ] 노쇼 정책 확정

2. **Phase 2**: 데이터 모델 설계
   - [ ] Refund 모델 설계
   - [ ] RefundPolicy 모델 설계
   - [ ] 스키마 마이그레이션

3. **Phase 3**: API 구현
   - [ ] 환불 처리 API
   - [ ] 환불 정책 관리 API
   - [ ] 취소/환불 조회 API

4. **Phase 4**: UI 구현
   - [ ] 취소/환불 관리 페이지
   - [ ] 환불 처리 모달
   - [ ] 환불 정책 설정 페이지

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-01-12 | - | 초안 작성 |
