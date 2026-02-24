---
name: docs-writing
description: 문서 작성/현행화 스킬. 코드 변경 후 영향받는 문서를 식별하고 업데이트합니다. 트리거 키워드 - 문서, docs, 현행화, 다이어그램, 아키텍처 문서, 워크플로우 문서
---

# 문서 작성 스킬 (Documentation Writing Skill)

---

## 1. 문서 체계

### 1.1 폴더 구조

```
docs/
├── architecture/          # What — 시스템이 무엇인가
│   ├── SYSTEM.md          # 전체 아키텍처, 서비스 상세, NATS 패턴
│   ├── DATABASE.md        # ERD, Prisma 스키마, 서비스별 DB
│   └── INFRASTRUCTURE.md  # GKE, Ingress, Secrets, CI/CD
│
├── workflow/              # How — 어떻게 동작하는가
│   ├── BOOKING.md         # 예약 Saga, 분산 트랜잭션
│   ├── AGENT.md           # AI 부킹 에이전트
│   ├── CHAT.md            # 실시간 채팅
│   ├── NOTIFICATION.md    # 알림 시스템
│   └── AUTH.md            # 인증/인가, RBAC
│
├── policy/                # Why — 왜 이렇게 결정했는가
│   ├── ACCOUNT_DELETION.md
│   └── MEMBERSHIP_TIER.md
│
└── management/            # 프로젝트 관리
    └── ROADMAP.md
```

### 1.2 분류 기준

