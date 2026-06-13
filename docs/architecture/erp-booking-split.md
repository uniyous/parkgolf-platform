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
        EB["erp-booking 〔신규〕<br/>상담/데스크 예약·현장결제"]
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

    ADM --> AAPI --> EB
    APPS --> UAPI --> BK
    PART --> BK
    AG --> UAPI
    CH --> UAPI

    EB -->|"InventoryProvider 계약<br/>availability·reserve·cancel·confirm"| CLUB
    BK -->|"동일 reserve 경로<br/>중복예약 차단"| CLUB

    EB --> SAGA
    BK --> SAGA
    SAGA --> PAY
    AAPI -.-> IAM
    UAPI -.-> IAM
    SAGA -.-> NOTI

    classDef mgr fill:#dbeafe,stroke:#2563eb,color:#1e3a5f;
    classDef mkt fill:#ffedd5,stroke:#ea580c,color:#7c2d12;
    classDef core fill:#fef9c3,stroke:#ca8a04,color:#713f12;
    classDef util fill:#f3f4f6,stroke:#9ca3af,color:#374151;
    class ADM,AAPI,EB,CLUB mgr;
    class APPS,UAPI,BK,PART,AG,CH mkt;
    class SAGA,PAY,IAM,NOTI core;
    class LOC,WEA,JOB util;
```

**범례**
- 🟦 매니저 / 🟧 마켓플레이스 = 미래 각각 독립 클라우드(VPC 격리) 후보. 🟨 공유 코어 = 양쪽 공유. ⬜ 공통 유틸 = 무상태·각 클라우드 직접 호출.
- 실선 = 동기 request/reply, 점선 = 비동기/이벤트. **모든 서비스 간 통신은 NATS** — 크로스-DB 접근 0.
- 🔑 **인벤토리 단일 권위**: 데스크(erp-booking)·마켓(booking-service) 어느 채널이든 `club-service` 동일 `reserve` 경로 → 중복예약 구조적 차단. 분리선이 생겨도 이 불변식은 `InventoryProvider` 계약으로 유지.
- DB 파티션: 매니저측 `club_db` / 마켓측 `booking_db`·`partner_db` 별도 인스턴스 가능 구조 → 분리는 `DATABASE_URL` 교체 수준.

---

> 상세 설계(계약 명세 · DB 파티션 · 정책 루트 단독/연동 · 3티어 패키징 · 미결정 항목)는 UNI-91 본문 참조. 이 문서는 구성도부터 채우며 확장한다.
