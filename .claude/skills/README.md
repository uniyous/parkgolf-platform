# ParkGolfMate - Claude Code Skills

워크플로우 단계별 실행 skill. 도메인 코딩 규칙은 `CLAUDE.md` + `docs/`가 담당한다.

## 구조

```
.claude/skills/
├── README.md           # 이 파일
├── spec/SKILL.md       # spec(계약) 문서 생성 — Linear 이슈 → docs/specs/active/
├── pr/SKILL.md         # draft PR 생성 — base develop·커밋 문법·spec 포함 점검
└── testing/SKILL.md    # 테스트 전략 (Contract · Integration · E2E)
```

> skill은 `.claude/skills/<이름>/SKILL.md` **한 단계**에서만 인식된다.
> 카테고리 폴더로 한 겹 더 묶으면 로드되지 않으므로 중첩 금지.

## 목록

| Skill | 호출 | 설명 |
|-------|------|------|
| `spec` | `/spec UNI-123` | Linear 이슈를 읽어 계약 문서를 `docs/specs/active/`에 생성, 이슈에 역링크 |
| `pr` | `/pr` | feature 브랜치에서 develop 대상 draft PR 생성 + 규칙 점검 |
| `testing` | "테스트" | 테스트 피라미드·실행·CI 통합 가이드 |

## 워크플로우

```
plan(Linear) → spec(/spec) → implement → draft PR(/pr) → review(/code-review)
```

## 관련 문서

- [CLAUDE.md](/CLAUDE.md) — 프로젝트 핵심 개발 규칙 (항상 적용)
- [docs/specs/README.md](/docs/specs/README.md) — spec 문서 규약·템플릿
- [docs/architecture/](/docs/architecture/) · [docs/workflow/](/docs/workflow/) · [docs/policy/](/docs/policy/)
