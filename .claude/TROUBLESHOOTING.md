# Troubleshooting Guide - Park Golf Platform

## 🔧 일반적인 문제 해결 가이드

### 1. 서비스 시작 문제

#### 포트 충돌
```bash
# 문제: Error: listen EADDRINUSE :::3011
# 해결: 포트 사용 프로세스 확인 및 종료
lsof -i :3011
kill -9 <PID>

# 모든 개발 포트 확인
for port in 3000 3001 3002 3011 3012 3013 3014 3015 3016 3091 3092; do
  echo "Port $port:"
  lsof -i :$port
done
```

#### 환경 변수 누락
```bash
# 문제: Cannot connect to database
# 해결: 환경 변수 확인
echo $DATABASE_URL
echo $NATS_URL

# 환경 변수 로드
source claude-workspace/development/environments/.env.development
```

#### 의존성 문제
```bash
# 문제: Module not found
# 해결: 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 또는 캐시 초기화
npm ci
```

### 2. 데이터베이스 연결 문제

#### PostgreSQL 연결 실패
```bash
# 문제: connection refused
# 해결: 컨테이너 상태 확인
docker ps | grep postgres

# 컨테이너 재시작
docker-compose -f claude-workspace/development/docker/docker-compose.yml restart postgres

# 직접 연결 테스트
docker exec -it parkgolf-postgres psql -U parkgolf -d parkgolf
```

#### Prisma 마이그레이션 오류
```bash
# 문제: Migration failed
# 해결: 마이그레이션 상태 확인
npx prisma migrate status

# 마이그레이션 재시도
npx prisma migrate deploy

# 강제 초기화 (주의: 데이터 손실)
npx prisma migrate reset
```

#### 데이터베이스 스키마 불일치
```bash
# 문제: Table doesn't exist
# 해결: 스키마 푸시
npx prisma db push

# 스키마 재생성
npx prisma generate
```

### 3. NATS 통신 문제

#### NATS 서버 연결 실패
```bash
# 문제: Error connecting to NATS
# 해결: NATS 컨테이너 상태 확인
docker ps | grep nats

# NATS 로그 확인
docker logs parkgolf-nats

# NATS 재시작
docker-compose -f claude-workspace/development/docker/docker-compose.yml restart nats
```

#### 이벤트 발행/구독 오류
```bash
# 문제: Events not received
# 해결: NATS 클라이언트 설정 확인
# 1. NATS_URL 환경 변수 확인
echo $NATS_URL

# 2. 클라이언트 설정 확인 (NestJS)
# @Module에 ClientsModule 등록 확인
```

### 4. Redis 캐시 문제

#### Redis 연결 실패
```bash
# 문제: Redis connection failed
# 해결: Redis 컨테이너 확인
docker ps | grep redis

# Redis 상태 확인
docker exec -it parkgolf-redis redis-cli ping

# Redis 재시작
docker-compose -f claude-workspace/development/docker/docker-compose.yml restart redis
```

#### 캐시 데이터 문제
```bash
# 문제: Stale cache data
# 해결: 캐시 초기화
docker exec -it parkgolf-redis redis-cli FLUSHALL

# 특정 키 삭제
docker exec -it parkgolf-redis redis-cli DEL "key_name"
```

### 5. 프론트엔드 빌드 문제

#### TypeScript 오류
```bash
# 문제: Type errors in admin-dashboard
# 해결: 타입 체크 실행
npm run type-check

# 타입 정의 업데이트
npm run build

# 타입 정의 파일 재생성
rm -rf node_modules/@types
npm install
```

#### React 컴포넌트 오류
```bash
# 문제: Component not rendering
# 해결: 개발 서버 재시작
npm run dev

# 캐시 초기화
rm -rf .vite
npm run dev
```

#### 빌드 실패
```bash
# 문제: Build failed
# 해결: 빌드 로그 확인
npm run build 2>&1 | tee build.log

# 의존성 문제 해결
npm audit fix
```

