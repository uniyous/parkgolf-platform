const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const redis = require('redis');
const winston = require('winston');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { register } = require('prom-client');
const path = require('path');

// 환경변수 설정
const HTTP_PORT = process.env.MCP_SERVICE_PORT || 4001;
const GRPC_PORT = process.env.MCP_GRPC_PORT || 50051;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/parkgolf-mcp';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Winston 로거 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mcp-services' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Express 앱 초기화
const app = express();

// 미들웨어 설정
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Redis 클라이언트 초기화
const redisClient = redis.createClient({
  url: REDIS_URL
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis connected successfully'));

// MongoDB 연결
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  logger.info('MongoDB connected successfully');
}).catch((err) => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// 헬스체크 엔드포인트
app.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'mcp-services',
    checks: {
      mongodb: mongoose.connection.readyState === 1 ? 'UP' : 'DOWN',
      redis: redisClient.isOpen ? 'UP' : 'DOWN',
      grpc: grpcServer ? 'UP' : 'DOWN'
    }
  };
  
  const httpStatus = health.checks.mongodb === 'UP' && health.checks.redis === 'UP' ? 200 : 503;
  res.status(httpStatus).json(health);
});

// 메트릭스 엔드포인트 (Prometheus)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// API 라우트 정보
app.get('/api/mcp', (req, res) => {
  res.json({
    service: 'MCP Services',
    version: '1.0.0',
    endpoints: [
      '/api/mcp/context',
      '/api/mcp/model',
      '/api/mcp/protocol'
    ],
    grpc: {
      port: GRPC_PORT,
      services: ['ContextService', 'ModelService', 'ProtocolService']
    }
  });
});

// 컨텍스트 관리 라우트
app.post('/api/mcp/context', async (req, res) => {
  logger.info('Context creation request', { body: req.body });
  
  try {
    // TODO: 실제 컨텍스트 생성 로직 구현
    const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Redis에 임시 저장 (TTL: 1시간)
    await redisClient.setEx(`context:${contextId}`, 3600, JSON.stringify({
      id: contextId,
      ...req.body,
      createdAt: new Date().toISOString()
    }));
    
    res.status(201).json({
      contextId,
      status: 'created',
      message: 'Context created successfully'
    });
  } catch (error) {
    logger.error('Context creation error:', error);
    res.status(500).json({ error: 'Failed to create context' });
  }
});

app.get('/api/mcp/context/:id', async (req, res) => {
  logger.info('Context retrieval request', { contextId: req.params.id });
  
  try {
    const context = await redisClient.get(`context:${req.params.id}`);
    
    if (!context) {
      return res.status(404).json({ error: 'Context not found' });
    }
    
    res.json(JSON.parse(context));
  } catch (error) {
    logger.error('Context retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve context' });
  }
});

// 모델 게이트웨이 라우트
app.post('/api/mcp/model/register', async (req, res) => {
  logger.info('Model registration request', { body: req.body });
  
  res.status(201).json({
    message: 'Model registration endpoint - To be implemented',
    modelId: `model_${Date.now()}`
  });
});

app.get('/api/mcp/model/:id', async (req, res) => {
  logger.info('Model info request', { modelId: req.params.id });
  
  res.json({
    message: 'Model info endpoint - To be implemented',
    model: {}
  });
});

// 프로토콜 어댑터 라우트
app.post('/api/mcp/protocol/convert', async (req, res) => {
  logger.info('Protocol conversion request', { body: req.body });
  
  res.json({
    message: 'Protocol conversion endpoint - To be implemented',
    converted: {}
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// gRPC 서버 설정
let grpcServer;

function startGrpcServer() {
  // Proto 파일 경로 (나중에 생성할 예정)
  const PROTO_PATH = path.join(__dirname, 'protos', 'mcp.proto');
  
  // 현재는 proto 파일이 없으므로 기본 서버만 생성
  grpcServer = new grpc.Server();
  
  // gRPC 서비스 구현 (플레이스홀더)
  const contextService = {
    CreateContext: (call, callback) => {
      logger.info('gRPC CreateContext called');
      callback(null, { contextId: `grpc_ctx_${Date.now()}`, status: 'created' });
    },
    GetContext: (call, callback) => {
      logger.info('gRPC GetContext called');
      callback(null, { context: {} });
    }
  };
  
  // gRPC 서버 시작
  grpcServer.bindAsync(
    `0.0.0.0:${GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        logger.error('Failed to start gRPC server:', err);
        return;
      }
      logger.info(`gRPC server is running on port ${port}`);
    }
  );
}

// 서버 시작
async function startServer() {
  try {
    // Redis 연결
    await redisClient.connect();
    
    // HTTP 서버 시작
    app.listen(HTTP_PORT, () => {
      logger.info(`MCP Services HTTP server is running on port ${HTTP_PORT}`);
      logger.info(`Environment: ${NODE_ENV}`);
    });
    
    // gRPC 서버 시작
    startGrpcServer();
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing servers');
  
  if (grpcServer) {
    grpcServer.forceShutdown();
  }
  
  await mongoose.connection.close();
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing servers');
  
  if (grpcServer) {
    grpcServer.forceShutdown();
  }
  
  await mongoose.connection.close();
  await redisClient.quit();
  process.exit(0);
});

// 서버 시작
startServer();

module.exports = app;