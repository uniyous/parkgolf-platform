# 파트너(가맹점) 데이터 연동 자동화 워크플로우

> 버전: 0.1 (제안)
> 최종 수정: 2026-05-14
> 상태: design — 합의 후 단계별 구현

## 1. 목적

가맹점 골프장 예약 시스템(외부 ERP)을 우리 플랫폼에 연동할 때,
**개발자 작업 2~3일 → 운영자/개발자 검토 2시간 + 자동 검증 24h**로 단축한다.

핵심 원칙
- 100% 자동화 ✗ — 잘못된 매핑은 데이터 손상
- 80% 자동 + **3-stage 검토 + 실데이터 검증** ○ — 안전성과 효율 동시 확보
- 모든 결정은 감사 추적 (PartnerSpecApproval)

---

## 2. 상태 머신

```mermaid
stateDiagram-v2
    [*] --> DRAFT: 마법사 시작 (운영자)

    DRAFT --> REVIEW_BY_PLATFORM: 등록 완료
    REVIEW_BY_PLATFORM --> DRAFT: 반려 (사유)

    REVIEW_BY_PLATFORM --> REVIEW_BY_DEVELOPER: 운영자 승인
    REVIEW_BY_DEVELOPER --> REVIEW_BY_PLATFORM: 반려

    REVIEW_BY_DEVELOPER --> TEST_RUN: 개발자 승인 + TestRun 시작
    TEST_RUN --> REVIEW_BY_DEVELOPER: FAIL (재매핑 필요)
    TEST_RUN --> REVIEW_BY_FRANCHISE: PASS (비교 리포트 생성)

    REVIEW_BY_FRANCHISE --> REVIEW_BY_DEVELOPER: 가맹점 반려
    REVIEW_BY_FRANCHISE --> ACTIVE: 가맹점 동의

    ACTIVE --> SUSPENDED: 운영 중단 (수동)
    ACTIVE --> REVIEW_BY_DEVELOPER: 스펙 변경 (재승인)
    SUSPENDED --> ACTIVE: 재개
    SUSPENDED --> [*]: 계약 종료
```

| 상태 | 의미 | 다음 액션 |
|---|---|---|
| DRAFT | 운영자가 마법사로 작성 중 | 도메인/auth/discovery/mapping 입력 |
| REVIEW_BY_PLATFORM | 플랫폼 운영자 검토 | 매핑/계약 정합성 승인 |
| REVIEW_BY_DEVELOPER | 데이터 연동 개발자 검토 | 기술 안전성 + 매핑 정확도 + TestRun |
| TEST_RUN | sandbox 자동 검증 (24h 또는 N건) | 비교 리포트 자동 생성 |
| REVIEW_BY_FRANCHISE | 가맹점 운영자 최종 동의 | 리포트 확인 + 활성화 동의 |
| ACTIVE | 실 데이터 연동 운영 | cron sync + webhook 활성 |
| SUSPENDED | 운영 중단 | 수동 재개 또는 종료 |

---

## 3. 전체 시퀀스

```mermaid
sequenceDiagram
    autonumber
    participant Op as 플랫폼 운영자
    participant Web as platform-dashboard
    participant API as admin-api
    participant PS as partner-service
    participant Ext as 파트너 API
    participant Dev as 데이터 연동 개발자
    participant FA as 가맹점 운영자
    participant Adm as admin-dashboard

    rect rgb(243, 244, 255)
    Note over Op,Ext: ── 1) DRAFT: 마법사 자동 발견 ──
    Op->>Web: 신규 파트너 마법사
    Web->>API: 도메인 + auth 입력
    API->>PS: partner.discover.run
    PS->>Ext: GET /openapi.json | probe candidates
    Ext-->>PS: spec / endpoint list
    PS->>PS: 매핑 추천 (규칙 + LLM)
    PS-->>API: discovered + suggested
    API-->>Web: 결과 표시
    Op->>Web: 매핑 검토 / 수정 → 제출
    Web->>API: spec REVIEW_BY_PLATFORM 전이
    end

    rect rgb(255, 248, 240)
    Note over Op,Dev: ── 2) REVIEW_BY_PLATFORM → DEVELOPER ──
    Op->>Web: 매핑/계약 검토 → 승인
    Web->>API: approve REVIEW_BY_DEVELOPER
    Dev->>Web: 검토 페이지 진입
    Dev->>Web: 매핑 수정 (필요 시)
    Dev->>Web: TestRun 트리거
    Web->>API: spec.testRun.start
    API->>PS: partner.spec.testRun
    end

    rect rgb(240, 255, 245)
    Note over PS,Ext: ── 3) TEST_RUN: sandbox 검증 ──
    PS->>PS: sandboxMode=true 활성
    loop 24h 또는 N건
      PS->>Ext: fetchSlots / fetchBookings (sandbox)
      Ext-->>PS: 응답
      PS->>PS: SlotMapping / BookingMapping (isSandbox=true)
    end
    PS->>PS: 비교 리포트 생성
    alt mismatch < 임계값
      PS-->>API: PASS → REVIEW_BY_FRANCHISE
    else
      PS-->>API: FAIL → REVIEW_BY_DEVELOPER
    end
    end

    rect rgb(255, 245, 245)
    Note over FA,Adm: ── 4) REVIEW_BY_FRANCHISE → ACTIVE ──
    FA->>Adm: /clubs/:id 파트너 연동 탭
    Adm->>API: spec / TestRun 리포트 조회
    FA->>Adm: 비교 리포트 검토 → 활성화 동의
    Adm->>API: approve ACTIVE
    API->>PS: sandboxMode=false, 실데이터 모드 전환
    PS->>PS: 기존 sandbox 데이터 정리
    PS->>Ext: 다음 cron 주기부터 실 동기화
    end
```

