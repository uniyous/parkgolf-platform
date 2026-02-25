# AI 예약 에이전트 워크플로우

## 1. 개요

사용자가 자연어로 골프장 검색 → 슬롯 선택 → 예약 → 결제까지 진행할 수 있는 AI 어시스턴트.

**핵심 설계**: Direct Handling + LLM 하이브리드

| 경로 | 설명 | 지연시간 |
|------|------|---------|
| **Direct** | UI 카드 클릭 → LLM 없이 즉시 처리 | ~100ms |
| **LLM** | 자연어 입력 → DeepSeek Function Calling | 2~5s |

```
사용자 입력
  ├─ UI 카드 클릭? → Direct Handler (5종) → 즉시 응답
  └─ 자연어 텍스트? → DeepSeek → Tool 실행 → 응답
```

---

## 2. 아키텍처

```mermaid
graph TB
    subgraph Client["클라이언트"]
        App["Web / iOS / Android"]
    end

    subgraph BFF
        API["user-api<br/>POST /chat/rooms/:id/agent"]
    end

    subgraph Agent["agent-service"]
        BA["BookingAgentService<br/>(오케스트레이션)"]
        DS["DeepSeekService<br/>(Function Calling)"]
        TE["ToolExecutorService<br/>(NATS → 서비스)"]
        Conv["ConversationService<br/>(node-cache, TTL 30분)"]
    end

    subgraph Services["마이크로서비스"]
        CS["course-service"]
        BS["booking-service"]
        WS["weather-service"]
        LS["location-service"]
        PS["payment-service"]
    end

    App -->|REST| API
    API -->|"NATS agent.chat"| BA
    BA <--> DS
    BA <--> TE
    BA <--> Conv
    TE -->|NATS| CS
    TE -->|NATS| BS
    TE -->|NATS| WS
    TE -->|NATS| LS
    TE -->|NATS| PS

    classDef client fill:#4fc3f7,stroke:#01579b,color:#000
    classDef bff fill:#ffb74d,stroke:#e65100,color:#000
    classDef agent fill:#4db6ac,stroke:#00695c,color:#000
    classDef svc fill:#ba68c8,stroke:#4a148c,color:#fff
    class App client
    class API bff
    class BA,DS,TE,Conv agent
    class CS,BS,WS,LS,PS svc
```

---

## 3. 대화 상태 머신

```
IDLE → COLLECTING → CONFIRMING → BOOKING → COMPLETED
                        ↓                      ↑
                    CANCELLED ─────────→ COLLECTING
```

| 상태 | 의미 | 전이 조건 |
|------|------|----------|
| IDLE | 초기 상태 | 첫 메시지 수신 → COLLECTING |
| COLLECTING | 정보 수집 중 (골프장 검색, 카드 표시) | 슬롯 표시 → CONFIRMING |
| CONFIRMING | 예약 확인 대기 (슬롯 선택, 확인 카드) | 확인 클릭 → BOOKING |
| BOOKING | 예약 처리 중 (Saga 진행) | 성공 → COMPLETED |
| COMPLETED | 예약 완료 | 종료 |
| CANCELLED | 사용자 취소 | 자동 → COLLECTING |

---

## 4. Direct Handlers (LLM 우회)

UI 카드 클릭 시 LLM을 거치지 않고 즉시 처리. `BookingAgentService.chat()` 진입 시 최우선 검사.

```typescript
if (request.paymentComplete) → handlePaymentComplete()
if (request.confirmBooking)  → handleDirectBooking()
if (request.cancelBooking)   → handleCancelBooking()
if (request.selectedSlotId)  → handleDirectSlotSelect()
if (request.selectedClubId)  → handleDirectClubSelect()
// 위 모두 해당 없으면 → processWithLLM()
```

### 4.1 handleDirectClubSelect

```
골프장 카드 클릭 → slots에 clubId 저장
  → get_available_slots (NATS: games.search)
  → 슬롯 있으면: SHOW_SLOTS 카드 + state=CONFIRMING
  → 슬롯 없으면: 안내 메시지 + state=COLLECTING
```

### 4.2 handleDirectSlotSelect

```
슬롯 카드 클릭 → slots에 slotId/time 저장
  → 가격 계산 (slotPrice × playerCount)
  → CONFIRM_BOOKING 카드 + state=CONFIRMING
  (NATS 호출 없음, 동기 처리)
```

### 4.3 handleDirectBooking

