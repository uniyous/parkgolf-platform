---
name: spec
description: ParkGolfMate spec(계약) 문서 생성 — Linear 이슈를 읽어 docs/specs/active/ 에 계약 문서를 만들고 이슈에 역링크. "spec 작성", "/spec", "계약 문서", Linear 이슈 기반 구현 설계 시 사용.
---

# Spec Skill

`plan → spec → implement → draft PR → review` 플로우의 **spec(계약) 단계**를 수행한다.
Linear 이슈는 "왜/무엇", spec은 "어떤 인터페이스로"를 고정한다.

상세 규약: `docs/specs/README.md`

---

## 사용법

```
/spec UNI-123
/spec UNI-123 policy-resolve-cache    # 요약 슬러그 직접 지정
```

인자 = Linear 이슈 ID(필수) + kebab 요약(선택, 생략 시 제목에서 생성).

---

## 절차

### 1. 이슈 읽기
Linear MCP `get_issue`로 `UNI-xxx` 조회 → 제목·설명·라벨·하위이슈 파악.
ID가 없으면 사용자에게 1줄로 요청(추측 금지).

### 2. spec 필요 여부 판정
아래 기준으로 판단해 **먼저 사용자에게 알린다**.

| spec 필수 | spec 생략(이슈로 충분) |
|---|---|
| 다계층(Front→BFF→NATS→MS) 변경 | 단일 파일 버그픽스 |
| 다서비스 걸침 | UI 너비·문구 조정 |
| 새 NATS 계약·응답 shape 변경 | 설정값 1개 변경 |
| saga / 결제 흐름 | |

생략 대상이면 spec을 만들지 말고 "이슈로 충분"이라고 알린 뒤 종료.

### 3. 파일 생성
경로: `docs/specs/active/{이슈ID}-{kebab-요약}.md`
(예: `docs/specs/active/UNI-123-policy-resolve-cache.md`)

아래 템플릿으로 작성. 이슈 내용을 바탕으로 각 섹션을 **구체적으로** 채운다 — 빈 골격만 남기지 않는다.

```markdown
---
issue: UNI-123
pr:
---

# UNI-123 — {제목}

> Linear: {이슈 URL}

## 수용 기준 (검증 가능하게)
- [ ] {관찰 가능한 결과로 서술}

## 계약 (변경되는 인터페이스)
- **NATS**: `패턴명` — 요청 `{...}` → 응답 `{...}` (NatsResponse.success/paginated/withSaga 중)
- **BFF**: `METHOD /path` — 정규화 여부(saga면 `{success, data, saga}`)
- **타입**: 추가/변경 필드 (front 타입과 API 직결, 컨버터 금지)

## 범위 / 변경 파일
- `services/...`
- `apps/...`

## 배포 의존성
- saga 응답 변경 여부 → 변경 시 `saga-service` 선배포 → `user-api`·`admin-api`·`agent-service`
```

ParkGolfMate 계약 작성 시 반영할 규칙(CLAUDE.md):
- 응답은 `NatsResponse` 헬퍼, 예외는 `UnifiedExceptionFilter` 위임
- BFF는 MS 응답 그대로 전달, **saga만 `{success, data, saga}` 정규화**
- `any` 금지 → `unknown`/제네릭, `interface` 우선
- 미출시 단계: 하위호환 없이 풀스택 한 세트로 변경

### 4. 이슈 역링크
Linear MCP `save_issue`로 이슈 본문 끝에 1줄 추가:
`Spec: docs/specs/active/{파일명}.md`

### 5. 보고
생성 경로 + 핵심 계약 요약 3줄 이내로 보고. spec은 코드와 **같은 PR**에 들어가야 함을 상기.

---

## 라이프사이클 규칙

- spec과 코드는 **같은 PR** (spec만 따로 머지 금지)
- 구현 중 계약이 바뀌면 **spec을 먼저 수정** 후 코드
- merge 후 `git mv docs/specs/active/{파일} docs/specs/archive/` (삭제 금지)
