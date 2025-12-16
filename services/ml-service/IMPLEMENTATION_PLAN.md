# parkgolf-ml-mcp 구현 계획

## 📋 현재 상태
- **구조**: 디렉토리와 설정 파일만 존재
- **구현**: 소스 코드 전무
- **의존성**: package.json과 requirements.txt 정의됨

## 🎯 구현 목표
MSA 아키텍처의 핵심 AI/ML 서비스로서:
1. 사용자 맞춤 골프장 추천
2. 예약 패턴 예측 및 최적화
3. 플레이어 성과 분석
4. 실시간 컨텍스트 관리

## 🏗️ 구현 순서

### Phase 1: 기본 구조 (1-2일)
```
1. ML Services 기본 구조
   ├── ml-services/index.js (엔트리 포인트)
   ├── ml-services/app.js (Express 앱)
   ├── ml-services/config/ (설정)
   └── ml-services/utils/ (유틸리티)

2. MCP Services 기본 구조  
   ├── mcp-services/index.js (엔트리 포인트)
   ├── mcp-services/app.js (Express 앱)
   ├── mcp-services/proto/ (gRPC 정의)
   └── mcp-services/config/ (설정)

3. 공통 모듈
   ├── shared/config/database.js
   ├── shared/config/nats.js
   └── shared/types/index.ts
```

### Phase 2: ML 핵심 기능 (3-4일)
```
1. Recommendation Engine
   ├── recommendation/controller.js
   ├── recommendation/service.js
   ├── recommendation/model.js
   └── recommendation/collaborative-filter.js

2. Prediction Service
   ├── prediction/controller.js
   ├── prediction/service.js
   ├── prediction/booking-predictor.js
   └── prediction/demand-forecaster.js

3. Analytics Service
   ├── analytics/controller.js
   ├── analytics/service.js
   ├── analytics/player-analyzer.js
   └── analytics/course-analyzer.js
```

### Phase 3: MCP 구현 (2-3일)
```
1. Context Manager
   ├── context-manager/service.js
   ├── context-manager/store.js
   └── context-manager/session.js

2. Model Gateway
   ├── model-gateway/router.js
   ├── model-gateway/registry.js
   └── model-gateway/versioning.js

3. Protocol Adapter
   ├── protocol-adapter/grpc-server.js
   ├── protocol-adapter/http-adapter.js
   └── protocol-adapter/nats-adapter.js
```

### Phase 4: 통합 (1-2일)
```
1. NATS 통합
   - ML/MCP 서비스 큐 설정
   - 이벤트 구독/발행
   - 다른 서비스와 통신

2. Docker 설정
   - Dockerfile 작성
   - docker-compose 업데이트
   - 환경 변수 설정

3. API 문서화
   - Swagger/OpenAPI 스펙
   - gRPC proto 문서
   - 사용 가이드
```

## 🔑 핵심 API 엔드포인트

### ML Service API
```
POST /api/ml/recommend
  - 사용자 맞춤 코스 추천
  - Input: userId, preferences, location
  - Output: recommended courses[]

POST /api/ml/predict/booking
  - 예약 가능성 예측
  - Input: courseId, date, time, userId
  - Output: probability, alternatives[]

GET /api/ml/analytics/player/:id
  - 플레이어 분석
  - Output: stats, trends, insights

GET /api/ml/analytics/course/:id
  - 코스 분석
  - Output: utilization, popular times, weather impact
```

### MCP Service API
```
POST /api/mcp/context
  - 컨텍스트 생성/업데이트
  - Input: sessionId, data
  - Output: contextId

GET /api/mcp/context/:id
  - 컨텍스트 조회
  - Output: context data

POST /api/mcp/model/invoke
  - 모델 실행
  - Input: modelId, version, context
  - Output: model results
```

## 🔗 서비스 통합 포인트

### NATS 메시지 패턴
```javascript
// 구독할 이벤트
- 'booking.created' → 패턴 학습
- 'booking.completed' → 성과 분석
- 'user.preferences.updated' → 추천 업데이트

// 발행할 이벤트
- 'ml.recommendation.ready'
- 'ml.prediction.completed'
- 'ml.analytics.updated'
```

### 데이터 동기화
```javascript
// 필요한 데이터
- User profiles (auth-service)
- Course details (course-service)
- Booking history (booking-service)
- Weather data (external API)
```

## 🚀 빠른 시작 명령어
```bash
# ML-MCP 개발 시작
cd parkgolf-ml-mcp

# 의존성 설치
npm run install:all

# 개발 서버 실행
npm run start:ml    # ML 서비스 (4000)
npm run start:mcp   # MCP 서비스 (4001)

# Docker 실행
docker-compose up -d
```

## 📝 다음 작업
1. `ml-services/index.js` 생성 및 기본 서버 구현
2. `mcp-services/index.js` 생성 및 gRPC 서버 구현
3. NATS 연결 설정
4. 첫 번째 추천 API 구현