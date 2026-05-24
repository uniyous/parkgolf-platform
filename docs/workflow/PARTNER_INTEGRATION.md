# 파트너 데이터 연동 자동화 — 단계별 추상화 + 3-stage 검토 + 실데이터 검증

가맹점 골프장 예약 시스템(외부 ERP)을 우리 플랫폼에 연결할 때, **개발자 작업 2~3일 → 운영자/개발자 검토 2시간 + 자동 검증 24h**로 단축한다. 100% 자동화는 데이터 손상 위험이 크므로 **계약 시점 RIS 표준 명세 회신 + 80% 자동(발견·매핑) + 20% 검토(3-stage approval)** 하이브리드 모델.

> **상태**: design 0.3 (제안). 합의 후 Phase 1부터 단계적 PR.
>
> **연계 문서**: 가맹점이 계약 시 제공해야 하는 표준 데이터 명세는 [`docs/policy/PARTNER_RIS.md`](../policy/PARTNER_RIS.md) 참조. 예약 연동은 [`BOOKING.md`](./BOOKING.md) · 예약 트랜잭션 [`SAGA.md`](./SAGA.md).

---

## 1. 비즈니스 가치 요약

> **파트너 어댑터 자동 생성 + Governance**
>
> - 신규 파트너 추가 비용: **개발자 2~3일 → 운영자 30분 + 자동 검증 24h** (~90% 감축)
> - **RIS 표준 명세** (PARTNER_RIS.md) 회신으로 마법사가 80% 자동 채움 — probe/LLM은 미준수 가맹점 fallback
> - **OpenAPI 자동 파싱 + endpoint probe + LLM 매핑 추천** 으로 어댑터 코드 작성 사실상 0 (RIS 미준수 시)
> - **3-stage 검토 게이트**(플랫폼 운영자 → 데이터 연동 개발자 → 가맹점 운영자) 로 잘못된 매핑 차단
> - **sandbox TestRun 24h** 로 실데이터 손상 위험 차단 — PASS 시에만 ACTIVE
> - 모든 결정 **감사 추적**(PartnerSpecApproval) — 누가 언제 무엇을 승인/반려했는지
> - **booking key 실시간 조회** — 가맹점 클럽 상세에서 외부 ERP의 결제·상태를 즉시 확인 (cache 30s + on-demand fetch + webhook)

---

## 2. 전체 그림

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#E3F2FD','primaryTextColor':'#000','primaryBorderColor':'#1565C0','lineColor':'#37474F','clusterBkg':'#ECEFF1','fontSize':'13px'}}}%%
flowchart LR
    subgraph SOURCES["🤝 파트너 계약 체결"]
        Contract["계약 체결<br/>가맹점/도메인/연락처"]
    end

    subgraph WIZARD["🪄 등록 마법사 (platform-dashboard)"]
        Discover["PartnerDiscovery<br/>OpenAPI + probe"]
        Mapper["PartnerMapper<br/>규칙 + LLM"]
    end

    subgraph REVIEW["🛡️ 3-stage 검토"]
        RP["REVIEW_BY_PLATFORM<br/>매핑/계약 검토"]
        RD["REVIEW_BY_DEVELOPER<br/>기술/안전성"]
        RF["REVIEW_BY_FRANCHISE<br/>실데이터 확인"]
    end

    subgraph SANDBOX["🧪 TestRun (sandbox)"]
        Test["24h or N건 sync<br/>비교 리포트"]
    end

    subgraph ACTIVE_RUN["⚙️ ACTIVE 운영"]
        Sync["DynamicPartnerClient<br/>매핑 기반 동기화"]
        Real["실데이터 + webhook"]
    end

    Contract --> Discover
    Discover --> Mapper
    Mapper --> RP
    RP --> RD
    RD --> Test
    Test -->|PASS| RF
    Test -->|FAIL| RD
    RF --> Sync
    Sync --> Real

    classDef src fill:#2E7D32,color:#fff,stroke:#1B5E20,stroke-width:2px
    classDef wizard fill:#795548,color:#fff,stroke:#4E342E,stroke-width:2px
    classDef review fill:#6A1B9A,color:#fff,stroke:#4A148C,stroke-width:3px
    classDef test fill:#EF6C00,color:#fff,stroke:#BF360C,stroke-width:2px
    classDef active fill:#1565C0,color:#fff,stroke:#0D47A1,stroke-width:3px

    class Contract src
    class Discover,Mapper wizard
    class RP,RD,RF review
    class Test test
    class Sync,Real active
```

---

## 3. 단계별 추상화 — 상태 머신

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontSize':'13px'}}}%%
stateDiagram-v2
    [*] --> RIS_HANDOFF: 계약 체결 (운영자)

    RIS_HANDOFF --> DRAFT: 가맹점 RIS 회신 + 자동 검증 PASS
    RIS_HANDOFF --> RIS_HANDOFF: 보강 요청 (회신 미흡)

    DRAFT --> REVIEW_BY_PLATFORM: 등록 완료
    REVIEW_BY_PLATFORM --> DRAFT: 반려

    REVIEW_BY_PLATFORM --> REVIEW_BY_DEVELOPER: 운영자 승인
    REVIEW_BY_DEVELOPER --> REVIEW_BY_PLATFORM: 반려

    REVIEW_BY_DEVELOPER --> TEST_RUN: 개발자 승인 + TestRun 시작
    TEST_RUN --> REVIEW_BY_DEVELOPER: FAIL
    TEST_RUN --> REVIEW_BY_FRANCHISE: PASS

    REVIEW_BY_FRANCHISE --> REVIEW_BY_DEVELOPER: 가맹점 반려
    REVIEW_BY_FRANCHISE --> ACTIVE: 가맹점 동의

    ACTIVE --> SUSPENDED: 운영 중단
    ACTIVE --> REVIEW_BY_DEVELOPER: 스펙 변경 (재승인)
    SUSPENDED --> ACTIVE: 재개
    SUSPENDED --> [*]: 계약 종료
```

