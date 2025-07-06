# Park Golf ML-MCP Control Center

## Overview

This repository serves as the central control center for Machine Learning (ML) and Model Context Protocol (MCP) services for the Park Golf platform.

## Project Structure

```
parkgolf-ml-mcp/
├── ml-services/          # Machine Learning services
│   ├── recommendation/   # Golf course recommendation engine
│   ├── prediction/       # Booking and usage prediction
│   └── analytics/        # Data analytics and insights
│
├── mcp-services/         # Model Context Protocol services
│   ├── context-manager/  # Context management
│   ├── model-gateway/    # Model API gateway
│   └── protocol-adapter/ # Protocol adapters
│
├── shared/               # Shared utilities and libraries
│   ├── config/          # Configuration files
│   ├── utils/           # Common utilities
│   └── types/           # TypeScript type definitions
│
└── docs/                # Documentation
    ├── ml/              # ML documentation
    └── mcp/             # MCP documentation
```

## Features

### Machine Learning Services
- **Recommendation Engine**: Personalized golf course recommendations based on user preferences and history
- **Booking Prediction**: Predict booking patterns and optimize availability
- **Performance Analytics**: Analyze player performance and provide insights
- **Weather Integration**: ML-based weather impact analysis on bookings

### MCP Services
- **Context Management**: Manage and maintain context across different models
- **Model Gateway**: Unified API gateway for all ML models
- **Protocol Adapters**: Adapters for different ML frameworks and protocols
- **Version Control**: Model versioning and rollback capabilities

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- Python >= 3.9 (for ML services)
- Docker (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/uniyous/parkgolf-ml-mcp.git
cd parkgolf-ml-mcp

# Install all dependencies
npm run install:all
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update the environment variables:
```env
# ML Service Configuration
ML_SERVICE_PORT=4000
ML_MODEL_PATH=./models
ML_API_KEY=your-ml-api-key

# MCP Configuration
MCP_SERVICE_PORT=4001
MCP_CONTEXT_DB=mongodb://localhost:27017/mcp
MCP_PROTOCOL_VERSION=1.0

# Integration
PARKGOLF_API_URL=http://localhost:3091
NATS_URL=nats://localhost:4222
```

### Running Services

```bash
# Start ML services
npm run start:ml

# Start MCP services
npm run start:mcp

# Start all services
npm run start:all
```

## Development

### ML Model Development
- Models are stored in `ml-services/models/`
- Training scripts in `ml-services/training/`
- Evaluation scripts in `ml-services/evaluation/`

### MCP Protocol Development
- Protocol definitions in `mcp-services/protocols/`
- Adapters in `mcp-services/protocol-adapter/`

## API Documentation

### ML Service Endpoints
- `POST /api/ml/recommend` - Get course recommendations
- `POST /api/ml/predict/booking` - Predict booking availability
- `GET /api/ml/analytics/player/:id` - Get player analytics

### MCP Service Endpoints
- `POST /api/mcp/context` - Create/update context
- `GET /api/mcp/context/:id` - Retrieve context
- `POST /api/mcp/model/invoke` - Invoke model with context

## Testing

```bash
# Run all tests
npm test

# Run ML tests
npm run test:ml

# Run MCP tests
npm run test:mcp
```

## Deployment

### Docker
```bash
# Build images
docker-compose build

# Run services
docker-compose up -d
```

### Kubernetes
```bash
# Apply configurations
kubectl apply -f k8s/
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Email: support@parkgolf.com
- Documentation: https://docs.parkgolf.com/ml-mcp
- Issues: https://github.com/uniyous/parkgolf-ml-mcp/issues