---

## 4. Role별 권한 매트릭스

```mermaid
flowchart LR
    subgraph PLATFORM[플랫폼 운영자]
        P1[마법사 시작]
        P2[REVIEW_BY_PLATFORM 승인]
        P3[ACTIVE 비활성화]
    end
    subgraph DEV[데이터 연동 개발자<br/>INTEGRATION_DEV]
        D1[매핑 수정]
        D2[TestRun 트리거]
        D3[REVIEW_BY_DEVELOPER 승인]
    end
    subgraph FRANCHISE[가맹점 운영자]
        F1[리포트 확인]
        F2[REVIEW_BY_FRANCHISE 동의]
        F3[자기 클럽 SUSPENDED]
    end

    classDef pf fill:#E3F2FD,stroke:#1565C0
    classDef dv fill:#FFF3E0,stroke:#E65100
    classDef fr fill:#F3E5F5,stroke:#6A1B9A

    class P1,P2,P3 pf
    class D1,D2,D3 dv
    class F1,F2,F3 fr
```

| 작업 | PLATFORM | DEV | FRANCHISE |
|------|:---:|:---:|:---:|
| 마법사 시작 (DRAFT 생성) | ✓ | | |
| REVIEW_BY_PLATFORM 승인/반려 | ✓ | | |
| 매핑 수정 | | ✓ | |
| TestRun 트리거 | | ✓ | |
| REVIEW_BY_DEVELOPER 승인/반려 | | ✓ | |
| REVIEW_BY_FRANCHISE 동의/반려 | | | ✓ |
| ACTIVE 비활성화 | ✓ | ✓ | ✓ (본인 클럽) |

---

## 5. UI 흐름 (라우트)

```mermaid
flowchart TD
    Start([파트너 계약 체결]) --> Wizard[platform-dashboard<br/>/partners/wizard]
    Wizard -->|Step 1| Contract[계약 정보 입력]
    Contract --> Domain[Step 2 도메인 + auth]
    Domain --> Discover[Step 3 자동 발견<br/>OpenAPI / probe]
    Discover --> Mapping[Step 4 매핑 추천<br/>운영자 검토]
    Mapping --> Submit[Step 5 제출<br/>→ REVIEW_BY_PLATFORM]

    Submit --> ReviewP[/partners/:id/review<br/>플랫폼 운영자]
    ReviewP -->|승인| ReviewD[/partners/:id/review<br/>개발자]
    ReviewP -->|반려| Wizard

    ReviewD -->|매핑 수정 가능| ReviewD
    ReviewD -->|TestRun 트리거| TestRun[/partners/:id/test-runs<br/>sandbox 24h]
    ReviewD -->|반려| ReviewP

    TestRun -->|PASS| FranchiseConf[admin-dashboard<br/>/clubs/:id 파트너 탭<br/>가맹점 동의 카드]
    TestRun -->|FAIL| ReviewD

    FranchiseConf -->|동의| Active([ACTIVE<br/>실 동기화 시작])
    FranchiseConf -->|반려| ReviewD

    Active -.->|스펙 변경| ReviewD
    Active -.->|운영 중단| Suspended([SUSPENDED])

    classDef stage fill:#E1BEE7,stroke:#6A1B9A,stroke-width:2px
    classDef terminal fill:#C8E6C9,stroke:#2E7D32,stroke-width:2px

    class ReviewP,ReviewD,TestRun,FranchiseConf stage
    class Active,Suspended terminal
```

### 5.1 platform-dashboard 신규 라우트