| 상태 | 의미 | 다음 액션 | 책임 role |
|------|------|----------|----------|
| `RIS_HANDOFF` | 가맹점에 RIS 표준 명세 회신 요청 | RIS_TEMPLATE.yaml + 샘플 데이터 회신 → 자동 검증 | PLATFORM + FRANCHISE |
| `DRAFT` | 운영자가 마법사 작성 중 (RIS 회신값 80% 자동 채움) | 매핑 보강 + 제출 | PLATFORM |
| `REVIEW_BY_PLATFORM` | 운영자 1차 검토 | 매핑/계약 정합성 승인 또는 반려 | PLATFORM |
| `REVIEW_BY_DEVELOPER` | 데이터 연동 개발자 검토 | 기술 안전성 + 매핑 정확도 + TestRun 트리거 | INTEGRATION_DEV |
| `TEST_RUN` | sandbox 자동 검증 | 24h 또는 N건 동기화 → 비교 리포트 자동 생성 | SYSTEM |
| `REVIEW_BY_FRANCHISE` | 가맹점 운영자 최종 동의 | 비교 리포트 확인 + 활성화 동의 또는 반려 | FRANCHISE |
| `ACTIVE` | 실 데이터 연동 운영 | cron sync + webhook 활성 | SYSTEM |
| `SUSPENDED` | 운영 중단 | 수동 재개 또는 계약 종료 | PLATFORM / FRANCHISE |

---

## 4. 전체 아키텍처

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#E3F2FD','primaryTextColor':'#000','primaryBorderColor':'#1565C0','lineColor':'#37474F','clusterBkg':'#ECEFF1','fontSize':'13px'}}}%%
flowchart TB
    subgraph UI["🖥️ UI"]
        PW["platform-dashboard<br/>/partners/wizard"]
        PR["platform-dashboard<br/>/partners/:id/review"]
        AC["admin-dashboard<br/>/clubs/:id 파트너 탭"]
    end

    subgraph API["🌐 admin-api (BFF)"]
        E1["/admin/partners/*"]
        E2["/admin/partners/my/club/*"]
    end

    subgraph PS["📦 partner-service"]
        DiscS["PartnerDiscoveryService"]
        MapS["PartnerMapperService"]
        SpecS["PartnerSpecService"]
        TestS["PartnerSpecTestRunService"]
        Client["DynamicPartnerClient<br/>(mapping-aware)"]
        Resil["partner-resilience<br/>circuit breaker"]
    end

    subgraph DB["🗄️ partner_db (Prisma)"]
        Cfg["PartnerConfig"]
        Spec["PartnerSpec"]
        Apv["PartnerSpecApproval"]
        TR["PartnerSpecTestRun"]
        SM["SlotMapping<br/>+isSandbox"]
        BM["BookingMapping<br/>+isSandbox"]
    end

    subgraph EXT["🤝 외부 파트너 API"]
        OpenAPI["/openapi.json"]
        Endpoints["/slots, /bookings, /payments ..."]
    end

    subgraph Agent["🤖 agent-service"]
        LLM["DeepSeek LLM<br/>매핑 추천 보조"]
    end

    PW -->|NATS partner.discover.run| E1
    PR -->|NATS partner.spec.*| E1
    AC -->|NATS partner.*| E2

    E1 --> DiscS
    E1 --> MapS
    E1 --> SpecS
    E1 --> TestS
    E2 --> SpecS

    DiscS --> OpenAPI
    DiscS --> Endpoints
    MapS --> LLM
    TestS --> Client
    Client --> Resil
    Resil --> Endpoints

    SpecS --> Spec
    SpecS --> Apv
    TestS --> TR
    Client --> SM
    Client --> BM

    classDef ui fill:#0D47A1,color:#fff,stroke:#1A237E,stroke-width:2px
    classDef api fill:#1565C0,color:#fff,stroke:#0D47A1,stroke-width:2px
    classDef svc fill:#2E7D32,color:#fff,stroke:#1B5E20,stroke-width:2px
    classDef db fill:#795548,color:#fff,stroke:#4E342E,stroke-width:2px
    classDef ext fill:#EF6C00,color:#fff,stroke:#BF360C,stroke-width:2px
    classDef ai fill:#6A1B9A,color:#fff,stroke:#4A148C,stroke-width:2px

    class PW,PR,AC ui
    class E1,E2 api
    class DiscS,MapS,SpecS,TestS,Client,Resil svc
    class Cfg,Spec,Apv,TR,SM,BM db
    class OpenAPI,Endpoints ext
    class LLM ai