| 분류 | 질문 | 내용 | 예시 |
|------|------|------|------|
| **architecture/** | "시스템이 무엇인가?" | 구조, 관계, 배포 | 서비스 목록, DB 스키마, 인프라 |
| **workflow/** | "어떻게 동작하는가?" | 흐름, 시퀀스, 상태 전이 | Saga, 채팅 이벤트, 인증 플로우 |
| **policy/** | "왜 이렇게 결정했는가?" | 비즈니스 규칙, 정책 | 계정 삭제, 멤버십 등급 |
| **management/** | "프로젝트 현황은?" | 로드맵, 진행률 | 마일스톤, 잔여 작업 |

---

## 2. 현행화 트리거 맵

코드 변경 시 어떤 문서를 업데이트해야 하는지 판단하는 기준:

| 코드 변경 유형 | 대상 문서 |
|---------------|----------|
| 서비스 추가/삭제 | `architecture/SYSTEM.md` |
| NATS 패턴 추가/변경 | `architecture/SYSTEM.md` |
| NATS 클라이언트 의존성 변경 | `architecture/SYSTEM.md` (Service Dependencies) |
| Prisma 스키마 변경 | `architecture/DATABASE.md` |
| K8s/Ingress/Secret 변경 | `architecture/INFRASTRUCTURE.md` |
| CI/CD 워크플로우 변경 | `architecture/INFRASTRUCTURE.md` |
| 예약/결제 흐름 변경 | `workflow/BOOKING.md` |
| Agent 도구/핸들러 변경 | `workflow/AGENT.md` |
| Socket.IO 이벤트 변경 | `workflow/CHAT.md` |
| 알림 채널/트리거 변경 | `workflow/NOTIFICATION.md` |
| JWT/RBAC/권한 변경 | `workflow/AUTH.md` |
| 비즈니스 정책 변경 | `policy/*.md` |
| 마일스톤 완료 | `management/ROADMAP.md` |

### 현행화 절차

1. **변경 파일 확인** — `git diff --name-only` 또는 작업 내용으로 판단
2. **트리거 맵 대조** — 위 테이블에서 영향받는 문서 식별
3. **해당 문서 읽기** — 현재 내용 파악
4. **변경사항만 반영** — 추가/수정/삭제된 부분만 정확히 업데이트
5. **불필요한 내용 제거** — 코드에서 삭제된 기능은 문서에서도 삭제

---

## 3. 작성 규칙

### 3.1 핵심 원칙

| 규칙 | 설명 |
|------|------|
| **한 문서 = 한 관심사** | SYSTEM.md에 DB 스키마 넣지 않음 |
| **코드가 진실, 문서는 지도** | 구현 디테일보다 **흐름과 관계**에 집중 |
| **500줄 가이드라인** | 한 문서가 500줄 초과 시 분할 검토 |
| **변경 로그 없음** | git log가 이력, 문서에 changelog/version 섹션 넣지 않음 |
| **NATS 패턴은 소스 기준** | 문서에 패턴 나열 시 실제 코드와 대조 |

### 3.2 언어 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 본문 | 한국어 | "예약 시스템은 Saga 패턴을 사용합니다" |
| 기술 용어 | 영문 원어 유지 | Saga, NATS, JWT, Socket.IO |
| 코드/패턴 | 영문 (코드 그대로) | `booking.create`, `slot.reserve` |

### 3.3 포맷 규칙

- **제목**: `# 문서 제목` → `## 섹션` → `### 서브섹션` (3단계까지)
- **코드 블록**: 언어 태그 필수 (`typescript`, `bash`, `yaml`, `swift`, `kotlin`)
- **mermaid 다이어그램**: 워크플로우 문서에 필수
- **테이블**: 비교/목록 데이터에 적극 사용
- **문서 하단**: `**Last Updated**: YYYY-MM-DD` 한 줄만

### 3.4 금지사항

```
❌ 변경 이력 섹션 (## Recent Updates, ## Changelog)
❌ 버전 번호 (Document Version: X.Y.Z)
❌ 목차에 앵커 링크가 없는 경우
❌ Technology Stack 중복 나열 (CLAUDE.md에 이미 있음)
❌ 한 문서에서 여러 관심사 혼합
❌ 소스 코드 전체 복사 (핵심 로직만 발췌)
```

---

## 4. Mermaid 다이어그램 가이드

### 4.1 다이어그램 타입 선택

| 용도 | 타입 | 사용 위치 |
|------|------|----------|
| 시스템 구조 | `graph TB` / `graph LR` | architecture/ |
| 요청/응답 흐름 | `sequenceDiagram` | workflow/ |
| 상태 전이 | `stateDiagram-v2` | workflow/ |
| DB 관계 | `erDiagram` | architecture/DATABASE.md |
| CI/CD 파이프라인 | `graph LR` | architecture/INFRASTRUCTURE.md |

### 4.2 컬러 팔레트 (프로젝트 표준)

```
Frontend:  fill:#4fc3f7  (하늘색)
BFF:       fill:#ffb74d  (주황색)
Service:   fill:#ba68c8  (보라색)
AI/Ext:    fill:#4db6ac  (청록색)
Data:      fill:#81c784  (초록색)
Message:   fill:#f06292  (분홍색)
Ingress:   fill:#42a5f5  (파란색)
External:  fill:#ffcc80  (연주황)
```

### 4.3 규칙

- `subgraph`로 레이어/도메인 그룹화
- 동기 통신: 실선 (`-->`, `->>`)
- 비동기 통신: 점선 (`-.->`, `-->>`)
- 노드 레이블: 서비스명 + 기술 (`IAM[IAM Service<br/>NestJS]`)
- `classDef`로 레이어별 색상 통일

---

## 5. 문서 유형별 구조

### 5.1 Architecture 문서

```
# 제목
## 개요 (1-2문단)
## 다이어그램 (graph TB/LR)
## 서비스/모델 상세 (테이블 + 코드블록)
---
**Last Updated**: YYYY-MM-DD
```

### 5.2 Workflow 문서

```
# 제목
## 개요 (구성 요소 테이블)
## 상태 정의 (stateDiagram + 상태 테이블)
## 주요 흐름 (sequenceDiagram + 단계별 설명)
## 예외 처리 (실패 시나리오, 보상 트랜잭션)
---
**Last Updated**: YYYY-MM-DD
```

### 5.3 Policy 문서

```
# 제목
## 목적 (법적 근거 포함)
## 적용 범위
## 규칙 (테이블)
## 프로세스 (flowchart)
---
**Last Updated**: YYYY-MM-DD
```

---

## 6. 상호 참조

### 문서 간 링크

```markdown
자세한 내용은 [예약 워크플로우](../workflow/BOOKING.md)를 참조하세요.
[Saga 패턴](../workflow/BOOKING.md#booking-saga-flow)을 참조하세요.
```

### 소스 코드 참조

```markdown
**소스**: `services/booking-service/src/booking/service/booking.service.ts`
```

---

## 7. 품질 체크리스트

문서 작성/업데이트 완료 후 확인:

- [ ] 한 문서 = 한 관심사 원칙 준수
- [ ] mermaid 다이어그램이 GitHub에서 렌더링 가능
- [ ] NATS 패턴이 실제 코드와 일치
- [ ] 변경 로그/버전 섹션 없음
- [ ] 500줄 이하
- [ ] `**Last Updated**` 날짜 갱신
- [ ] 상호 참조 링크 유효
