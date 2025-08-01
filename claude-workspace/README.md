# Claude Workspace - Park Golf Platform 중앙 관리 시스템

> 🏗️ 요구사항 → 작업 → 완료의 명확한 흐름을 제공하는 통합 관리 공간

## 🎯 핵심 관리 원칙

1. **중앙 집중화**: Requirements와 Tasks를 최상위 관리 포인트로
2. **계층 구조**: 용도별 명확한 폴더 분리
3. **추적 가능성**: 요구사항 → 작업 → 완료 흐름
4. **유지보수성**: 날짜별/스프린트별 작업 아카이빙
5. **접근성**: Claude AI가 빠르게 컨텍스트 파악 가능

## 📁 새로운 폴더 구조

```
claude-workspace/
├── 📋 requirements/        # 요구사항 상세 문서
│   ├── functional/        # 기능 요구사항
│   │   ├── booking-system.md
│   │   ├── course-management.md
│   │   └── user-management.md
│   ├── technical/         # 기술 요구사항
│   │   ├── performance.md
│   │   ├── security.md
│   │   └── scalability.md
│   └── business/          # 비즈니스 요구사항
│       └── objectives.md
│
├── 🎯 tasks/              # 작업 관리
│   ├── current/           # 현재 진행 중
│   │   └── sprint-2025-w04.md
│   ├── backlog/           # 백로그
│   │   ├── features.md
│   │   └── tech-debt.md
│   └── completed/         # 완료된 작업
│       └── 2025-01.md
│
├── 🔧 development/        # 개발 환경
│   ├── setup/            # 환경 설정
│   │   ├── local-env.md
│   │   └── docker-compose.yml
│   ├── templates/        # 코드 템플릿
│   └── scripts/          # 자동화 스크립트
│
├── 📚 documentation/      # 기술 문서
│   ├── api/              # API 문서
│   ├── database/         # DB 스키마
│   └── guides/           # 개발 가이드
│
├── 🚀 deployment/         # 배포 관련
│   ├── kubernetes/       # K8s 매니페스트
│   ├── terraform/        # IaC
│   └── ci-cd/           # CI/CD 파이프라인
│
├── 📊 monitoring/         # 모니터링 & 로그
│   ├── dashboards/       # 대시보드 설정
│   └── alerts/           # 알림 규칙
│
└── [기존 폴더들...]      # 기존 구조 유지
    ├── management/
    ├── standards/
    ├── operations/
    └── integrations/
```

## 🔄 워크플로우

### 1. 요구사항 정의 (Requirements)
```
.claude/REQUIREMENTS.md (마스터)
    ↓
claude-workspace/requirements/* (상세)
```

### 2. 작업 분해 (Tasks)
```
요구사항 → .claude/TASKS.md (실시간)
    ↓
claude-workspace/tasks/current/* (스프린트)
```

### 3. 구현 및 추적
```
작업 시작 → 진행중 → 완료
    ↓
claude-workspace/tasks/completed/* (아카이브)
```

## 🚀 빠른 시작

### 새로운 요구사항 추가
1. `.claude/REQUIREMENTS.md`에 요구사항 추가
2. `claude-workspace/requirements/`에 상세 문서 작성
3. `.claude/TASKS.md`에 작업 분해

### 작업 시작하기
1. `.claude/TASKS.md`에서 작업 선택
2. 상태를 '진행중'으로 변경
3. 구현 진행
4. 완료 시 즉시 상태 업데이트

### 스프린트 관리
1. `claude-workspace/tasks/current/`에 스프린트 문서 생성
2. 2주 단위로 작업 계획
3. 완료 시 `completed/`로 이동

## 📊 주요 관리 도구

### 요구사항 관리
- **중앙 문서**: `.claude/REQUIREMENTS.md`
- **상세 스펙**: `requirements/functional/`, `requirements/technical/`
- **추적성**: 각 요구사항 → 작업 → 완료 연결

### 작업 관리
- **실시간 추적**: `.claude/TASKS.md`
- **스프린트**: `tasks/current/sprint-*.md`
- **아카이브**: `tasks/completed/YYYY-MM.md`

### 개발 환경
- **로컬 설정**: `development/setup/`
- **Docker Compose**: 통합 개발 환경
- **자동화 스크립트**: `development/scripts/`

## 🔗 통합 연계

### .claude ↔ claude-workspace
```
.claude/REQUIREMENTS.md  ←→  claude-workspace/requirements/
.claude/TASKS.md        ←→  claude-workspace/tasks/
.claude/ARCHITECTURE.md ←→  claude-workspace/documentation/
.claude/COMMANDS.md     ←→  claude-workspace/development/scripts/
```

### 기존 구조와의 조화
- **management/**: 프로젝트 전체 관리 (유지)
- **standards/**: 코딩 표준 (유지)
- **operations/**: 인프라 및 배포 (유지)
- **새 구조**: 요구사항/작업 중심 관리 추가

## 📋 사용 예시

### 새 기능 개발 플로우
```bash
# 1. 요구사항 확인
cat .claude/REQUIREMENTS.md

# 2. 작업 할당 확인
cat .claude/TASKS.md

# 3. 스프린트 상세 확인
cat claude-workspace/tasks/current/sprint-2025-w04.md

# 4. 개발 환경 시작
cd claude-workspace/development/setup
docker-compose up -d

# 5. 구현 및 테스트
# ... 개발 진행 ...

# 6. 작업 완료 표시
# .claude/TASKS.md 업데이트
```

### 주요 명령어
- `npm run dev` - 개발 서버 시작
- `npm test` - 테스트 실행
- `npm run build` - 프로덕션 빌드
- 상세 명령어는 `.claude/COMMANDS.md` 참조

---

**Generated by Claude AI** - Last updated: $(date '+%Y-%m-%d %H:%M:%S')