```

---

## 5. 구성 상세 — 단계별

### 5.0 RIS_HANDOFF — 표준 명세 회신 (기본 경로)

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontSize':'13px'}}}%%
flowchart LR
    A["계약 체결"] --> B["RIS_TEMPLATE.yaml<br/>가맹점 전달"]
    B --> C["가맹점 회신<br/>YAML + 샘플 응답"]
    C --> D{"자동 검증"}
    D -->|스키마 OK| E["인증 헬스체크"]
    E -->|OK| F["샘플 응답<br/>필수 필드 확인"]
    F -->|OK| G["fingerprint 매칭<br/>Skill 라이브러리"]
    G -->|매칭| H["DRAFT 80% 자동 채움"]
    G -->|미매칭| I["DRAFT (수동 보강)<br/>+ Skill 신규 후보"]

    D -->|FAIL| Reject["보강 요청<br/>RIS_HANDOFF 유지"]
    E -->|FAIL| Reject
    F -->|FAIL| Reject

    classDef ok fill:#2E7D32,color:#fff,stroke:#1B5E20
    classDef chk fill:#1565C0,color:#fff,stroke:#0D47A1
    classDef warn fill:#EF6C00,color:#fff,stroke:#BF360C
    class A,B,C ok
    class D,E,F,G chk
    class H,I ok
    class Reject warn
```

- 가맹점에 [`docs/policy/PARTNER_RIS.md`](../policy/PARTNER_RIS.md) + [`docs/partner/RIS_TEMPLATE.yaml`](../partner/RIS_TEMPLATE.yaml) 전달
- 회신 시 자동 검증 4단계: 스키마 → 인증 → 샘플 응답 → fingerprint
- fingerprint 매칭 시 검증된 Skill(예: `golfzone-v3`) 자동 적용 → 마법사 30분 컷
- 미매칭이면 신규 Skill 후보로 저장 (검증 완료 후 라이브러리 등록)

### 5.1 DRAFT — 마법사 자동 발견 (Fallback)

> **적용 시점**: RIS 미준수 가맹점(회신 거부 / 미문서화 ERP / OpenAPI 부분 제공) 전용 fallback 경로. RIS 준수 가맹점은 §5.0에서 DRAFT 80% 자동 채움 상태로 진입하므로 본 단계는 매핑 보강 정도만 수행.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontSize':'13px'}}}%%
flowchart LR
    A["1️⃣ 계약 정보<br/>회사명/기간/담당자"] --> B["2️⃣ 도메인 + auth"]
    B --> C{"3️⃣ OpenAPI 시도"}
    C -->|✓ 발견| D["스펙 파싱"]
    C -->|✗ 404| E["Probe candidates<br/>/slots, /bookings, /payments"]
    D --> F["4️⃣ 매핑 추천<br/>규칙 + LLM"]
    E --> F
    F --> G["5️⃣ 운영자 검토 + 제출"]
    G --> RP(["→ REVIEW_BY_PLATFORM"])

    classDef step fill:#1565C0,color:#fff,stroke:#0D47A1,stroke-width:2px
    classDef terminal fill:#6A1B9A,color:#fff,stroke:#4A148C,stroke-width:3px
    class A,B,C,D,E,F,G step
    class RP terminal
```

- OpenAPI 시도 경로: `/openapi.json` · `/swagger.json` · `/api-docs` · `/.well-known/openapi`
- Probe: HEAD/OPTIONS로 후보 endpoint 존재 확인
- 매핑 추천 규칙: levenshtein + snake/camel 변환 + alias 사전 + LLM 보조 (DeepSeek)
- **TestRun 임계값 강화**: 본 fallback 경로는 mismatch < 0.5% (RIS 준수 1% 대비 엄격)

### 5.2 REVIEW_BY_PLATFORM → REVIEW_BY_DEVELOPER

```mermaid
%%{init: {'theme':'base','themeVariables':{
  'fontSize':'13px',
  'actorBkg':'#1565C0','actorBorder':'#0D47A1','actorTextColor':'#fff','actorLineColor':'#37474F',
  'noteBkgColor':'#FFF9C4','noteTextColor':'#000','noteBorderColor':'#F57F17',
  'signalColor':'#37474F','signalTextColor':'#37474F',
  'sequenceNumberColor':'#fff',
  'labelBoxBkgColor':'#1565C0','labelBoxBorderColor':'#0D47A1','labelTextColor':'#fff',
  'loopTextColor':'#0D47A1',
  'activationBkgColor':'#90CAF9','activationBorderColor':'#0D47A1'
}}}%%
sequenceDiagram
    autonumber
    box rgb(227, 242, 253) 👔 PLATFORM
    participant Op as 플랫폼 운영자
    end
    box rgb(232, 245, 233) 🖥️ System (UI/API/Service)
    participant W as platform-dashboard
    participant API as admin-api
    participant PS as partner-service
    end
    box rgb(255, 224, 178) 🛠️ INTEGRATION_DEV
    participant Dev as 연동 개발자
    end

    Op->>W: /partners/:id/review 진입
    W->>API: GET spec / mappings / contractInfo
    API->>PS: partner.spec.get
    PS-->>W: 검토 데이터
    Op->>W: 매핑 확인 + 승인
    W->>API: partner.spec.transition (REVIEW_BY_DEVELOPER)
    API->>PS: 상태 전이 + audit row insert
    PS-->>Op: 알림 (개발자 ASSIGN)

    Dev->>W: /partners/:id/review (DEV view)
    Dev->>W: 매핑 수정 (필요시) → diff 표시
    Dev->>W: TestRun 트리거
    W->>API: partner.spec.testRun
    API->>PS: sandboxMode=true 활성 + TestRun job 시작
