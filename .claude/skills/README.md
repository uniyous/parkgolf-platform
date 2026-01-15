# Park Golf Platform - Claude Code Skills

## Skills 카테고리 구조

```
.claude/skills/
├── README.md                      # 이 파일
│
├── development/                   # 개발 관련
│   ├── nestjs-conventions/        # NestJS 코딩 컨벤션
│   ├── nats-patterns/             # NATS 메시징 패턴
│   └── project-structure/         # 프로젝트 구조 가이드
│
├── testing/                       # 테스팅 관련
│   ├── SKILL.md                   # 테스트 전략 통합 가이드
│   ├── e2e/                       # E2E 테스트 (Playwright)
│   ├── integration-test/          # 통합 테스트 (API, NATS)
│   └── contract-test/             # 계약 테스트 (Pact)
│
├── deployment/                    # 배포 관련
│   └── deploy-guide/              # 배포 가이드
│
└── operations/                    # 운영 관련
    └── troubleshoot/              # 트러블슈팅
```

## Skills 목록

| 카테고리 | Skill | 설명 | 트리거 키워드 |
|---------|-------|------|--------------|
| **Development** | `nestjs-conventions` | NestJS 코딩 컨벤션 | NestJS, 컨벤션, 모듈, 서비스 |
| **Development** | `nats-patterns` | NATS 메시징 패턴 | NATS, 메시징, 마이크로서비스 |
| **Development** | `project-structure` | 프로젝트 구조 가이드 | 구조, 아키텍처 |
| **Testing** | `testing` | 테스트 전략 (통합) | 테스트, test |
| **Testing** | `e2e` | E2E 테스트 (Playwright) | e2e, playwright |
| **Testing** | `integration-test` | API 통합 테스트 | 통합테스트, integration |
| **Testing** | `contract-test` | 계약 테스트 (Pact) | 계약테스트, contract, pact |
| **Deployment** | `deploy-guide` | 배포 가이드 | 배포, deploy, Cloud Run |
| **Operations** | `troubleshoot` | 문제 해결 가이드 | 오류, 에러, 문제, 실패 |

## 사용 방법

### 1. 자동 트리거
질문에 트리거 키워드가 포함되면 자동으로 관련 Skill이 활성화됩니다.

예시:
- "iam-service 배포 방법 알려줘" → `deploy-guide` 활성화
- "E2E 테스트 실행해줘" → `e2e` 활성화
- "서비스 오류 해결해줘" → `troubleshoot` 활성화

### 2. 직접 호출
```
/skill <skill-name>
```

예시:
```
/skill e2e
/skill deploy-guide
```

## Skill 추가 방법

1. 적절한 카테고리 폴더에 새 폴더 생성
2. `SKILL.md` 파일 작성 (YAML frontmatter 필수)

```markdown
---
name: skill-name
description: Skill 설명. 트리거 키워드 포함.
---

# Skill 제목

내용...
```

## 서비스 정보

### 배포된 서비스 URLs (dev)

| 서비스 | 타입 | URL |
|--------|------|-----|
| admin-api | BFF | https://admin-api-dev-xxx.a.run.app |
| user-api | BFF | https://user-api-dev-xxx.a.run.app |
| iam-service | Microservice | https://iam-service-dev-xxx.a.run.app |
| course-service | Microservice | https://course-service-dev-xxx.a.run.app |
| booking-service | Microservice | https://booking-service-dev-xxx.a.run.app |
| notify-service | Microservice | https://notify-service-dev-xxx.a.run.app |

### Swagger 문서

| 서비스 | Swagger URL |
|--------|-------------|
| admin-api | /api-docs |
| user-api | /api-docs |

## 관련 문서

- [CLAUDE.md](/CLAUDE.md) - 프로젝트 개발 규칙 (항상 적용)
