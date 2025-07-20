# Common Development Tasks

## 🚀 자주 하는 작업들 (Claude 빠른 참조)

### 1. 개발 환경 설정

#### 인프라 시작
```bash
# 모든 인프라 서비스 시작
docker-compose -f claude-workspace/development/docker/docker-compose.yml up -d

# 상태 확인
docker-compose -f claude-workspace/development/docker/docker-compose.yml ps

# 로그 확인
docker-compose -f claude-workspace/development/docker/docker-compose.yml logs -f postgres
```

#### 서비스 시작
```bash
# 모든 서비스 시작 (tmux 사용)
claude-workspace/development/scripts/start-all-services.sh

# 개별 서비스 시작
cd services/auth-service
npm install
npm run start:dev

# 특정 서비스만 시작
claude-workspace/development/scripts/start-service.sh auth-service
```

### 2. 새 서비스 추가

#### 템플릿 사용
```bash
# NestJS 서비스 템플릿 확인
cat claude-workspace/development/templates/nestjs-service.template

# React 프론트엔드 템플릿 확인
cat claude-workspace/development/templates/react-frontend.template
```

#### 설정 업데이트
```bash
# 서비스 목록에 추가
vim claude-workspace/shared/configs/project/services.json

# 환경 변수 추가
vim claude-workspace/development/environments/.env.development
```

### 3. 데이터베이스 작업

#### Prisma 마이그레이션
```bash
cd services/auth-service
npx prisma migrate dev
npx prisma db push
npx prisma studio
```

#### 다중 데이터베이스 초기화
```bash
# PostgreSQL 다중 DB 생성
docker-compose -f claude-workspace/development/docker/docker-compose.yml exec postgres psql -U parkgolf -d parkgolf -c "SELECT datname FROM pg_database;"
```

### 4. 테스트 실행

#### 단일 서비스 테스트
```bash
cd services/auth-service
npm test
npm run test:watch
npm run test:cov
```

#### 통합 테스트
```bash
# 공통 Jest 설정 사용
cp claude-workspace/testing/jest.config.shared.js services/auth-service/jest.config.js
```

### 5. API 문서 확인

#### Swagger 접속
```bash
# 각 서비스 API 문서
open http://localhost:3091/api/docs  # Admin API
open http://localhost:3092/api/docs  # User API
```

#### 스키마 확인
```bash
# API 스키마
cat claude-workspace/shared/schemas/api/common.yaml

# 데이터베이스 스키마
find services/ -name "schema.prisma" | head -5
```

### 6. 코드 품질 관리

#### Linting
```bash
# ESLint 설정 확인
cat claude-workspace/shared/configs/eslint/eslint.config.backend.js

# 서비스별 lint 실행
cd services/auth-service
npm run lint
npm run lint:fix
```

#### 포맷팅
```bash
# Prettier 설정 확인
cat claude-workspace/shared/configs/prettier/

# 전체 프로젝트 포맷팅
npx prettier --write "services/**/*.{ts,tsx,js,jsx}"
```

### 7. 모니터링 & 디버깅

#### 헬스체크
```bash
# 서비스 헬스체크
curl http://localhost:3011/health
curl http://localhost:3012/health

# 헬스체크 설정 확인
cat claude-workspace/operations/monitoring/health-check.template
```

#### 로그 확인
```bash
# 서비스 로그
tail -f services/auth-service/auth-service.log

# Docker 로그
docker-compose -f claude-workspace/development/docker/docker-compose.yml logs -f nats
```

### 8. 배포 준비

#### 빌드 테스트
```bash
# 개별 서비스 빌드
cd services/auth-service
npm run build

# 모든 서비스 빌드
claude-workspace/development/scripts/build-all-services.sh
```

#### 환경 설정 확인
```bash
# 개발 환경 변수
cat claude-workspace/development/environments/.env.development

# 프로덕션 템플릿
cat claude-workspace/development/environments/.env.production.template
```

### 9. 문제 해결

#### 포트 충돌 해결
```bash
# 포트 사용 확인
lsof -i :3011
lsof -i :5432

# 프로세스 종료
kill -9 <PID>
```

#### Docker 컨테이너 재시작
```bash
# 특정 서비스 재시작
docker-compose -f claude-workspace/development/docker/docker-compose.yml restart postgres

# 모든 서비스 재시작
docker-compose -f claude-workspace/development/docker/docker-compose.yml down
docker-compose -f claude-workspace/development/docker/docker-compose.yml up -d
```

#### 캐시 초기화
```bash
# Node.js 캐시 초기화
rm -rf services/*/node_modules
rm -rf services/*/dist

# Redis 캐시 초기화
docker-compose -f claude-workspace/development/docker/docker-compose.yml exec redis redis-cli FLUSHALL
```

### 10. 유용한 단축키

#### 빠른 네비게이션
```bash
# 프로젝트 루트로 이동
cd /Users/sungyoo/git/uniyous/parkgolf

# 자주 사용하는 폴더들
cd claude-workspace/quick-start/     # 빠른 참조
cd claude-workspace/shared/configs/  # 설정 파일
cd claude-workspace/development/     # 개발 도구
cd services/                         # 서비스 폴더
cd docs/                            # 문서
```

#### 유용한 aliases (zsh/bash)
```bash
# .zshrc 또는 .bashrc에 추가
alias pgolf="cd /Users/sungyoo/git/uniyous/parkgolf"
alias pgws="cd /Users/sungyoo/git/uniyous/parkgolf/claude-workspace"
alias pgserv="cd /Users/sungyoo/git/uniyous/parkgolf/services"
alias pgdocs="cd /Users/sungyoo/git/uniyous/parkgolf/docs"
```

---

**이 작업들로 대부분의 개발 업무를 처리할 수 있습니다! 🛠️**