```

### 5.3 TEST_RUN — sandbox 검증

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#FFF8E1','primaryTextColor':'#000','primaryBorderColor':'#F57F17','lineColor':'#5D4037','fontSize':'13px'}}}%%
flowchart TD
    Start([TestRun 시작]) --> Sand["sandboxMode=true<br/>PartnerConfig.sandboxMode 활성"]
    Sand --> Loop["sync loop<br/>24h 또는 N=100건"]

    Loop --> Fetch["DynamicPartnerClient<br/>fetchSlots / fetchBookings"]
    Fetch --> Save["SlotMapping / BookingMapping<br/>(isSandbox=true 격리)"]
    Save -->|loop| Loop

    Loop -->|종료 조건| Report["비교 리포트 자동 생성"]
    Report --> Comp["우리 ↔ 외부 ERP<br/>matched / mismatched"]
    Comp --> Sample["필드별 mismatch sample"]
    Sample --> Judge{"PASS 기준<br/>mismatch <1%<br/>auth/net error 0"}
    Judge -->|✓| Pass([→ REVIEW_BY_FRANCHISE])
    Judge -->|✗| Fail([→ REVIEW_BY_DEVELOPER])

    classDef sandbox fill:#FFF9C4,stroke:#F57F17,stroke-width:2px
    classDef judge fill:#EF6C00,color:#fff,stroke:#BF360C,stroke-width:3px
    classDef pass fill:#2E7D32,color:#fff,stroke:#1B5E20
    classDef fail fill:#C62828,color:#fff,stroke:#8E0000

    class Sand,Save,Loop sandbox
    class Judge judge
    class Pass pass
    class Fail fail
```

**PASS 기준 (정책)**
- `mismatch / total < 1%`
- 필수 필드(`startTime`, `maxPlayers`, `bookingId` 등) 빈 응답 0건
- 인증/네트워크 에러 0건
- 24h 경과 또는 N=100건 도달

### 5.4 REVIEW_BY_FRANCHISE → ACTIVE

```mermaid
%%{init: {'theme':'base','themeVariables':{
  'fontSize':'13px',
  'actorBkg':'#1565C0','actorBorder':'#0D47A1','actorTextColor':'#fff','actorLineColor':'#37474F',
  'noteBkgColor':'#FFF9C4','noteTextColor':'#000','noteBorderColor':'#F57F17',
  'signalColor':'#37474F','signalTextColor':'#37474F',
  'sequenceNumberColor':'#fff',
  'labelBoxBkgColor':'#1565C0','labelBoxBorderColor':'#0D47A1','labelTextColor':'#fff',
  'loopTextColor':'#0D47A1',
  'activationBkgColor':'#90CAF9','activationBorderColor':'#0D47A1'
}}}%%
sequenceDiagram
    autonumber
    box rgb(243, 229, 245) 🏌️ FRANCHISE
    participant FA as 가맹점 운영자
    end
    box rgb(232, 245, 233) 🖥️ System (UI/API/Service)
    participant Adm as admin-dashboard
    participant API as admin-api
    participant PS as partner-service
    participant Cron as job-service cron
    end
    box rgb(255, 224, 178) 🤝 External
    participant Ext as 파트너 API
    end

    FA->>Adm: /clubs/:id 파트너 탭
    Adm->>API: GET spec / latest TestRun
    API->>PS: partner.spec.get + testRun.latest
    PS-->>Adm: 비교 리포트 + 매핑 요약
    FA->>Adm: 활성화 동의
    Adm->>API: partner.spec.transition (ACTIVE)
    API->>PS: sandboxMode=false, 격리 데이터 정리, webhook 등록 시도
    PS-->>FA: 활성화 완료 알림

    Note over Cron,Ext: ── 운영 단계 ──
    loop 매 N분 (PartnerConfig.syncIntervalMin)
      Cron->>PS: partner.sync.execute
      PS->>Ext: fetchSlots / fetchBookings (실데이터)
      Ext-->>PS: 응답
      PS->>PS: SlotMapping / BookingMapping (isSandbox=false)
    end

    Note over Ext,PS: webhook (가능한 경우)
    Ext->>PS: POST /webhook/:partnerId
    PS->>PS: 즉시 반영
```

---

## 6. Role 권한 매트릭스

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontSize':'13px'}}}%%
flowchart LR
    subgraph PLATFORM["👔 PLATFORM 운영자"]
        P1[마법사 시작]
        P2[REVIEW_PLATFORM 승인]
        P3[ACTIVE 비활성화]
    end
    subgraph DEV["🛠️ INTEGRATION_DEV 개발자"]
        D1[매핑 수정]
        D2[TestRun 트리거]
        D3[REVIEW_DEVELOPER 승인]
    end
    subgraph FRANCHISE["🏌️ FRANCHISE 가맹점"]
        F1[리포트 확인]
        F2[REVIEW_FRANCHISE 동의]
        F3[본인 클럽 SUSPEND]
    end

    classDef pf fill:#1565C0,color:#fff,stroke:#0D47A1,stroke-width:2px
    classDef dv fill:#EF6C00,color:#fff,stroke:#BF360C,stroke-width:2px
    classDef fr fill:#6A1B9A,color:#fff,stroke:#4A148C,stroke-width:2px

    class P1,P2,P3 pf
    class D1,D2,D3 dv
    class F1,F2,F3 fr