### 6. API 통신 문제

#### CORS 오류
```bash
# 문제: CORS policy blocked
# 해결: 서버 CORS 설정 확인
# NestJS에서 app.enableCors() 확인

# 환경 변수 CORS_ORIGIN 확인
echo $CORS_ORIGIN
```

#### 401 인증 오류
```bash
# 문제: Unauthorized
# 해결: JWT 토큰 확인
# 1. 토큰 만료 확인
# 2. JWT_SECRET 환경 변수 확인
echo $JWT_SECRET

# 3. 토큰 디코딩 테스트
node -e "console.log(require('jsonwebtoken').decode('YOUR_TOKEN'))"
```

#### 404 Not Found
```bash
# 문제: API endpoint not found
# 해결: 라우터 설정 확인
# 1. 컨트롤러 등록 확인
# 2. 모듈 import 확인
# 3. 경로 매핑 확인

# API 문서 확인
open http://localhost:3091/api/docs
```

### 7. Docker 관련 문제

#### 컨테이너 시작 실패
```bash
# 문제: Container won't start
# 해결: 컨테이너 로그 확인
docker logs <container-name>

# 컨테이너 재빌드
docker-compose -f claude-workspace/development/docker/docker-compose.yml build --no-cache

# 볼륨 초기화
docker-compose -f claude-workspace/development/docker/docker-compose.yml down -v
```

#### 디스크 공간 부족
```bash
# 문제: No space left on device
# 해결: Docker 정리
docker system prune -a

# 사용하지 않는 볼륨 삭제
docker volume prune

# 사용하지 않는 이미지 삭제
docker image prune -a
```

### 8. 성능 문제

#### 느린 응답 시간
```bash
# 문제: API response too slow
# 해결: 성능 모니터링
# 1. 데이터베이스 쿼리 최적화
# 2. 캐시 활용
# 3. 인덱스 추가

# 쿼리 분석
npx prisma studio
```

#### 메모리 사용량 증가
```bash
# 문제: High memory usage
# 해결: 메모리 사용량 확인
docker stats

# Node.js 메모리 프로파일링
node --inspect services/auth-service/dist/main.js
```

### 9. 개발 환경 문제

#### 핫 리로드 작동 안함
```bash
# 문제: Hot reload not working
# 해결: 파일 감시 설정 확인
# 1. nodemon 설정 확인
# 2. 파일 시스템 한계 확인
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### 환경 변수 로드 안됨
```bash
# 문제: Environment variables not loaded
# 해결: 환경 변수 파일 확인
ls -la claude-workspace/development/environments/

# 환경 변수 수동 로드
export $(cat claude-workspace/development/environments/.env.development | xargs)
```

### 10. 긴급 복구 절차

#### 전체 환경 재설정
```bash
# 1. 모든 컨테이너 중지
docker-compose -f claude-workspace/development/docker/docker-compose.yml down -v

# 2. 의존성 재설치
find services -name "node_modules" -exec rm -rf {} +
find services -name "package-lock.json" -exec rm -f {} +

# 3. 환경 재구성
docker-compose -f claude-workspace/development/docker/docker-compose.yml up -d

# 4. 데이터베이스 재설정
cd services/auth-service
npx prisma migrate reset
```

### 11. 로그 분석 팁

#### 로그 레벨별 필터링
```bash
# 에러 로그만 확인
grep "ERROR" services/auth-service/auth-service.log

# 특정 시간대 로그 확인
grep "2025-01-11 14:" services/auth-service/auth-service.log
```

#### 실시간 로그 모니터링
```bash
# 여러 서비스 로그 동시 확인
tail -f services/*/logs/*.log

# Docker 로그 실시간 확인
docker-compose -f claude-workspace/development/docker/docker-compose.yml logs -f
```

---

**이 가이드로 대부분의 개발 문제를 빠르게 해결할 수 있습니다! 🔧**