| 경로 | 화면 | 권한 |
|------|------|------|
| `/partners/wizard` | 등록 마법사 (DRAFT 생성) | PLATFORM |
| `/partners/:id/review` | stage별 검토 화면 | PLATFORM / DEV |
| `/partners/:id/test-runs` | TestRun 이력 + 리포트 | PLATFORM / DEV |
| `/partners/:id/audit` | 승인 이력 (PartnerSpecApproval) | PLATFORM |

### 5.2 admin-dashboard

| 경로 | 화면 | 조건 |
|------|------|------|
| `/clubs/:id` (파트너 연동 탭) | REVIEW_BY_FRANCHISE 단계: 동의 카드 + 비교 리포트 | bookingMode=PARTNER + spec.status=REVIEW_BY_FRANCHISE |
| `/clubs/:id` (파트너 연동 탭) | ACTIVE: 기존 PartnerStatusPanel | bookingMode=PARTNER + spec.status=ACTIVE |

---

## 6. 자동 발견 (PartnerDiscovery)

```mermaid
flowchart LR
    A[baseUrl + auth] --> B{OpenAPI 시도}
    B -->|/openapi.json| C[파싱]
    B -->|/swagger.json| C
    B -->|/api-docs| C
    B -->|/.well-known/openapi| C
    B -->|404| D[Probe candidates]

    D --> D1["/slots, /tee-times, /availability"]
    D --> D2["/bookings, /reservations"]
    D --> D3["/payments, /transactions"]
    D1 --> E[HEAD/OPTIONS 확인]
    D2 --> E
    D3 --> E

    C --> F[Endpoint inventory]
    E --> F
    F --> G[필드 schema 추출]
    G --> H[Mapping 추천<br/>규칙 + LLM]
```

### 6.1 매핑 추천 알고리즘

```mermaid
flowchart TD
    Schema[외부 응답 schema] --> Rules{규칙 매칭}
    Rules -->|이름 유사도| R1["levenshtein(startTime, start_time)"]
    Rules -->|casing 변환| R2[snake ↔ camel]
    Rules -->|alias 사전| R3["startTime ← teeTime / startAt"]

    R1 --> Confidence[신뢰도 점수]
    R2 --> Confidence
    R3 --> Confidence

    Confidence -->|≥ 0.8| AutoMap[자동 매핑]
    Confidence -->|0.5~0.8| LLM[LLM 검증<br/>agent-service DeepSeek]
    Confidence -->|< 0.5| Manual[운영자 수동 매핑]

    LLM --> Suggest[추천 + 사유]
    AutoMap --> UI[UI 매핑 카드 표시]
    Suggest --> UI
    Manual --> UI
```

---

## 7. 실데이터 검증 (TEST_RUN)

```mermaid
flowchart TD
    Start([TestRun 시작]) --> Sandbox[sandboxMode=true]
    Sandbox --> Sync[자동 sync loop<br/>24h 또는 N건]

    Sync --> Fetch[fetchSlots / fetchBookings]
    Fetch --> Save[SlotMapping / BookingMapping<br/>isSandbox=true 격리]
    Save -->|loop| Sync

    Sync -->|종료 조건| Report[비교 리포트 생성]
    Report --> Compare["우리 ↔ 외부 ERP<br/>matched / mismatched"]
    Compare --> Sample[필드별 mismatch sample]

    Sample --> Judge{자동 판정}
    Judge -->|mismatch < 1%<br/>인증/네트워크 오류 0| Pass([PASS])
    Judge -->|기준 미달| Fail([FAIL])

    Pass --> NextStage[→ REVIEW_BY_FRANCHISE]
    Fail --> Back[→ REVIEW_BY_DEVELOPER]

    classDef sandbox fill:#FFF9C4,stroke:#F57F17
    classDef terminal fill:#C8E6C9,stroke:#2E7D32
    class Sandbox,Save sandbox
    class Pass,Fail terminal
```

PASS 기준 (정책)
- mismatch 비율 < 1%
- 모든 필수 필드가 빈 응답 아님
- 인증/네트워크 에러 0건
- 24h 또는 N=100건 도달

---

## 8. ACTIVE 전환 + 실 데이터 연동

```mermaid
sequenceDiagram
    autonumber
    participant FA as 가맹점 운영자
    participant API as admin-api
    participant PS as partner-service
    participant Cron as job-service cron
    participant Ext as 파트너 API

    FA->>API: 활성화 동의
    API->>PS: spec.status = ACTIVE
    PS->>PS: sandboxMode = false
    PS->>PS: sandbox 격리 데이터 정리<br/>(SlotMapping/BookingMapping isSandbox=true 삭제)
    PS->>Ext: webhook 등록 (가능한 경우)
    PS-->>FA: 활성화 완료 알림

    Note over Cron,Ext: ── 운영 단계 ──
    loop 매 N분 (PartnerConfig.syncIntervalMin)
      Cron->>PS: partner.sync.execute
      PS->>Ext: fetchSlots / fetchBookings (실데이터)
      Ext-->>PS: 응답
      PS->>PS: SlotMapping / BookingMapping (isSandbox=false)
    end

    Note over Ext,PS: webhook 발생 시
    Ext->>PS: POST /webhook/:partnerId
    PS->>PS: 즉시 반영
```