```

| 작업 | PLATFORM | INTEGRATION_DEV | FRANCHISE |
|------|:---:|:---:|:---:|
| RIS_TEMPLATE 전달 | ✓ | | |
| RIS 회신 (YAML + 샘플) | | | ✓ |
| RIS 자동 검증 트리거 | ✓ | | |
| 마법사 시작 (DRAFT 생성) | ✓ | | |
| REVIEW_BY_PLATFORM 승인/반려 | ✓ | | |
| 매핑 수정 | | ✓ | |
| TestRun 트리거 | | ✓ | |
| REVIEW_BY_DEVELOPER 승인/반려 | | ✓ | |
| REVIEW_BY_FRANCHISE 동의/반려 | | | ✓ |
| ACTIVE 비활성화 | ✓ | ✓ | ✓ (본인 클럽) |

---

## 7. UI 라우트 맵

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontSize':'13px'}}}%%
flowchart TD
    Start([파트너 계약 체결]) --> Wizard["platform-dashboard<br/>/partners/wizard"]
    Wizard -->|"Step 1-5"| Submit["→ REVIEW_BY_PLATFORM"]

    Submit --> ReviewP["/partners/:id/review<br/>PLATFORM view"]
    ReviewP -->|승인| ReviewD["/partners/:id/review<br/>DEV view"]
    ReviewP -->|반려| Wizard

    ReviewD -->|매핑 수정| ReviewD
    ReviewD -->|TestRun| TR["/partners/:id/test-runs<br/>sandbox 24h"]
    ReviewD -->|반려| ReviewP

    TR -->|PASS| FConf["admin-dashboard<br/>/clubs/:id 파트너 탭<br/>동의 카드"]
    TR -->|FAIL| ReviewD

    FConf -->|동의| Active([ACTIVE<br/>실 동기화])
    FConf -->|반려| ReviewD

    Active -.->|스펙 변경| ReviewD
    Active -.->|운영 중단| Susp([SUSPENDED])

    classDef wizard fill:#795548,color:#fff,stroke:#4E342E,stroke-width:2px
    classDef stage fill:#6A1B9A,color:#fff,stroke:#4A148C,stroke-width:3px
    classDef test fill:#EF6C00,color:#fff,stroke:#BF360C,stroke-width:2px
    classDef terminal fill:#2E7D32,color:#fff,stroke:#1B5E20,stroke-width:3px

    class Wizard wizard
    class ReviewP,ReviewD,FConf stage
    class TR test
    class Active,Susp terminal
```

### 7.1 platform-dashboard 신규 라우트

| 경로 | 화면 | 권한 |
|------|------|------|
| `/partners/ris-handoff/:id` | RIS 명세 전달 + 회신 추적 + 자동 검증 결과 | PLATFORM |
| `/partners/wizard` | 등록 마법사 (DRAFT 생성, RIS 회신값 prefill) | PLATFORM |
| `/partners/:id/review` | stage별 검토 (PLATFORM/DEV view 분기) | PLATFORM / DEV |
| `/partners/:id/test-runs` | TestRun 이력 + 리포트 | PLATFORM / DEV |
| `/partners/:id/audit` | 승인 이력 (PartnerSpecApproval) | PLATFORM |
| `/partners/skills` | 검증된 Skill 라이브러리 (vendor별 어댑터) | PLATFORM / DEV |

### 7.2 admin-dashboard

| 경로 | 화면 | 조건 |
|------|------|------|
| `/clubs/:id` (파트너 탭) | REVIEW_BY_FRANCHISE: 동의 카드 + 비교 리포트 | bookingMode=PARTNER + status=REVIEW_BY_FRANCHISE |
| `/clubs/:id` (파트너 탭) | ACTIVE: 기존 PartnerStatusPanel | bookingMode=PARTNER + status=ACTIVE |

---

## 8. 자동 발견 + 매핑 추천 (Fallback)

> **적용 시점**: RIS 미준수 가맹점 전용. RIS 준수 가맹점은 §5.0의 RIS_HANDOFF 단계에서 매핑이 명시적으로 회신되므로 본 추천 흐름은 미사용 (또는 보강 확인 용도).

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontSize':'13px'}}}%%
flowchart TD
    Schema["외부 응답 schema"] --> Rules{"규칙 매칭"}
    Rules -->|이름 유사도| R1["levenshtein<br/>startTime ↔ start_time"]
    Rules -->|casing 변환| R2["snake ↔ camel"]
    Rules -->|alias 사전| R3["startTime ← teeTime / startAt"]
    R1 --> Conf["신뢰도 점수"]
    R2 --> Conf
    R3 --> Conf
    Conf -->|≥ 0.8| AutoMap["자동 매핑"]
    Conf -->|0.5~0.8| LLM["LLM 검증<br/>agent-service DeepSeek"]
    Conf -->|< 0.5| Manual["운영자 수동 매핑"]
    LLM --> Suggest["추천 + 사유 표시"]
    AutoMap --> UI["UI 매핑 카드"]
    Suggest --> UI
    Manual --> UI

    classDef rule fill:#1565C0,color:#fff,stroke:#0D47A1
    classDef ai fill:#6A1B9A,color:#fff,stroke:#4A148C
    classDef ui fill:#0D47A1,color:#fff,stroke:#1A237E,stroke-width:2px
    class R1,R2,R3,Conf,AutoMap rule
    class LLM,Suggest ai
    class UI ui
