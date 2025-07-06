# Park Golf Platform

A comprehensive microservices-based platform for managing park golf course bookings.

## 🏗️ Architecture

This platform follows a microservices architecture with BFF (Backend for Frontend) pattern:

### Frontend Applications
- **Admin Dashboard** (React + TypeScript + Redux Toolkit)
- **User Web App** (React + TypeScript + Recoil)

### BFF Services
- **Admin API** (NestJS) - Backend for Frontend for admin dashboard
- **User API** (NestJS) - Backend for Frontend for user application

### Microservices
- **Auth Service** (NestJS) - Authentication and user management
- **Course Service** (NestJS) - Golf course and facility management
- **Booking Service** (NestJS) - Reservation and booking management
- **Notify Service** (NestJS) - Notification and messaging
- **Search Service** (Golang) - Search and indexing with ElasticSearch
- **ML Service** (Python FastAPI) - Machine learning and recommendations

## 🛠️ Technology Stack

### Backend
- **NestJS**: Microservices framework with TypeScript
- **Golang**: High-performance search service
- **Python FastAPI**: ML and AI services
- **PostgreSQL**: Primary database with separate DBs per service
- **ElasticSearch**: Search engine and analytics
- **Redis**: Caching and session storage
- **NATS JetStream**: Message streaming and event-driven communication

### Frontend
- **React 19**: Modern UI library
- **TypeScript**: Type-safe development
- **Redux Toolkit**: State management (Admin)
- **Recoil**: State management (User)
- **Tailwind CSS**: Utility-first styling

### Infrastructure
- **Docker**: Containerization and local development
- **Google Cloud Platform**: Production infrastructure
- **Cloud Run**: Container orchestration
- **Terraform**: Infrastructure as code

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Docker Desktop** (for local development)
- **Go** 1.21+ (for search service development)
- **Python** 3.11+ (for ML service development)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/uniyous/parkgolf-platform.git
   cd parkgolf-platform
   ```

2. **Start infrastructure services**
   ```bash
   # Start PostgreSQL, NATS JetStream, Redis, ElasticSearch
   ./.devtools/scripts/development/start-infrastructure.sh
   ```

3. **Set up environment variables**
   ```bash
   cp .env.development .env
   # Edit .env if needed
   ```

4. **Start individual services**
   ```bash
   # Auth Service
   cd services/auth-service
   npm install
   npm run start:dev
   
   # Course Service (in another terminal)
   cd services/course-service
   npm install
   npm run start:dev
   
   # Continue for other services...
   ```

### Infrastructure Services

After running the infrastructure script, you'll have:

- **PostgreSQL**: `localhost:5432`
  - Main DB: `parkgolf` (user: `parkgolf`, password: `parkgolf123`)
  - Service DBs: `auth_db`, `course_db`, `booking_db`, `notify_db`, `ml_db`
  
- **NATS JetStream**: `localhost:4222`
  - Monitoring: http://localhost:8222
  
- **Redis**: `localhost:6379` (password: `redis123`)

- **ElasticSearch**: http://localhost:9200

### Optional Monitoring UIs

```bash
# Start monitoring services
docker-compose --profile monitoring up -d

# Access UIs
# PgAdmin: http://localhost:5050 (admin@parkgolf.com/admin123)
# Redis Commander: http://localhost:8081
# Kibana: http://localhost:5601
```

## 📁 Project Structure

```
parkgolf-platform/
├── .claude/                    # Claude Code configuration
├── .devtools/                  # Development tools and scripts
│   ├── config/                # Project configurations
│   ├── schemas/               # Common schemas (API, DB, Events)
│   ├── types/                 # TypeScript common types
│   ├── scripts/               # Development and deployment scripts
│   └── docs/                  # Documentation
├── services/                   # Microservices
│   ├── auth-service/          # Authentication (NestJS, :3011)
│   ├── course-service/        # Course management (NestJS, :3012)
│   ├── booking-service/       # Booking management (NestJS, :3013)
│   ├── notify-service/        # Notifications (NestJS, :3014)
│   ├── search-service/        # Search engine (Golang, :3015)
│   ├── ml-service/            # Machine learning (Python, :3016)
│   ├── admin-api/             # Admin BFF (NestJS, :3091)
│   ├── user-api/              # User BFF (NestJS, :3092)
│   ├── admin-dashboard/       # Admin UI (React, :3001)
│   └── user-webapp/           # User UI (React, :3002)
├── shared/                     # Shared configurations
│   ├── configs/               # Database, ElasticSearch configs
│   └── terraform/             # Infrastructure as code
├── docker-compose.yml          # Local development infrastructure
└── README.md
```

## 🔧 Development Commands

### Infrastructure Management
```bash
# Start all infrastructure services
./.devtools/scripts/development/start-infrastructure.sh