```
확인 버튼 클릭 → state=BOOKING
  → create_booking (NATS: booking.create)
  → Saga 폴링 (300ms × 20회, 최대 6초)
  ┌─ CONFIRMED (현장결제): BOOKING_COMPLETE 카드 + state=COMPLETED
  ├─ SLOT_RESERVED (카드결제): payment.prepare → SHOW_PAYMENT 카드 (orderId 포함)
  └─ PENDING (타임아웃): BOOKING_COMPLETE 카드 + "처리 중" 메시지
```

### 4.4 handlePaymentComplete

```
결제 완료 콜백 (paymentSuccess: true/false)
  → 성공: BOOKING_COMPLETE 카드 + state=COMPLETED
  → 실패: 재시도 안내 + state=CONFIRMING
  (NATS 호출 없음, 동기 처리)
```

### 4.5 handleCancelBooking

```
취소 버튼 클릭 → slots 초기화
  → state=COLLECTING, 안내 메시지
  (NATS 호출 없음, 동기 처리)
```

---

## 5. LLM 처리 (processWithLLM)

자연어 메시지가 Direct Handler에 해당하지 않을 때 실행.

```mermaid
sequenceDiagram
    participant U as 사용자
    participant BA as BookingAgentService
    participant DS as DeepSeek API
    participant TE as ToolExecutor
    participant MS as 마이크로서비스

    U->>BA: "내일 강남에서 골프 치고 싶어"
    BA->>DS: messages + tools
    DS-->>BA: tool_calls: [search_clubs_with_slots]

    loop 도구 호출 루프 (최대 5회)
        BA->>TE: executeAll(toolCalls)
        TE->>MS: NATS (games.search 등)
        MS-->>TE: 결과
        TE-->>BA: toolResults[]
        BA->>DS: tool_results + 이전 컨텍스트
        DS-->>BA: text 또는 추가 tool_calls
    end

    BA-->>U: { message, actions[SHOW_CLUBS] }
```

### 도구 호출 루프

1. DeepSeek에 메시지 + 대화 히스토리 전송
2. `tool_calls` 반환 시 → `ToolExecutorService.executeAll()` (병렬 실행)
3. 도구 결과로 UI 카드(actions) 생성 + slots 업데이트
4. 도구 결과를 DeepSeek에 전달하여 다음 응답 요청
5. 텍스트 응답이 나올 때까지 반복 (최대 5회)

---

## 6. Function Calling Tools

| 도구 | 매개변수 | NATS 패턴 | 대상 서비스 |
|------|---------|-----------|-----------|
| `search_clubs` | location, name? | `club.search` | course |
| `search_clubs_with_slots` | location, date, name?, timePreference?, playerCount? | `games.search` | course |
| `get_club_info` | clubId | `clubs.get` | course |
| `get_weather` | clubId, date | `weather.forecast` | weather |
| `get_available_slots` | clubId, date, timePreference? | `games.search` | course |
| `create_booking` | clubId, slotId, playerCount | `booking.create` | booking |
| `get_booking_policy` | clubId, policyType? | `policy.*.resolve` | booking |
| `search_address` | address | `location.search.address` | location |
| `get_nearby_clubs` | latitude, longitude, radius? | `club.findNearby` | course |

---

## 7. UI 카드 시스템

### 응답 형식

```typescript
{
  conversationId: string
  message: string                // AI 텍스트 메시지
  state: ConversationState       // 현재 상태
  actions?: ChatAction[]         // UI 카드 배열 (없으면 텍스트만)
}

interface ChatAction {
  type: ActionType
  data: unknown                  // 카드 타입별 페이로드
}
```

### 카드 타입

| ActionType | 용도 | 트리거 |
|------------|------|--------|
| `SHOW_CLUBS` | 골프장 목록 카드 | search_clubs, search_clubs_with_slots |
| `SHOW_SLOTS` | 타임슬롯 목록 카드 | get_available_slots, handleDirectClubSelect |
| `SHOW_WEATHER` | 날씨 정보 카드 | get_weather |
| `CONFIRM_BOOKING` | 예약 확인 카드 (확인/취소 버튼) | handleDirectSlotSelect |
| `SHOW_PAYMENT` | 결제 모달 트리거 (orderId 포함) | handleDirectBooking (카드결제) |
| `BOOKING_COMPLETE` | 예약 완료 카드 | handleDirectBooking, handlePaymentComplete |

### 카드 데이터 예시

**SHOW_CLUBS**:
```json
{ "found": 3, "clubs": [{ "id": 1, "name": "한밭파크골프장", "address": "대전시...", "region": "대전" }] }
```