```

---

## 9. 활용 사례

### 9.1 신규 가맹점 — RIS 준수 + Skill 매칭 (Best case)

```
00:00  계약 체결
00:10  운영자가 RIS_TEMPLATE.yaml 전달 → RIS_HANDOFF
당일~익일  가맹점 회신 (YAML + 샘플 응답)
09:00  자동 검증 PASS + golfzone-v3 Skill fingerprint 매칭
       → DRAFT 80% 자동 채움
09:30  운영자 매핑 보강 + 제출 → REVIEW_BY_PLATFORM
10:00  운영자 승인 → REVIEW_BY_DEVELOPER
10:30  개발자 매핑 확인 + TestRun 트리거 → TEST_RUN
다음날 10:30  24h sandbox PASS → REVIEW_BY_FRANCHISE
11:00  가맹점 운영자가 비교 리포트 확인 + 동의 → ACTIVE
11:01  cron sync 시작 + webhook 등록 + Realtime Proxy cache 활성
```

### 9.2 외부 ERP가 OpenAPI 미노출

```
도메인 입력 → PartnerDiscovery
→ /openapi.json 404
→ probe candidates 자동 실행
  ▶ /api/v1/tee-times    200 OK   schema 추출
  ▶ /api/v1/reservations  200 OK   schema 추출
→ MapperService가 alias 사전으로 추천:
  tee_time → startTime
  reservation_id → externalBookingId
→ 운영자가 수동 조정 → 이후 흐름 동일
```

### 9.3 매핑이 잘못되었을 때 (안전망)

```
TestRun 시작
→ sandbox 24h 동안 데이터 비교
→ mismatch 30% 발견 (시간대 포맷 문제)
→ FAIL → REVIEW_BY_DEVELOPER 회귀
→ 개발자 mapping.startTime에 timezone 변환 추가
→ TestRun 재실행 → PASS
※ 실제 데이터는 손상 없음 (sandbox 격리)
```

### 9.4 booking key 실시간 조회

```
가맹점 운영자: admin-dashboard에서 예약 #135 상세
→ "외부 ERP에서 실시간 조회" 버튼
→ partner.booking.detail NATS
→ DynamicPartnerClient.fetchBooking(externalId)
→ 외부 응답: { status, payment: { amount, paidAt, method }, ... }
→ 화면에 결제 정보 + 상태 즉시 표시
```

---

## 10. 구현 Phase (gantt)

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontSize':'12px'}}}%%
gantt
    title 단계별 진행 계획
    dateFormat YYYY-MM-DD
    section Phase 1
    DB 모델 + migration              :p1a, 2026-05-15, 2d
    PartnerDiscoveryService          :p1b, after p1a, 3d
    마법사 UI Step 1~3               :p1c, after p1b, 3d
    section Phase 2
    PartnerMapperService (규칙+LLM)  :p2a, after p1c, 3d
    마법사 UI Step 4~5               :p2b, after p2a, 2d
    section Phase 3
    Approval + 권한 모델             :p3a, after p2b, 2d
    review 페이지 (PLATFORM/DEV)     :p3b, after p3a, 3d
    section Phase 4
    DynamicPartnerClient + sandbox   :p4a, after p3b, 4d
    TestRun 자동 + 리포트            :p4b, after p4a, 3d
    section Phase 5
    가맹점 동의 화면 (admin)         :p5a, after p4b, 2d
    ACTIVE 전환 + cron 통합          :p5b, after p5a, 2d
    section Phase 6
    booking/payment 실시간 조회      :p6a, after p5b, 3d
```

| Phase | 산출물 | 의존성 |
|-------|--------|--------|
| 1 | PartnerSpec 모델 + Discovery + 마법사 step 1~3 | — |
| 2 | Mapper + 마법사 step 4~5 | Phase 1 |
| 3 | Approval + review 페이지 | Phase 1, 2 |
| 4 | DynamicPartnerClient + TestRun sandbox | Phase 1~3 |
| 5 | 가맹점 동의 + ACTIVE 운영 | Phase 4 |
| 6 | 실시간 조회 | Phase 5 (또는 독립 진행 가능) |

---

