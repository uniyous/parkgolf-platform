# Park Golf Platform - Claude Code Skills

## Skills 구조

```
.claude/skills/
├── README.md                            # 이 파일
├── backend/
│   └── nestjs-service/SKILL.md          # NestJS 백엔드 (BFF, NATS, 예외, DTO, Dockerfile)
├── frontend/
│   ├── react-app/SKILL.md              # React 웹 (React Query, Tailwind, bffParser)
│   ├── ios-app/SKILL.md                # iOS (SwiftUI, MVVM, Actor APIClient)
│   └── android-app/SKILL.md            # Android (Compose, Hilt, Repository)
├── infrastructure/
│   └── cicd/SKILL.md                   # GKE 배포, CI/CD, 트러블슈팅
├── testing/
│   └── SKILL.md                        # 테스트 전략 (Contract, Integration, E2E)
└── documentation/
    └── docs-writing/SKILL.md           # 문서 작성/현행화 가이드
```

## Skills 목록

| 카테고리 | Skill | 설명 | 트리거 키워드 |
|---------|-------|------|--------------|
| **Backend** | `nestjs-service` | NestJS 백엔드 전체 규칙 | NestJS, 백엔드, NATS, BFF, API |
| **Frontend** | `react-app` | React 웹 앱 규칙 | React, 프론트엔드, dashboard, Tailwind |
| **Frontend** | `ios-app` | iOS 앱 규칙 | iOS, Swift, SwiftUI, Tuist |
| **Frontend** | `android-app` | Android 앱 규칙 | Android, Kotlin, Compose |
| **Infrastructure** | `cicd` | 인프라/배포 가이드 | 배포, deploy, GKE, kubectl |
| **Testing** | `testing` | 테스트 전략 | 테스트, test, 검증 |
| **Documentation** | `docs-writing` | 문서 작성 가이드 | 문서, docs, 다이어그램 |

## 관련 문서

- [CLAUDE.md](/CLAUDE.md) — 프로젝트 핵심 개발 규칙 (항상 적용)
- [docs/architecture/](/docs/architecture/) — 시스템 아키텍처, DB, 인프라
- [docs/workflow/](/docs/workflow/) — 예약, 채팅, 알림, 인증 워크플로우
- [docs/policy/](/docs/policy/) — 비즈니스 정책