**SHOW_SLOTS** (라운드 그룹핑 + 골프장 정보):
```json
{
  "clubName": "한밭파크골프장",
  "clubAddress": "대전광역시 유성구...",
  "date": "2026-02-26",
  "availableCount": 8,
  "rounds": [
    {
      "gameId": 1,
      "name": "A코스 오전",
      "price": 15000,
      "slots": [
        { "id": 1, "time": "09:00", "endTime": "10:30", "availableSpots": 4, "price": 15000 },
        { "id": 2, "time": "09:30", "endTime": "11:00", "availableSpots": 3, "price": 15000 }
      ]
    },
    {
      "gameId": 2,
      "name": "B코스 오후",
      "price": 20000,
      "slots": [
        { "id": 5, "time": "14:00", "endTime": "15:30", "availableSpots": 4, "price": 20000 }
      ]
    }
  ],
  "slots": [...]
}
```
> `rounds`: 게임 라운드별 그룹핑 (프론트엔드 카드 렌더링용)
> `slots`: 하위 호환용 flat 목록 (LLM 컨텍스트 / 레거시 클라이언트)

**CONFIRM_BOOKING**: `{ clubName, date, time, playerCount, price }`

**SHOW_PAYMENT**: `{ bookingId, orderId, amount, orderName, clubName, date, time, playerCount }`

**BOOKING_COMPLETE**: `{ success, bookingId, bookingNumber, status, message, details: { date, time, playerCount, totalPrice } }`

---

## 8. 프론트엔드 UI 카드 렌더링

agent-service가 반환한 `actions[]`를 프론트엔드가 채팅 버블 안에 카드로 렌더링.

### 8.1 렌더링 흐름

```
agent-service 응답
  → { message, actions: [{ type, data }] }
  → 채팅 메시지 목록에 AI 메시지 추가
  → actions[]을 messageId에 매핑하여 저장
  → AiMessageBubble 렌더링 시 action.type별 카드 컴포넌트 분기
```

```
AiMessageBubble
  ├─ 텍스트 메시지 (message)
  └─ actions.forEach { action →
       when (action.type)
         SHOW_CLUBS      → ClubCard
         SHOW_SLOTS      → SlotCard
         SHOW_WEATHER    → WeatherCard
         CONFIRM_BOOKING → ConfirmBookingCard
         SHOW_PAYMENT    → PaymentCard
         BOOKING_COMPLETE → BookingCompleteCard
     }
```

### 8.2 카드별 UI 구조

#### ClubCard (SHOW_CLUBS)

골프장 목록을 수직 스택으로 표시. 각 카드에 "선택" 버튼.

```
┌──────────────────────────────────────┐
│ 한밭파크골프장                [선택] │
│ 📍 대전광역시 유성구 한밭로 123      │
├──────────────────────────────────────┤
│ 강남파크골프                 [선택] │
│ 📍 서울특별시 강남구 ...            │
└──────────────────────────────────────┘
```

- 선택 시: 선택된 카드에 체크 아이콘, 나머지 비활성화 (alpha=0.5)
- 클릭 → 구조화 요청: `{ selectedClubId, selectedClubName }` (Direct Handler)

#### SlotCard (SHOW_SLOTS)

골프장 정보 헤더 + 게임 라운드별 그룹 + 타임슬롯 칩.

```
┌──────────────────────────────────────┐
│ ⛳ 한밭파크골프장                     │
│ 📍 대전광역시 유성구 한밭로 123       │
│ 📅 2026년 2월 26일 (목)              │
├──────────────────────────────────────┤
│ A코스 오전                  ₩15,000 │
│ ┌──────────┐ ┌──────────┐           │
│ │ 09:00 4명│ │ 09:30 3명│           │
│ └──────────┘ └──────────┘           │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│ B코스 오후                  ₩20,000 │
│ ┌──────────┐ ┌──────────┐           │
│ │ 14:00 4명│ │ 14:30 4명│           │
│ └──────────┘ └──────────┘           │
└──────────────────────────────────────┘
```

- 라운드 헤더: 라운드명 (좌) + 이용금액 (우)
- 타임슬롯 칩: 시간 + 예약가능 인원 (FlowRow 배치)
- 선택 시: 체크 아이콘 + 하이라이트, 나머지 비활성화
- 클릭 → 구조화 요청: `{ selectedSlotId, selectedSlotTime, selectedSlotPrice }` (Direct Handler)
- `rounds` 없으면 하위 호환 flat `slots` 2열 그리드로 폴백

#### WeatherCard (SHOW_WEATHER)

```
┌──────────────────────────────────────┐
│ ☀️ 18°C 맑음                         │
│ 골프 치기 좋은 날씨예요!              │
└──────────────────────────────────────┘
```

- 날씨 아이콘 (비/맑음/흐림) + 기온 + 추천 메시지