## 11. DB 모델 (신규)

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontSize':'13px'}}}%%
erDiagram
    PartnerConfig ||--o| PartnerSpec : "1:0..1"
    PartnerSpec ||--o{ PartnerSpecApproval : "audit"
    PartnerSpec ||--o{ PartnerSpecTestRun : "검증 이력"
    PartnerSpec ||--o{ SlotMapping : "sync 결과"
    PartnerSpec ||--o{ BookingMapping : "sync 결과"

    PartnerConfig {
        int id
        int clubId
        bool isActive
        bool sandboxMode "신규"
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

## 12. NATS 패턴 (partner-service 신규)

| 패턴 | 트리거 | 응답 |
|------|--------|------|
| `partner.ris.template.send` | 계약 직후 RIS_TEMPLATE 발송 | sent (이메일/포털 알림) |
| `partner.ris.submission.validate` | 가맹점 회신 시 자동 검증 | { ok, errors[], fingerprint, skillMatch? } |
| `partner.skill.list` | Skill 라이브러리 조회 | PartnerAdapterSkill[] |
| `partner.skill.match` | fingerprint 매칭 시도 | skillId? + confidence |
| `partner.skill.register` | 신규 Skill 등록 (검증 후) | PartnerAdapterSkill |
| `partner.discover.run` | 마법사 Step 3 (fallback) | DiscoveredEndpoint[] + 신뢰도 |
| `partner.mapping.suggest` | 마법사 Step 4 (fallback) | 매핑 추천 + 사유 |
| `partner.spec.transition` | 상태 전이 (모든 단계) | 변경된 spec + audit row |
| `partner.spec.testRun` | DEV가 TestRun 트리거 | TestRun id (진행은 비동기) |
| `partner.spec.testRun.status` | UI 폴링 | progress + matched/mismatched |
| `partner.booking.detail` | admin 예약 상세 실시간 조회 | 외부 ERP 응답 (cache 30s) |
| `partner.payment.detail` | admin 결제 실시간 조회 | 외부 ERP 결제 정보 (cache 10s) |

---

## 13. 비용 / 외부 노출

| 항목 | dev | prod |
|------|-----|------|
| 외부 API 호출 (sandbox + 실 sync) | 자유 | 가맹점 측 rate limit 협의 |
| LLM 호출 (DeepSeek) | 마법사당 1~2회 | 동일 |
| TestRun 24h 동안 사용 데이터 | 메모리/디스크 미미 | 동일 |
| 외부 노출 endpoint | `/webhook/:partnerId` (기존) | 동일, public TLS |

---

## 14. 미해결 의사결정 사항

- [ ] TestRun PASS 임계값 (mismatch 1% vs 5%)
- [ ] sandboxMode 동안 가맹점에게 어떻게 안내할지 (UI 메시지/배너)
- [ ] LLM 매핑 추천 모델 (DeepSeek 외 대안 / 비용 / 신뢰도)
- [ ] webhook 자동 등록 표준 (파트너마다 다름)
- [ ] 스펙 변경 감지 트리거 (수동 vs 자동 schema diff)
- [ ] INTEGRATION_DEV 역할 vs 기존 PLATFORM_ADMIN 통합 여부

---

## 15. 관련 파일 / 원천 자료

| 파일 | 용도 |
|------|------|
| `docs/policy/PARTNER_RIS.md` | **가맹점 회신 표준 명세** (RIS_HANDOFF 단계의 입력) |
| `services/partner-service/skills/*.skill.yaml` | **PartnerAdapterSkill 라이브러리** (vendor별 검증된 어댑터) |
| `services/partner-service/src/partner/service/sync.service.ts` | 현재 동기화 로직 (확장 대상) |
| `services/partner-service/src/client/partner-client.service.ts` | 외부 API 호출 (DynamicClient 대체 예정) |
| `services/partner-service/src/client/partner-resilience.service.ts` | circuit breaker (그대로 활용) |
| `services/partner-service/src/cache/` | **Realtime Proxy Redis 캐시** (신규) |
| `services/partner-service/prisma/schema.prisma` | PartnerSpec / Approval / TestRun 추가 대상 |
| `services/agent-service/src/booking-agent/service/tool-executor.service.ts` | LLM 호출 패턴 참조 (fallback 매핑 추천용) |
| `apps/admin-dashboard/src/components/features/club/PartnerStatusPanel.tsx` | ACTIVE 후 가맹점 view 재사용 + Realtime 조회 버튼 |
| `apps/platform-dashboard/src/pages/franchise/FranchiseClubsPage.tsx` | 마법사 진입점 통합 위치 |
| `docs/workflow/SAGA.md` §6 결제 흐름 | 매핑된 결제 데이터 사용 위치 |
| `docs/architecture/OBSERVABILITY.md` | Cloud Trace로 외부 API 호출 trace 가능 |

---

## 16. PartnerAdapterSkill 라이브러리 (vendor 어댑터)

검증된 vendor 통합 패턴을 **재사용 가능한 Skill (YAML)** 로 저장. 같은 ERP를 쓰는 후속 가맹점은 fingerprint 매칭 → 1-클릭 적용.

```
services/partner-service/skills/
├── golfzone-v3.skill.yaml
├── xgolf-v2.skill.yaml
├── parsmate-v1.skill.yaml
└── generic-openapi.skill.yaml   # fallback (RIS 미준수 + vendor 미식별)
```

### 16.1 Skill 파일 구조

```yaml
# golfzone-v3.skill.yaml
name: golfzone-v3
description: GolfZone ERP v3.x 부킹/결제 연동
version: 1.2.0
validated:
  at: 2026-04-22
  by: sungyoo
  specIds: [12, 27, 41]          # 검증된 PartnerSpec id 누적

fingerprint:                     # vendor 식별 규칙
  openapiTitle: "GolfZone API"
  endpoints: ["/api/v3/tee-times", "/api/v3/reservations"]

procedure:                       # 마법사가 자동 실행
  - probe: GET /api/v3/health
  - discoverSchema: /openapi.json
  - bindAuth: header(X-API-KEY)

mappings:                        # RIS 표준 필드 ↔ vendor 응답 필드
  tee_time: startTime
  reservation_id: externalBookingId
  player_count: maxPlayers
  paid_amount: payment.amount
  course_id: courseId            # 9홀 단위 (PARTNER_RIS §4.2)
  round_id: roundId              # 18홀 게임 라운드 (PARTNER_RIS §4.2.2)

transforms:
  - field: startTime
    fn: tzShift
    args: ["+09:00"]
  - field: payment.amount
    fn: divide
    args: [100]                  # 분 → 원
  - field: slot                  # vendor가 9홀 슬롯만 제공할 때
    fn: composeRoundSlot         # 동일 시각의 9홀 슬롯 2개 → 18홀 슬롯 1개
    args:
      roundSequence: ["COURSE-A", "COURSE-B"]
      strategy: pairByStartTime  # 같은 startTime의 2 코스 슬롯 묶음

validation:
  mismatchThreshold: 0.01
  requiredFields: [startTime, maxPlayers, externalBookingId, roundId]
  policy:
    courseHoleCount: 9           # 1차 릴리즈 고정
    roundTotalHoles: 18          # 1차 릴리즈 고정
    roundCourseSequenceLength: 2 # 1차 릴리즈 고정
```

### 16.2 작동 흐름

```mermaid
flowchart LR
    A["가맹점 RIS 회신"] --> B{"fingerprint 매칭"}
    B -->|매칭| C["기존 Skill 적용<br/>(예: golfzone-v3)"]
    C --> D["DRAFT 80% 자동 채움"]
    B -->|미매칭| E["신규 Skill 후보 생성"]
    E --> F["DRAFT (수동 보강)"]
    F --> G["TestRun PASS"]
    G --> H["Skill 라이브러리 등록"]
```

### 16.3 저장 위치 / 관리

- **위치**: Git 관리 (`services/partner-service/skills/*.skill.yaml`)
- **이유**: 코드 리뷰 가능, 운영자 직접 열람 가능, 인프라 부담 zero
- **신규 등록**: TestRun PASS 시 PR 자동 생성 (또는 수동 등록)
- **버전 관리**: vendor 스펙 변경 시 `version` bump + 기존 validated specIds 점검

---

## 17. Realtime Booking Proxy (실시간 데이터 조회)

가맹점 운영자가 admin-dashboard에서 예약/결제 상세를 볼 때 **stale 데이터 방지**.

### 17.1 3-Layer 구조

```mermaid
flowchart LR
    UI["admin-dashboard<br/>예약 상세"] --> L1{"L1: Redis Cache<br/>TTL 30s (결제 10s)"}
    L1 -->|hit| Resp["응답"]
    L1 -->|miss| L2["L2: DynamicPartnerClient<br/>on-demand fetch"]
    L2 --> Ext["외부 ERP API"]
    Ext --> Update["cache 갱신 + 응답"]

    L3["L3: webhook subscribe<br/>(가능한 vendor)"] -.->|invalidate| L1

    classDef cache fill:#1565C0,color:#fff,stroke:#0D47A1
    classDef fetch fill:#EF6C00,color:#fff,stroke:#BF360C
    classDef sub fill:#2E7D32,color:#fff,stroke:#1B5E20

    class L1 cache
    class L2,Ext fetch
    class L3 sub
```

### 17.2 정책

| 항목 | 정책 |
|------|------|
| cache key | `partner:booking:{externalId}` / `partner:payment:{externalId}` |
| TTL | booking 30s · payment 10s · slot 60s |
| stale-while-revalidate | miss 시 stale 값 반환 + 백그라운드 refresh (선택) |
| circuit breaker | 기존 `partner-resilience.service.ts` 재사용 |
| webhook invalidate | `POST /webhook/:partnerId/booking.updated` → cache evict |

### 17.3 신규 NATS 패턴

§12 표 참조: `partner.booking.detail` / `partner.payment.detail` (cache + on-demand 통합)

### 17.4 영향 모듈

| 파일 | 변경 |
|------|------|
| `services/partner-service/src/cache/` | 신규 (Redis client + key/TTL 정책) |
| `services/partner-service/src/client/partner-client.service.ts` | on-demand fetch 메서드 추가 |
| `services/partner-service/src/partner/service/webhook.service.ts` | cache invalidate hook 추가 |
| `apps/admin-dashboard/src/components/features/club/PartnerStatusPanel.tsx` | 실시간 조회 버튼 + 응답 표시 |

---

## 18. 변경 이력

| 날짜 | 버전 | 변경 |
|------|------|------|
| 2026-05-14 | 0.1 | 최초 design 작성 |
| 2026-05-14 | 0.2 | OBSERVABILITY.md 스타일 반영 (init theme · classDef · 활용 사례 · 비용 / 외부 노출) |
| 2026-05-16 | 0.3 | RIS_HANDOFF 단계 추가 · §5.0 신규 · §5.1을 fallback으로 격하 · §16 PartnerAdapterSkill · §17 Realtime Booking Proxy · §12 NATS 패턴 보강 · PARTNER_RIS.md 연계 |
| 2026-05-17 | 0.4 | 코스 = 9홀 / 게임 라운드 = 18홀(9홀 2개 조합) 정책 반영 · §16.1 Skill 예시에 `composeRoundSlot` 변환 및 `validation.policy` 추가 · §5.2 / §5.4 sequenceDiagram 컬러 컨벤션 적용 (actor 명도 대비 + box 그룹화 PLATFORM/System/DEV/FRANCHISE/External) · 9홀 라운드는 향후 확장 |
