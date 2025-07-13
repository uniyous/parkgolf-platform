# Park Golf Platform - Development Tools & Scripts

## 📋 개요

이 디렉토리는 Park Golf Platform 모노레포 개발을 위한 도구와 스크립트를 포함합니다.

## 📁 디렉토리 구조

```
.devtools/
├── scripts/
│   ├── development/           # 개발 환경 스크립트
│   │   ├── start-infrastructure.sh    # 인프라 서비스 시작
│   │   ├── start-dev.sh              # 개발 서버 시작
│   │   └── stop-dev.sh               # 개발 서버 중지
│   ├── deployment/            # 배포 스크립트
│   │   └── deploy-service.sh         # 서비스 배포
│   └── setup/                 # 설정 스크립트
│       └── init-project.sh           # 프로젝트 초기화
└── docs/                      # 개발 문서
    ├── ADMIN_MANAGEMENT_SYSTEM.md    # 관리자 시스템 문서
    └── MIGRATION_HISTORY.md          # 마이그레이션 이력
```

**Note**: 설정 파일들은 `shared/configs/`로 이동되었습니다.

## 🚀 주요 스크립트

### 개발 환경 시작

#### 1. 인프라 서비스 시작
```bash
./scripts/development/start-infrastructure.sh
```
다음 서비스들을 시작합니다:
- PostgreSQL (5432)
- Redis (6379)
- NATS (4222)
- Elasticsearch (9200) - 선택적

#### 2. 모든 마이크로서비스 시작
```bash
./scripts/development/start-all-services.sh
```
모든 서비스를 병렬로 시작합니다. 각 서비스는 별도의 터미널 탭에서 실행됩니다.

#### 3. 개별 서비스 시작
```bash
./scripts/development/start-service.sh [service-name]

# 예시
./scripts/development/start-service.sh admin-api
./scripts/development/start-service.sh admin-dashboard
```

### 빌드 스크립트

#### 1. 모든 서비스 빌드
```bash
./scripts/build/build-all.sh
```

#### 2. 개별 서비스 빌드
```bash
./scripts/build/build-service.sh [service-name]

# 예시
./scripts/build/build-service.sh auth-service
```

#### 3. Docker 이미지 빌드
```bash
./scripts/build/build-docker.sh [service-name] [tag]

# 예시
./scripts/build/build-docker.sh admin-api v1.0.0
```

### 테스트 스크립트

#### 1. 모든 서비스 테스트
```bash
./scripts/test/test-all.sh
```

#### 2. 개별 서비스 테스트
```bash
./scripts/test/test-service.sh [service-name]

# 예시
./scripts/test/test-service.sh course-service
```

#### 3. E2E 테스트
```bash
./scripts/test/e2e-test.sh
```

## 🛠️ 유틸리티 스크립트

### 의존성 관리
```bash
# 모든 서비스 의존성 설치
./scripts/utils/install-all-deps.sh

# 의존성 업데이트 체크
./scripts/utils/check-updates.sh

# 취약점 스캔
./scripts/utils/security-audit.sh
```

### 데이터베이스 관리
```bash
# 모든 서비스 마이그레이션 실행
./scripts/db/migrate-all.sh

# 시드 데이터 생성
./scripts/db/seed-all.sh

# 데이터베이스 리셋
./scripts/db/reset-all.sh
```

### 로그 관리
```bash
# 모든 서비스 로그 보기
./scripts/logs/tail-all.sh

# 특정 서비스 로그 보기
./scripts/logs/tail-service.sh [service-name]

# 로그 파일 정리
./scripts/logs/clean-logs.sh
```

## 🔧 환경 설정

### 필수 도구
- Node.js 18.x 이상
- Docker & Docker Compose
- PostgreSQL Client
- Redis Client
- NATS CLI (선택적)

### 환경 변수 설정
```bash
# 루트 디렉토리의 .env.development 복사
cp ../.env.development.example ../.env.development

# 각 서비스별 환경 변수 설정
./scripts/setup/init-env.sh
```

## 📝 개발 가이드라인

### 새 서비스 추가하기
1. `services/` 디렉토리에 새 서비스 폴더 생성
2. 표준 구조에 따라 프로젝트 설정
3. 포트 번호 할당 (3000번대 사용)
4. CI/CD workflow 추가
5. 문서 업데이트

### 스크립트 작성 규칙
- Bash 스크립트 사용 (#!/bin/bash)
- 에러 처리 포함 (set -e)
- 로깅 기능 포함
- 도움말 옵션 제공 (-h, --help)
- 색상 출력으로 가독성 향상

### 디버깅 팁
```bash
# 디버그 모드로 스크립트 실행
DEBUG=true ./scripts/development/start-service.sh admin-api

# 상세 로그 활성화
VERBOSE=true ./scripts/build/build-all.sh
```

## 🐛 문제 해결

### 포트 충돌
```bash
# 사용 중인 포트 확인
./scripts/utils/check-ports.sh

# 모든 서비스 중지
./scripts/development/stop-all.sh
```

### 의존성 문제
```bash
# 캐시 정리 및 재설치
./scripts/utils/clean-install.sh
```

### 데이터베이스 연결 문제
```bash
# 데이터베이스 상태 확인
./scripts/db/check-connection.sh

# 데이터베이스 재시작
docker-compose -f docker/docker-compose.dev.yml restart postgres
```

## 📚 추가 리소스

- [Docker 개발 환경 가이드](./docker/README.md)
- [CI/CD 파이프라인 문서](../.github/workflows/README.md)
- [모노레포 베스트 프랙티스](../docs/MONOREPO.md)

---

Last updated: 2024-07-06