#### ConfirmBookingCard (CONFIRM_BOOKING)

예약 정보 확인 + 결제방법 선택 + 확인/취소 버튼.

```
┌──────────────────────────────────────┐
│ 예약 정보 확인                        │
│ 📍 한밭파크골프장                     │
│ 📅 2026-02-26 (목)                   │
│ 🕐 09:00                             │
│ 👥 2명                               │
│ 💳 ₩30,000                           │
│                                      │
│ 결제방법                              │
│ ┌──────────┐ ┌──────────┐           │
│ │ 🏪 현장결제│ │ 💳 카드결제│           │
│ └──────────┘ └──────────┘           │
│                                      │
│ ┌──────┐ ┌──────────┐               │
│ │ 취소  │ │ 예약 확인  │               │
│ └──────┘ └──────────┘               │
└──────────────────────────────────────┘
```

- 무료(price=0)일 때 결제방법 UI 숨김, 자동으로 `onsite` 전달
- 확인 클릭 → `onConfirm(paymentMethod)` → 구조화 요청: `{ confirmBooking: true, paymentMethod }`
- 취소 클릭 → `onCancel()` → 구조화 요청: `{ cancelBooking: true }`

#### PaymentCard (SHOW_PAYMENT)

카드결제 시 표시되는 결제 카드. 10분 타이머 포함.

```
┌──────────────────────────────────────┐
│ 💳 카드결제                           │
│ 📍 한밭파크골프장                     │
│ 📅 2026-02-26 (목) 09:00             │
│ 👥 2명                               │
│ 💰 ₩30,000                           │
│                                      │
│ ┌────────────────────────────┐      │
│ │ ⏱ 결제 제한시간: 09:45 남음 │      │
│ └────────────────────────────┘      │
│                                      │
│ ┌──────┐ ┌──────────┐               │
│ │예약취소│ │ 결제하기  │               │
│ └──────┘ └──────────┘               │
└──────────────────────────────────────┘
```

- 10분 카운트다운 (1분 미만 시 노란색, 만료 시 빨간색)
- 만료 시 → `onPaymentComplete(false)` 자동 호출
- 결제하기 클릭 → Toss Payments SDK 호출 → `onPaymentComplete(true/false)`
- 예약취소 클릭 → `onPaymentComplete(false)`

#### BookingCompleteCard (BOOKING_COMPLETE)

```
┌──────────────────────────────────────┐
│ ✅ 예약 완료                          │
│ 🏷️ 예약번호  PG-20260226-001         │
│ 📅 2026.02.26  09:00                 │
│ 👥 4명                               │
│ 💳 ₩60,000                           │
└──────────────────────────────────────┘
```

- 예약 확인 정보 (번호, 날짜, 시간, 인원, 금액)

### 8.3 카드 인터랙션 → 백엔드 연동

| 사용자 액션 | 구조화 요청 필드 | 백엔드 경로 |
|-------------|----------------|------------|
| ClubCard 클릭 | `selectedClubId`, `selectedClubName` | Direct: handleDirectClubSelect |
| SlotCard 칩 클릭 | `selectedSlotId`, `selectedSlotTime`, `selectedSlotPrice` | Direct: handleDirectSlotSelect |
| 예약 확인 버튼 | `confirmBooking=true`, `paymentMethod` | Direct: handleDirectBooking |
| 예약 취소 버튼 | `cancelBooking=true` | Direct: handleCancelBooking |
| 결제 완료 콜백 | `paymentComplete=true`, `paymentSuccess` | Direct: handlePaymentComplete |

> 모든 카드 인터랙션은 구조화 필드를 포함하여 **Direct Handler**로 즉시 처리 (~100ms).
> LLM 경로는 자연어 텍스트 입력에만 사용.

### 8.4 컴포넌트 파일 위치

| 플랫폼 | 경로 |
|--------|------|
| Web | `apps/user-app-web/src/components/features/chat/cards/{ClubCard,SlotCard,WeatherCard,ConfirmBookingCard,PaymentCard,BookingCompleteCard}.tsx` |
| Web | `apps/user-app-web/src/components/features/chat/AiMessageBubble.tsx` (카드 분기) |
| Web | `apps/user-app-web/src/pages/ChatRoomPage.tsx` (콜백 연결) |
| Web | `apps/user-app-web/src/hooks/useAiChat.ts` (구조화 요청 전송) |
| Android | `apps/user-app-android/.../chat/components/cards/{ClubCard,SlotCard,WeatherCard,ConfirmBookingCard,PaymentCard,BookingCompleteCard}.kt` |
| Android | `apps/user-app-android/.../chat/components/AiMessageBubble.kt` (카드 분기) |
| Android | `apps/user-app-android/.../chat/ChatViewModel.kt` (상태 관리 + sendAiFollowUp) |
| Android | `apps/user-app-android/.../chat/ChatRoomScreen.kt` (콜백 연결) |