# Stop all services
./.devtools/scripts/development/stop-dev.sh

# View service logs
docker-compose logs -f [service_name]

# Restart a specific service
docker-compose restart [service_name]
```

### Service Development
```bash
# Start a service in development mode
cd services/auth-service
npm run start:dev

# Run tests
npm run test
npm run test:e2e

# Build service
npm run build

# Check service health
curl http://localhost:3011/health
```

### Database Management
```bash
# Access PostgreSQL
docker exec -it parkgolf-postgres psql -U parkgolf -d parkgolf

# Run database migrations
cd services/auth-service
npx prisma migrate dev
npx prisma db push

# Reset database
npx prisma migrate reset
```

## 🌐 Service Endpoints

### Microservices
- **Auth Service**: http://localhost:3011 ([Swagger](http://localhost:3011/api/docs))
- **Course Service**: http://localhost:3012 ([Swagger](http://localhost:3012/api/docs))
- **Booking Service**: http://localhost:3013 ([Swagger](http://localhost:3013/api/docs))
- **Notify Service**: http://localhost:3014 ([Swagger](http://localhost:3014/api/docs))
- **Search Service**: http://localhost:3015
- **ML Service**: http://localhost:3016 ([Docs](http://localhost:3016/docs))

### BFF Services
- **Admin API**: http://localhost:3091 ([Swagger](http://localhost:3091/api/docs))
- **User API**: http://localhost:3092 ([Swagger](http://localhost:3092/api/docs))

### Frontend Applications
- **Admin Dashboard**: http://localhost:3001
- **User Web App**: http://localhost:3002

## 🔐 Authentication

The platform uses JWT-based authentication with refresh tokens:

- **Access Token**: Short-lived (7 days) for API access
- **Refresh Token**: Long-lived (30 days) for token renewal
- **Role-Based Access Control (RBAC)**: Different permissions for admins and users

## 📊 Event-Driven Architecture

Services communicate through NATS JetStream with event patterns:

- **booking.created** → triggers notification
- **payment.completed** → updates booking status
- **user.registered** → sends welcome email
- **course.updated** → reindex search data

## 🚢 Deployment

### Development Environment
Uses Docker Compose for local infrastructure services.

### Production Environment
Deployed on Google Cloud Platform:
- **Cloud Run**: Container orchestration
- **Cloud SQL**: Managed PostgreSQL
- **Cloud Build**: CI/CD pipeline
- **Terraform**: Infrastructure management

## 🔍 Monitoring & Observability

- **Health Checks**: All services expose `/health` endpoints
- **Logging**: Structured logging with correlation IDs
- **Metrics**: Custom metrics for business KPIs
- **Tracing**: Distributed tracing across services

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests and ensure they pass
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📚 Documentation

- **Development Guide**: [.devtools/docs/README.md](.devtools/docs/README.md)
- **Migration History**: [.devtools/docs/MIGRATION_HISTORY.md](.devtools/docs/MIGRATION_HISTORY.md)
- **API Schemas**: [.devtools/schemas/api/](.devtools/schemas/api/)
- **Common Types**: [.devtools/types/typescript/](.devtools/types/typescript/)

## 🆘 Troubleshooting

### Common Issues

**Port conflicts**
```bash
# Check what's using a port
lsof -i :3011

# Kill process
kill -9 <PID>
```

**Database connection errors**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres
```

**NATS connection errors**
```bash
# Check NATS status
curl http://localhost:8222/varz

# Restart NATS
docker-compose restart nats
```

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/uniyous/parkgolf-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/uniyous/parkgolf-platform/discussions)
- **Email**: admin@parkgolf.com

## 📄 License

This project is proprietary and confidential.