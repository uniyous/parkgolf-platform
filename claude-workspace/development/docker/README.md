# Docker Configuration

This directory contains Docker configurations for development and deployment environments.

## Files

### `docker-compose.yml`
- **Purpose**: Development infrastructure services
- **Services**: PostgreSQL, Redis, NATS, Elasticsearch
- **Usage**: `docker-compose up -d` from project root

### Future Docker Files
- `docker-compose.prod.yml` - Production Docker configuration
- `docker-compose.test.yml` - Testing environment
- `Dockerfile.base` - Base image for microservices

## Development Infrastructure

The development Docker Compose provides:

### Database Services
- **PostgreSQL**: Main database with multiple service schemas
- **Redis**: Caching and session storage
- **NATS**: Message streaming for microservices

### Search & Analytics
- **Elasticsearch**: Search engine and analytics
- **Kibana**: Log analysis and visualization

### Monitoring (Optional)
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards

## Usage

### Start Development Infrastructure
```bash
# From project root
docker-compose -f .devtools/docker/docker-compose.yml up -d
```

### Stop Infrastructure
```bash
docker-compose -f .devtools/docker/docker-compose.yml down
```

### View Logs
```bash
docker-compose -f .devtools/docker/docker-compose.yml logs -f [service-name]
```

## Network Configuration

All services are configured on the `parkgolf-network` Docker network, allowing:
- Service discovery by container name
- Isolated network environment
- Consistent port mappings

## Data Persistence

Persistent volumes are configured for:
- PostgreSQL data (`postgres_data`)
- Redis data (`redis_data`)
- Elasticsearch indices (`elasticsearch_data`)

## Health Checks

All services include health checks to ensure:
- Services are ready before dependent services start
- Automatic restart on failure
- Proper service discovery timing