---

## 9. 결제 원샷 플로우

카드결제 시 Agent가 `booking.create` → Saga 폴링 → `payment.prepare`를 한 번에 처리하여, 프론트엔드는 orderId가 포함된 SHOW_PAYMENT 카드만 받으면 바로 Toss 결제위젯을 띄울 수 있음.

```mermaid
sequenceDiagram
    participant App as 클라이언트
    participant Agent as agent-service
    participant Book as booking-service
    participant Course as course-service
    participant Pay as payment-service

    App->>Agent: confirmBooking=true, paymentMethod="card"
    Agent->>Book: booking.create (NATS)
    Book->>Course: slot.reserve (Saga)
    Course-->>Book: slot.reserved
    Note over Book: status: SLOT_RESERVED

    loop Saga 폴링 (300ms × 20회)
        Agent->>Book: booking.findById
        Book-->>Agent: status: SLOT_RESERVED ✓
    end

    Agent->>Pay: payment.prepare (NATS)
    Pay-->>Agent: { orderId, paymentId }

    Agent-->>App: SHOW_PAYMENT { orderId, amount, ... }
    Note over App: Toss 결제위젯 표시

    App->>Agent: paymentComplete=true, paymentSuccess=true
    Agent-->>App: BOOKING_COMPLETE
```

`payment.prepare` 실패 시 `orderId: null`로 graceful degradation (프론트엔드 fallback).

---

## 10. NATS 메시지 패턴

### Inbound (agent-service가 수신)

| 패턴 | 설명 |
|------|------|
| `agent.chat` | 메인 대화 처리 (Direct + LLM) |
| `agent.reset` | 대화 초기화, 환영 메시지 반환 |
| `agent.status` | 대화 상태 조회 (state, slots, messageCount) |
| `agent.stats` | 캐시 통계 (keys, hits, misses) |

### Outbound (agent-service가 발신)

| 패턴 | 대상 서비스 | 도구 |
|------|-----------|------|
| `club.search` | course-service | search_clubs |
| `games.search` | course-service | search_clubs_with_slots, get_available_slots |
| `clubs.get` | course-service | get_club_info |
| `club.findNearby` | course-service | get_nearby_clubs |
| `booking.create` | booking-service | create_booking |
| `booking.findById` | booking-service | Saga 폴링 |
| `policy.*.resolve` | booking-service | get_booking_policy |
| `payment.prepare` | payment-service | 원샷 결제 준비 |
| `weather.forecast` | weather-service | get_weather |
| `location.search.address` | location-service | search_address |

---

## 11. 세션 관리

| 항목 | 값 |
|------|-----|
| 저장소 | node-cache (인메모리) |
| TTL | 30분 (CONVERSATION_TTL 환경변수) |
| 히스토리 | 최근 10턴 (MAX_HISTORY_TURNS 환경변수) |
| 캐시 키 | `conv:{userId}:{conversationId}` |

### ConversationContext

```typescript
{
  conversationId: string       // UUID v4
  userId: number
  state: ConversationState
  messages: { role, content, timestamp }[]
  slots: {
    location?, clubName?, clubId?, date?, time?,
    slotId?, playerCount?, confirmed?,
    latitude?, longitude?, bookingId?
  }
  createdAt: Date
  updatedAt: Date
}
```

---

## 12. 전체 예약 플로우 (요약)

```
① 사용자: "내일 강남 근처 골프장 알려줘"
   → LLM: search_clubs_with_slots → SHOW_CLUBS 카드

② 사용자: [골프장 카드 클릭]
   → Direct: handleDirectClubSelect → SHOW_SLOTS 카드

③ 사용자: [슬롯 카드 클릭]
   → Direct: handleDirectSlotSelect → CONFIRM_BOOKING 카드

④ 사용자: [확인 버튼 클릭 + paymentMethod=card]
   → Direct: handleDirectBooking → Saga → payment.prepare → SHOW_PAYMENT 카드

⑤ 사용자: [Toss 결제 완료]
   → Direct: handlePaymentComplete → BOOKING_COMPLETE 카드
```

> 대부분의 인터랙션은 **Direct Handler**(②~⑤)로 처리되어 LLM 지연 없이 즉시 응답.
> LLM은 자연어 해석이 필요한 **최초 검색**(①)과 **추가 질문**에만 사용.

---

**Last Updated**: 2026-02-25
