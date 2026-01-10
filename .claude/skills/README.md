# Park Golf Platform - Claude Code Skills

## Skills 카테고리 구조

```
.claude/skills/
├── README.md                    # 이 파일
│
├── development/                 # 개발 관련
│   ├── service-dev/            # 서비스 개발 가이드
│   └── api-design/             # API 설계 가이드
│
├── testing/                     # 테스팅 관련
│   ├── integration-test/       # 통합 테스트
│   ├── contract-test/          # 계약 테스트
│   └── e2e-test/               # E2E 테스트
│
├── deployment/                  # 배포 관련
│   ├── deploy-guide/           # 배포 가이드
│   └── rollback/               # 롤백 가이드
│
└── operations/                  # 운영 관련
    ├── troubleshoot/           # 트러블슈팅
    └── monitoring/             # 모니터링
```

## Skills 목록

| 카테고리 | Skill | 설명 | 트리거 키워드 |
|---------|-------|------|--------------|
| **Development** | `service-dev` | 백엔드 서비스 개발 | 서비스, API, NATS, 마이크로서비스 |
| **Testing** | `integration-test` | API 통합 테스트 | 통합테스트, integration, API 테스트 |
| **Testing** | `contract-test` | 계약 테스트 (Pact) | 계약테스트, contract, pact |
| **Deployment** | `deploy-guide` | 배포 가이드 | 배포, deploy, Cloud Run |
| **Operations** | `troubleshoot` | 문제 해결 가이드 | 오류, 에러, 문제, 실패 |

## 사용 방법

### 1. 자동 트리거
질문에 트리거 키워드가 포함되면 자동으로 관련 Skill이 활성화됩니다.

예시:
- "auth-service 배포 방법 알려줘" → `deploy-guide` 활성화
- "API 통합 테스트 실행해줘" → `integration-test` 활성화
- "서비스 오류 해결해줘" → `troubleshoot` 활성화

### 2. 직접 호출
```
/skill <skill-name>
```

예시:
```
/skill integration-test
/skill contract-test
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

| 서비스 | URL |
|--------|-----|
| admin-api | https://admin-api-dev-iihuzmuufa-du.a.run.app |
| user-api | https://user-api-dev-iihuzmuufa-du.a.run.app |
| auth-service | https://auth-service-dev-iihuzmuufa-du.a.run.app |
| course-service | https://course-service-dev-iihuzmuufa-du.a.run.app |
| booking-service | https://booking-service-dev-iihuzmuufa-du.a.run.app |
| notify-service | https://notify-service-dev-iihuzmuufa-du.a.run.app |

### Swagger 문서

| 서비스 | Swagger URL |
|--------|-------------|
| admin-api | https://admin-api-dev-iihuzmuufa-du.a.run.app/api-docs |
| user-api | https://user-api-dev-iihuzmuufa-du.a.run.app/api-docs |
