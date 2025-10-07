# Park Golf Platform - System Architecture

## 📋 Table of Contents
1. [Overview](#overview)
2. [System Architecture Diagram](#system-architecture-diagram)
3. [Service Architecture](#service-architecture)
4. [Technology Stack](#technology-stack)
5. [Service Details](#service-details)
6. [Communication Patterns](#communication-patterns)
7. [Database Architecture](#database-architecture)
8. [Security Architecture](#security-architecture)
9. [Deployment Architecture](#deployment-architecture)
10. [Development Guidelines](#development-guidelines)

## Overview

Park Golf Platform은 골프장 예약 및 관리를 위한 통합 플랫폼으로, 마이크로서비스 아키텍처(MSA)를 기반으로 구축되었습니다. 본 시스템은 사용자 친화적인 예약 시스템과 강력한 관리자 도구를 제공하며, 확장 가능하고 유지보수가 용이한 구조로 설계되었습니다.

### 🎯 Core Design Principles
- **Microservices Architecture**: 도메인별 독립적인 서비스 분리
- **Backend for Frontend (BFF)**: 프론트엔드별 최적화된 API 게이트웨이
- **Event-Driven Architecture**: NATS 기반 비동기 메시징
- **Domain-Driven Design**: 비즈니스 도메인 중심 설계
- **Cloud-Native**: 컨테이너 기반 배포 및 확장

### 📊 Project Status
- **Current Phase**: MVP Development
- **Completion**: 70% (as of 2025-01-15)
- **Target Release**: 2025-02-15

## System Architecture Diagram

### High-Level Architecture
```mermaid
graph TB
    subgraph "Client Layer"
        AD[Admin Dashboard<br/>React 19 + Redux<br/>:3000]
        UW[User WebApp<br/>React 19<br/>:3001]
        MA[Mobile App<br/>React Native<br/>Future]
    end

    subgraph "API Gateway Layer (BFF)"
        AAPI[Admin API<br/>NestJS<br/>:3091]
        UAPI[User API<br/>NestJS<br/>:3092]
    end

    subgraph "Microservices Layer"
        AUTH[Auth Service<br/>NestJS<br/>:3011]
        COURSE[Course Service<br/>NestJS<br/>NATS Only]
        BOOK[Booking Service<br/>NestJS<br/>:3013]
        NOTIFY[Notify Service<br/>NestJS<br/>:3014]
        SEARCH[Search Service<br/>NestJS<br/>:3015]
        ML[ML Service<br/>Express<br/>:4000]
    end

    subgraph "Message Bus"
        NATS[NATS JetStream<br/>:4222]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>:5432)]
        REDIS[(Redis<br/>:6379)]
        ES[(Elasticsearch<br/>:9200)]
        MONGO[(MongoDB<br/>:27017)]
    end

    %% Client to BFF connections
    AD --> AAPI
    UW --> UAPI
    MA -.-> UAPI

    %% BFF to Services connections
    AAPI --> AUTH
    AAPI --> COURSE
    AAPI --> BOOK
    AAPI --> NOTIFY
    AAPI --> SEARCH
    
    UAPI --> AUTH
    UAPI --> COURSE
    UAPI --> BOOK
    UAPI --> SEARCH

    %% Service to NATS connections
    AUTH <--> NATS
    COURSE <--> NATS
    BOOK <--> NATS
    NOTIFY <--> NATS
    SEARCH <--> NATS
    ML <--> NATS

    %% Service to Database connections
    AUTH --> PG
    COURSE --> PG
    BOOK --> PG
    NOTIFY --> PG
    SEARCH --> ES
    ML --> MONGO

    %% Cache connections
    AAPI --> REDIS
    UAPI --> REDIS
    AUTH --> REDIS

    classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef bff fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef data fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef message fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef future fill:#f5f5f5,stroke:#616161,stroke-width:1px,stroke-dasharray: 5 5

    class AD,UW frontend
    class AAPI,UAPI bff
    class AUTH,COURSE,BOOK,NOTIFY,SEARCH,ML service
    class PG,REDIS,ES,MONGO data
    class NATS message
    class MA future
```

### Service Communication Flow
```mermaid
sequenceDiagram
    participant U as User
    participant UW as User WebApp
    participant UAPI as User API
    participant NATS as NATS
    participant AUTH as Auth Service
    participant COURSE as Course Service
    participant BOOK as Booking Service
    participant NOTIFY as Notify Service

    U->>UW: 예약 요청
    UW->>UAPI: POST /api/bookings
    UAPI->>AUTH: 토큰 검증 (NATS)
    AUTH-->>UAPI: 사용자 정보
    UAPI->>COURSE: 타임슬롯 확인 (NATS)
    COURSE-->>UAPI: 가용성 정보
    UAPI->>BOOK: 예약 생성 (NATS)
    BOOK->>NATS: booking.created 이벤트
    BOOK-->>UAPI: 예약 확인
    NATS->>NOTIFY: 알림 발송
    NATS->>COURSE: 타임슬롯 업데이트
    UAPI-->>UW: 예약 완료
    UW-->>U: 예약 확인 화면
    NOTIFY->>U: 이메일/SMS 알림
```

## Service Architecture

### 🏗️ Architecture Layers

| Layer | Purpose | Technologies | Services |
|-------|---------|--------------|----------|
| **Presentation** | User Interface | React 19, Redux, Vite | Admin Dashboard, User WebApp |
| **API Gateway** | Backend for Frontend | NestJS, GraphQL (planned) | Admin API, User API |
| **Business Logic** | Core Services | NestJS, Express | Auth, Course, Booking, Notify |
| **Data Processing** | Search & Analytics | NestJS, Python | Search, ML Service |
| **Data Storage** | Persistence | PostgreSQL, Redis, Elasticsearch | Multiple DBs |
| **Infrastructure** | Messaging & Orchestration | NATS, Docker, Kubernetes | Message Bus, Container |

### 🔄 Service Dependencies

```mermaid
graph LR
    subgraph "Core Services"
        AUTH[Auth Service]
        COURSE[Course Service]
        BOOK[Booking Service]
    end

    subgraph "Support Services"
        NOTIFY[Notify Service]
        SEARCH[Search Service]
        ML[ML Service]
    end

    BOOK --> AUTH
    BOOK --> COURSE
    BOOK --> NOTIFY
    COURSE --> SEARCH
    BOOK --> ML
    AUTH --> NOTIFY

    style AUTH fill:#ffebee
    style COURSE fill:#e3f2fd
    style BOOK fill:#f3e5f5
    style NOTIFY fill:#e8f5e9
    style SEARCH fill:#fff3e0
    style ML fill:#fce4ec
```

## Technology Stack

### Frontend Technologies
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Framework** | React | 19.0 | UI Library |
| **State Management** | Redux Toolkit | 2.x | Admin Dashboard State |
| **Build Tool** | Vite | 6.x | Fast HMR & Building |
| **Language** | TypeScript | 5.x | Type Safety |
| **Styling** | CSS Modules | - | Component Styling |
| **UI Library** | Ant Design | 5.x | Component Library |
| **HTTP Client** | Axios | 1.x | API Communication |

### Backend Technologies
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Framework** | NestJS | 10.x | Main Backend Framework |
| **Runtime** | Node.js | 20.x | JavaScript Runtime |
| **Language** | TypeScript | 5.x | Type Safety |
| **ORM** | Prisma | 5.x | Database ORM |
| **Validation** | class-validator | 0.14.x | DTO Validation |
| **Authentication** | Passport.js | 0.7.x | Auth Strategies |
| **Documentation** | Swagger | 7.x | API Documentation |

### Infrastructure Technologies
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Database** | PostgreSQL | 15 | Primary Database |
| **Cache** | Redis | 7.x | Session & Cache |
| **Message Broker** | NATS | 2.x | Event Streaming |
| **Search Engine** | Elasticsearch | 8.x | Full-text Search |
| **Container** | Docker | 24.x | Containerization |
| **Orchestration** | Kubernetes | 1.28 | Container Orchestration |
| **Cloud** | Google Cloud | - | Cloud Platform |

## Service Details

### 1. Frontend Services

#### Admin Dashboard (:3000) ✅
```typescript
// Tech Stack
- Framework: React 19 + TypeScript
- State: Redux Toolkit + RTK Query
- Routing: React Router v6
- UI: Ant Design + Custom Components
- Build: Vite 6

// Features
- 관리자 인증 및 권한 관리
- 골프장/코스 관리
- 예약 관리 및 모니터링
- 사용자 관리
- 통계 대시보드
- 실시간 알림
```

#### User WebApp (:3001) 🚧
```typescript
// Tech Stack
- Framework: React 19 + TypeScript
- State: Context API + Local Storage
- Routing: React Router v6
- UI: Custom Components
- Build: Vite 6

// Features
- 사용자 회원가입/로그인
- 골프장 검색 및 조회
- 예약 생성/수정/취소
- 결제 시스템 연동
- 예약 히스토리
- 프로필 관리
```

### 2. BFF Services (Backend for Frontend)

#### Admin API (:3091) ✅
```typescript
// Purpose: 관리자 대시보드 전용 API Gateway

// Responsibilities
- 다중 마이크로서비스 통합
- 관리자 권한 검증 (RBAC)
- 데이터 aggregation
- Response formatting
- Error handling

// Connected Services
- Auth Service (인증/인가)
- Course Service (골프장 데이터)
- Booking Service (예약 관리)
- Notify Service (알림 발송)
- Search Service (검색)
- ML Service (분석)
```

#### User API (:3092) 🚧
```typescript
// Purpose: 사용자 웹앱 전용 API Gateway

// Responsibilities
- 사용자 중심 API 제공
- 토큰 관리
- 캐싱 전략
- Rate limiting
- Response optimization

// Connected Services
- Auth Service (인증)
- Course Service (골프장 조회)
- Booking Service (예약)
- Search Service (검색)
- Notify Service (알림)
```

### 3. Core Microservices

#### Auth Service (:3011) ✅
```typescript
// Database: PostgreSQL (auth_db)
// Communication: NATS + HTTP

// Core Features
- JWT 토큰 발급/검증 (Access + Refresh)
- 사용자 인증 (일반/관리자)
- RBAC 권한 시스템 (40+ permissions)
- 계층적 역할 관리
- 비밀번호 암호화 (bcrypt)
- 로그인 히스토리
- 세션 관리

// Message Patterns
- auth.login
- auth.validate
- auth.refresh
- users.create/list/update/delete
- auth.admin.*
- auth.permission.*
```

#### Course Service (NATS only) ✅
```typescript
// Database: PostgreSQL (course_db)
// Communication: NATS only

// Core Features
- 골프장 회사 관리
- 코스 정보 관리 (18홀/9홀)
- 홀별 상세 정보
- 타임슬롯 관리
- 주간 스케줄 생성
- 시설 정보 관리
- 가격 정책

// Message Patterns
- companies.*
- courses.*
- holes.*
- timeSlots.*
- facilities.*
```

#### Booking Service (:3013) ✅
```typescript
// Database: PostgreSQL (booking_db)
// Communication: NATS + HTTP

// Core Features
- 예약 생성/수정/취소
- 9홀/18홀 복잡 예약 로직
- 타임슬롯 가용성 체크
- 결제 정보 관리
- 예약 상태 관리
- 취소 정책 적용
- 예약 히스토리

// Event Publishing
- booking.created
- booking.updated
- booking.cancelled
- payment.processed
```

#### Notify Service (:3014) ✅
```typescript
// Database: PostgreSQL (notify_db)
// Communication: NATS + HTTP

// Core Features
- 이메일 발송 (SendGrid)
- SMS 발송 (Twilio)
- 푸시 알림 (FCM)
- 템플릿 관리
- 발송 스케줄링
- 발송 히스토리
- 다국어 지원

// Event Subscriptions
- booking.created → 예약 확인 알림
- booking.cancelled → 취소 알림
- user.registered → 환영 이메일
- payment.processed → 결제 확인
```

### 4. Advanced Services

#### Search Service (:3015) 🚧
```typescript
// Database: Elasticsearch
// Communication: NATS + HTTP

// Planned Features
- 골프장 전문 검색
- 위치 기반 검색
- 가용 타임슬롯 검색
- 자동완성
- 필터링 및 정렬
- 검색 히스토리
- 인기 검색어

// Status: Basic structure only
```

#### ML Service (:4000) 🚧
```typescript
// Database: MongoDB
// Communication: NATS + HTTP
// Stack: Express.js (different from others)

// Planned Features
- 수요 예측
- 가격 최적화
- 사용자 추천
- 이상 탐지
- 예약 패턴 분석
- 시즌별 트렌드

// Status: Infrastructure only
```

## Communication Patterns

### 1. Synchronous Communication (HTTP/REST)
```yaml
Pattern: Request-Response
Use Cases:
  - Frontend → BFF communication
  - Direct service queries
  - Real-time data retrieval
  
Example Flow:
  User WebApp → User API → Microservice → Response
```

### 2. Asynchronous Communication (NATS)
```yaml
Pattern: Publish-Subscribe / Request-Reply
Use Cases:
  - Service-to-service communication
  - Event broadcasting
  - Background processing
  
Event Examples:
  - booking.created
  - user.registered
  - payment.processed
  - timeslot.updated
```

### 3. Communication Matrix

| From ↓ To → | Auth | Course | Booking | Notify | Search | ML |
|-------------|------|--------|---------|--------|--------|-----|
| **Auth** | - | - | - | Pub | - | - |
| **Course** | - | - | - | - | Pub | - |
| **Booking** | Req | Req | - | Pub | - | Pub |
| **Notify** | Sub | Sub | Sub | - | - | - |
| **Search** | - | Sub | Sub | - | - | - |
| **ML** | - | Sub | Sub | - | - | - |

*Req: Request, Pub: Publish, Sub: Subscribe*

## Database Architecture

### 1. Database Distribution
```mermaid
graph TD
    subgraph "PostgreSQL Cluster :5432"
        AUTH_DB[(auth_db<br/>Users, Admins, Roles)]
        COURSE_DB[(course_db<br/>Companies, Courses, TimeSlots)]
        BOOKING_DB[(booking_db<br/>Bookings, Payments)]
        NOTIFY_DB[(notify_db<br/>Templates, Logs)]
    end

    subgraph "NoSQL Databases"
        REDIS[(Redis :6379<br/>Cache, Sessions)]
        ES[(Elasticsearch :9200<br/>Search Index)]
        MONGO[(MongoDB :27017<br/>ML Data)]
    end

    AUTH[Auth Service] --> AUTH_DB
    COURSE[Course Service] --> COURSE_DB
    BOOK[Booking Service] --> BOOKING_DB
    NOTIFY[Notify Service] --> NOTIFY_DB
    
    AUTH --> REDIS
    SEARCH[Search Service] --> ES
    ML[ML Service] --> MONGO
```

### 2. Data Synchronization Strategy
- **Event Sourcing**: All state changes emit events
- **CQRS Pattern**: Separate read and write models
- **Cache Strategy**: Redis for frequently accessed data
- **Data Consistency**: Eventual consistency via events

## Security Architecture

### 1. Authentication & Authorization
```mermaid
graph LR
    subgraph "Authentication Flow"
        A[User] --> B[Login]
        B --> C[Auth Service]
        C --> D[JWT Generation]
        D --> E[Access Token<br/>15 min]
        D --> F[Refresh Token<br/>7 days]
    end

    subgraph "Authorization"
        G[Request] --> H[Token Validation]
        H --> I[Permission Check]
        I --> J[RBAC]
        J --> K[Allow/Deny]
    end
```

### 2. Security Layers
| Layer | Security Measures |
|-------|------------------|
| **Network** | HTTPS, TLS 1.3, Firewall rules |
| **Application** | JWT tokens, CORS, Rate limiting |
| **API** | API keys, OAuth 2.0 (planned) |
| **Database** | Encrypted connections, Row-level security |
| **Infrastructure** | Secrets management, Network isolation |

### 3. RBAC Permission System
```typescript
// Role Hierarchy
PLATFORM_ADMIN
  └── COMPANY_ADMIN
      └── COURSE_MANAGER
          └── STAFF
              └── USER

// Permission Categories (40+ permissions)
- User Management (users.*)
- Course Management (courses.*)
- Booking Management (bookings.*)
- Payment Processing (payments.*)
- System Administration (system.*)
```

## Deployment Architecture

### 1. Container Strategy
```yaml
Build Strategy:
  - Multi-stage Docker builds
  - Alpine Linux base images
  - Layer caching optimization
  - Security scanning

Image Registry:
  - Google Container Registry
  - Versioned tags
  - Automated builds
```

### 2. Kubernetes Deployment
```mermaid
graph TD
    subgraph "Kubernetes Cluster"
        subgraph "Namespace: parkgolf-prod"
            subgraph "Frontend Pods"
                AD[Admin Dashboard<br/>Replicas: 2]
                UW[User WebApp<br/>Replicas: 3]
            end
            
            subgraph "BFF Pods"
                AAPI[Admin API<br/>Replicas: 2]
                UAPI[User API<br/>Replicas: 3]
            end
            
            subgraph "Service Pods"
                AUTH[Auth Service<br/>Replicas: 2]
                COURSE[Course Service<br/>Replicas: 2]
                BOOK[Booking Service<br/>Replicas: 3]
                NOTIFY[Notify Service<br/>Replicas: 2]
            end
        end
        
        subgraph "Ingress"
            ING[Nginx Ingress<br/>SSL Termination]
        end
        
        subgraph "ConfigMaps & Secrets"
            CM[ConfigMaps]
            SEC[Secrets]
        end
    end
    
    ING --> AD
    ING --> UW
    ING --> AAPI
    ING --> UAPI
```

### 3. CI/CD Pipeline
```mermaid
graph LR
    A[Git Push] --> B[GitHub Actions]
    B --> C{Branch?}
    C -->|main| D[Build & Test]
    C -->|develop| E[Build & Test]
    D --> F[Docker Build]
    E --> G[Docker Build]
    F --> H[Push to GCR]
    G --> I[Push to GCR]
    H --> J[Deploy to Prod]
    I --> K[Deploy to Staging]
```

### 4. Environment Configuration
| Environment | Purpose | Infrastructure | Features |
|------------|---------|---------------|----------|
| **Local** | Development | Docker Compose | Hot reload, Debug mode |
| **Development** | Integration testing | GKE Dev Cluster | Full services, Test data |
| **Staging** | Pre-production | GKE Staging | Production-like, Testing |
| **Production** | Live system | GKE Prod Cluster | HA, Auto-scaling, Monitoring |

## Development Guidelines

### 1. Code Organization
```
services/
├── [service-name]/
│   ├── src/
│   │   ├── modules/       # Feature modules
│   │   ├── common/        # Shared utilities
│   │   ├── config/        # Configuration
│   │   └── main.ts        # Entry point
│   ├── prisma/           # Database schema
│   ├── test/             # Tests
│   └── package.json
```

### 2. Development Workflow
```bash
# 1. Start infrastructure
docker-compose -f .claude/docker/docker-compose.yml up -d

# 2. Start services
.claude/scripts/start-all-services.sh

# 3. Development
npm run start:dev  # Hot reload enabled

# 4. Testing
npm test          # Unit tests
npm run test:e2e  # Integration tests

# 5. Build
npm run build     # Production build
```

### 3. Best Practices
- **Code Style**: ESLint + Prettier configured
- **Type Safety**: TypeScript strict mode
- **Testing**: Minimum 80% coverage
- **Documentation**: Swagger for all APIs
- **Version Control**: Conventional commits
- **Error Handling**: Centralized error handling
- **Logging**: Structured logging with context
- **Monitoring**: Health checks for all services

### 4. Performance Optimization
- **Database**: Indexed queries, connection pooling
- **Caching**: Redis for hot data
- **API**: Pagination, field filtering
- **Frontend**: Code splitting, lazy loading
- **Build**: Tree shaking, minification

## Monitoring & Observability

### 1. Monitoring Stack (Planned)
```mermaid
graph LR
    A[Services] --> B[Metrics]
    A --> C[Logs]
    A --> D[Traces]
    
    B --> E[Prometheus]
    C --> F[Loki]
    D --> G[Jaeger]
    
    E --> H[Grafana]
    F --> H
    G --> H
    
    H --> I[Dashboards]
    H --> J[Alerts]
```

### 2. Key Metrics
- **Application**: Request rate, error rate, latency
- **Business**: Bookings/day, conversion rate, revenue
- **Infrastructure**: CPU, memory, disk, network
- **Database**: Query performance, connection pool

## Future Roadmap

### Phase 1: MVP Completion (Q1 2025)
- [ ] Complete User API NATS integration
- [ ] Implement booking flow in User WebApp
- [ ] Integrate payment gateway
- [ ] Basic search functionality

### Phase 2: Enhancement (Q2 2025)
- [ ] Mobile app development
- [ ] Advanced search with Elasticsearch
- [ ] ML-based recommendations
- [ ] Multi-language support

### Phase 3: Scale (Q3 2025)
- [ ] GraphQL API layer
- [ ] Real-time features (WebSocket)
- [ ] Advanced analytics dashboard
- [ ] B2B partnership APIs

### Phase 4: Innovation (Q4 2025)
- [ ] AI-powered customer service
- [ ] Blockchain for loyalty program
- [ ] IoT integration for smart golf courses
- [ ] Virtual reality course preview

## Technical Decisions Log

| ID | Decision | Date | Rationale | Status |
|----|----------|------|-----------|--------|
| TD-001 | Microservices over Monolith | 2024-05 | Scalability, team independence | ✅ Implemented |
| TD-002 | NestJS for all services | 2024-05 | Consistency, TypeScript support | ✅ Implemented |
| TD-003 | NATS over RabbitMQ | 2024-06 | Lightweight, cloud-native | ✅ Implemented |
| TD-004 | PostgreSQL over MySQL | 2024-06 | Advanced features, performance | ✅ Implemented |
| TD-005 | React 19 over Next.js | 2024-07 | Flexibility, latest features | ✅ Implemented |
| TD-006 | Monorepo structure | 2024-06 | Code sharing, single source of truth | ✅ Implemented |
| TD-007 | Prisma over TypeORM | 2024-07 | Better DX, type safety | ✅ Implemented |
| TD-008 | GCP over AWS | 2024-08 | Regional presence, pricing | ✅ Decided |

---

**Document Version**: 2.0.0  
**Last Updated**: 2025-01-15  
**Next Review**: 2025-02-01  
**Maintained By**: Platform Team

*This document is the single source of truth for Park Golf Platform architecture.*