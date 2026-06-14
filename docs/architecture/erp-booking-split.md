# ERP / 부킹 분리 설계

> Linear: [UNI-91](https://linear.app/uniyous/issue/UNI-91) — ERP(파크골프 매니저)/부킹(파크골프 마켓플레이스)을 **나중에 각각 독립 클라우드로 분리 배포 가능**하도록 서비스·DB 경계와 통신 계약을 확정한다. 후속 구현([UNI-92](https://linear.app/uniyous/issue/UNI-92)·[UNI-94](https://linear.app/uniyous/issue/UNI-94))의 전제.

## 구성도

```mermaid
flowchart TB
    %% ===== 파크골프 매니저 (공급 B2B) =====
    subgraph MGR["🟦 파크골프 매니저 · 공급 B2B"]
        direction TB
        ADM["admin-dashboard<br/>운영자 콘솔·데스크 예약"]
        AAPI["admin-api · BFF"]
        CBS["club-booking-service 〔신규〕<br/>상담/데스크/워크인 예약·현장결제"]
        CLUB["club-service<br/>🔑 인벤토리 단일 권위<br/>club_db"]
    end

    %% ===== 파크골프 마켓플레이스 (수요 B2C) =====
    subgraph MKT["🟧 파크골프 마켓플레이스 · 수요 B2C"]
        direction TB
        APPS["user-app-web/ios/android<br/>platform-dashboard"]
        UAPI["user-api · BFF"]
        BK["booking-service<br/>booking_db"]
        PART["partner-service<br/>partner_db"]
        AG["agent-service"]
        CH["chat-service · chat-gateway"]
    end

    %% ===== 공유 코어 (양쪽 배포·코드 공유) =====
    subgraph CORE["🟨 공유 코어 · 양쪽 공유"]
        direction LR
        SAGA["saga-service"]
        PAY["payment-service"]
        IAM["iam-service"]
        NOTI["notify-service"]
    end

    %% ===== 공통 유틸 (무상태) =====
    subgraph UTIL["⬜ 공통 유틸 · 무상태"]
        direction LR
        LOC["location-service"]
        WEA["weather-service"]
        JOB["job-service"]
    end

    ADM --> AAPI --> CBS
    APPS --> UAPI --> BK
    PART --> BK
    AG --> UAPI
    CH --> UAPI

    CBS -->|"InventoryProvider 계약<br/>availability·reserve·cancel·confirm"| CLUB
    BK -->|"동일 reserve 경로<br/>중복예약 차단"| CLUB

    CBS --> SAGA
    BK --> SAGA
    SAGA --> PAY
    AAPI -.-> IAM
    UAPI -.-> IAM
    SAGA -.-> NOTI

    classDef mgr fill:#dbeafe,stroke:#2563eb,color:#1e3a5f;
    classDef mkt fill:#ffedd5,stroke:#ea580c,color:#7c2d12;
    classDef core fill:#fef9c3,stroke:#ca8a04,color:#713f12;
    classDef util fill:#f3f4f6,stroke:#9ca3af,color:#374151;
    class ADM,AAPI,CBS,CLUB mgr;
    class APPS,UAPI,BK,PART,AG,CH mkt;
    class SAGA,PAY,IAM,NOTI core;
    class LOC,WEA,JOB util;
```

**범례**
- 🟦 매니저 / 🟧 마켓플레이스 = 미래 각각 독립 클라우드(VPC 격리) 후보. 🟨 공유 코어 = 양쪽 공유. ⬜ 공통 유틸 = 무상태·각 클라우드 직접 호출.
- 실선 = 동기 request/reply, 점선 = 비동기/이벤트. **모든 서비스 간 통신은 NATS** — 크로스-DB 접근 0.
- 🔑 **인벤토리 단일 권위**: 데스크(`club-booking-service`)·마켓(`booking-service`) 어느 채널이든 `club-service` 동일 `reserve` 경로 → 중복예약 구조적 차단. 분리선이 생겨도 이 불변식은 `InventoryProvider` 계약으로 유지.
- DB 파티션: 매니저측 `club_db` / 마켓측 `booking_db`·`partner_db` 별도 인스턴스 가능 구조 → 분리는 `DATABASE_URL` 교체 수준.

---

## 데이터 모델 (ERD)

부킹 엔진 2개는 각자 DB·테이블을 가진다(크로스-DB 0, 타 서비스 데이터는 ID 참조만). 슬롯 인벤토리의 권위는 항상 `club-service` — 양쪽 모두 `slot_id`로 참조하고 물리 FK를 걸지 않는다.

### club-booking-service (매니저 측 · club_db)

운영자 데스크/전화/워크인 예약. 직원이 행위자(대리예약·오버라이드), 비회원·워크인 고객, **현장결제**(현금·카드단말).

```mermaid
erDiagram
    DESK_RESERVATION {
        uuid id PK
        uuid club_id "ref club-service"
        uuid slot_id "ref club-service 인벤토리"
        enum channel "PHONE·DESK·WALK_IN"
        enum status "HELD·CONFIRMED·CANCELLED·NO_SHOW"
        uuid customer_id FK "워크인 고객(비회원)"
        uuid member_id "ref iam-service (회원이면)"
        uuid staff_id "ref iam-service (행위자)"
        int party_size
        text memo
        timestamptz created_at
        timestamptz updated_at
    }
    WALK_IN_CUSTOMER {
        uuid id PK
        string name
        string phone
        boolean is_member
        uuid member_id "ref iam-service (연결 시)"
        timestamptz created_at
    }
    ON_SITE_PAYMENT {
        uuid id PK
        uuid reservation_id FK
        enum method "CASH·CARD_TERMINAL"
        enum status "PAID·REFUNDED·VOID"
        int amount
        uuid staff_id "ref iam-service"
        timestamptz paid_at
    }
    STAFF_ACTION_LOG {
        uuid id PK
        uuid reservation_id FK
        uuid staff_id "ref iam-service"
        enum action "CREATE·MODIFY·OVERRIDE·CANCEL"
        text reason
        timestamptz created_at
    }

    WALK_IN_CUSTOMER ||--o{ DESK_RESERVATION : "예약 주체"
    DESK_RESERVATION ||--o| ON_SITE_PAYMENT : "현장결제"
    DESK_RESERVATION ||--o{ STAFF_ACTION_LOG : "행위 이력"
```

### booking-service (마켓플레이스 측 · booking_db)

여러 골프장에 걸친 소비자 온라인 예약 + 노출용 타임슬롯 캐시. **온라인 PG**(Toss)로만 결제.

```mermaid
erDiagram
    BOOKING {
        uuid id PK
        uuid club_id "ref club-service"
        uuid course_id "ref club-service"
        uuid slot_id "ref club-service 인벤토리"
        uuid user_id "ref iam-service (소비자)"
        enum status "PENDING·CONFIRMED·CANCELLED·COMPLETED·NO_SHOW"
        enum channel "WEB·IOS·ANDROID"
        int party_size
        int price_amount
        timestamptz created_at
        timestamptz updated_at
    }
    BOOKING_PAYMENT {
        uuid id PK
        uuid booking_id FK
        enum pg_provider "TOSS"
        string pg_tx_id
        enum status "PAID·PARTIAL_REFUND·REFUNDED·FAILED"
        int amount
        timestamptz paid_at
    }
    BOOKING_STATUS_EVENT {
        uuid id PK
        uuid booking_id FK
        enum from_status
        enum to_status
        text reason
        timestamptz created_at
    }
    SLOT_SNAPSHOT {
        uuid id PK
        uuid club_id "ref club-service"
        uuid course_id "ref club-service"
        uuid slot_id "ref club-service (권위 원본)"
        timestamptz tee_time
        int available_count "노출용 캐시·권위 아님"
        timestamptz synced_at
    }

    BOOKING ||--o{ BOOKING_PAYMENT : "온라인 결제"
    BOOKING ||--o{ BOOKING_STATUS_EVENT : "상태 이력"
    SLOT_SNAPSHOT ||--o{ BOOKING : "slot_id 참조"
```

**두 엔진의 차이 요약**

| 구분 | club-booking-service (매니저) | booking-service (마켓) |
|---|---|---|
| 채널 | 전화·데스크·워크인 | 웹·앱(온라인) |
| 행위자 | 직원(대리·오버라이드) | 소비자 본인 |
| 고객 | 회원 + 비회원/워크인 | 회원(소비자) |
| 결제 | 현장결제(현금·카드단말) | 온라인 PG(Toss) |
| 범위 | 단일 운영자 | 여러 골프장 횡단 |
| 슬롯 | club-service 직접 reserve | club-service reserve + 노출 캐시 |

---

> 상세 설계(InventoryProvider 계약 명세 · 정책 루트 단독/연동 · 3티어 패키징 · 결제/정산 미결정)는 UNI-91 본문 참조. 이 문서는 구성도·ERD부터 채우며 확장한다.