---

## 9. DB 모델 (신규)

```mermaid
erDiagram
    PartnerConfig ||--o| PartnerSpec : "1:0..1"
    PartnerSpec ||--o{ PartnerSpecApproval : "audit"
    PartnerSpec ||--o{ PartnerSpecTestRun : "테스트 이력"
    PartnerSpec ||--o{ SlotMapping : "sync 결과"
    PartnerSpec ||--o{ BookingMapping : "sync 결과"

    PartnerConfig {
        int id
        int clubId
        bool isActive
        bool sandboxMode "신규 추가"
    }

    PartnerSpec {
        int id
        int partnerId FK
        PartnerSpecStatus status
        Json endpoints
        Json mappings
        Json capabilities
        Json openApiSpec
        Json contractInfo
        DateTime activatedAt
    }

    PartnerSpecApproval {
        int id
        int specId FK
        PartnerSpecStatus fromStatus
        PartnerSpecStatus toStatus
        ApprovalDecision decision
        ApprovalRole decidedByRole
        int decidedBy
        string comment
        Json diff
        DateTime decidedAt
    }

    PartnerSpecTestRun {
        int id
        int specId FK
        DateTime startedAt
        DateTime completedAt
        int totalRecords
        int matchedRecords
        int mismatchCount
        Json mismatches
        TestRunResult result
        int triggeredBy
    }
```

---

## 10. NATS 패턴 (partner-service 신규)

| 패턴 | 트리거 | 응답 |
|------|--------|------|
| `partner.discover.run` | 마법사 Step 3 | DiscoveredEndpoint[] + 신뢰도 |
| `partner.mapping.suggest` | 마법사 Step 4 | 매핑 추천 + 사유 |
| `partner.spec.transition` | 상태 전이 (모든 단계) | 변경된 spec + audit row |
| `partner.spec.testRun` | DEV가 트리거 | TestRun id (진행은 비동기) |
| `partner.spec.testRun.status` | UI 폴링 | progress + matched/mismatched |
| `partner.booking.detail` | admin 예약 상세 실시간 조회 | 외부 ERP 응답 |
| `partner.payment.detail` | admin 결제 실시간 조회 | 외부 ERP 결제 정보 |

---

## 11. 구현 Phase

```mermaid
gantt
    title Phase별 진행 계획
    dateFormat YYYY-MM-DD
    section Phase 1
    DB 모델 + migration              :p1a, 2026-05-15, 2d
    PartnerDiscoveryService          :p1b, after p1a, 3d
    마법사 UI Step 1~3               :p1c, after p1b, 3d
    section Phase 2
    PartnerMapperService (규칙+LLM)  :p2a, after p1c, 3d
    마법사 UI Step 4                 :p2b, after p2a, 2d
    section Phase 3
    Approval 모델 + role 권한        :p3a, after p2b, 2d
    review 페이지 (PLATFORM/DEV)     :p3b, after p3a, 3d
    section Phase 4
    DynamicPartnerClient + sandbox   :p4a, after p3b, 4d
    TestRun 자동 + 리포트            :p4b, after p4a, 3d
    section Phase 5
    가맹점 동의 화면 (admin)         :p5a, after p4b, 2d
    ACTIVE 전환 + cron 통합          :p5b, after p5a, 2d
    section Phase 6
    실시간 booking/payment 조회      :p6a, after p5b, 3d
```

---

## 12. 미해결 의사결정 사항

- [ ] TestRun PASS 임계값 (mismatch 비율 1% vs 5%)
- [ ] sandboxMode 동안 가맹점에게 어떻게 안내할지 (UI 메시지)
- [ ] LLM 매핑 추천 모델 (DeepSeek 외 대안)
- [ ] webhook 자동 등록 표준 (파트너마다 다를 듯)
- [ ] 스펙 변경 감지 트리거 (수동 vs 자동 schema diff)
- [ ] INTEGRATION_DEV 역할 vs 기존 PLATFORM_ADMIN 통합 여부

---

## 13. 변경 이력

| 날짜 | 버전 | 변경 |
|------|------|------|
| 2026-05-14 | 0.1 | 최초 작성 (design 단계) |
