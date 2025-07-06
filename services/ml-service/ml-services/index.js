const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const winston = require('winston');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { register } = require('prom-client');

// 환경변수 설정
const PORT = process.env.ML_SERVICE_PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/parkgolf-ml';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Winston 로거 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ml-services' },
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
    service: 'ml-services',
    checks: {
      mongodb: mongoose.connection.readyState === 1 ? 'UP' : 'DOWN',
      redis: redisClient.isOpen ? 'UP' : 'DOWN'
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

// API 라우트 플레이스홀더
app.get('/api/ml', (req, res) => {
  res.json({
    service: 'ML Services',
    version: '1.0.0',
    endpoints: [
      '/api/ml/recommend',
      '/api/ml/predict',
      '/api/ml/analytics'
    ]
  });
});

// 추천 엔진 라우트 (플레이스홀더)
app.post('/api/ml/recommend', async (req, res) => {
  logger.info('Recommendation request received', { body: req.body });
  res.json({
    message: 'Recommendation endpoint - To be implemented',
    recommendations: []
  });
});

// 예측 서비스 라우트 (플레이스홀더)
app.post('/api/ml/predict/booking', async (req, res) => {
  logger.info('Prediction request received', { body: req.body });
  res.json({
    message: 'Prediction endpoint - To be implemented',
    prediction: null
  });
});

// 분석 서비스 라우트 (플레이스홀더)
app.get('/api/ml/analytics/player/:id', async (req, res) => {
  logger.info('Analytics request received', { playerId: req.params.id });
  res.json({
    message: 'Analytics endpoint - To be implemented',
    analytics: {}
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

// 서버 시작
async function startServer() {
  try {
    // Redis 연결
    await redisClient.connect();
    
    // 서버 시작
    app.listen(PORT, () => {
      logger.info(`ML Services server is running on port ${PORT}`);
      logger.info(`Environment: ${NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await mongoose.connection.close();
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await mongoose.connection.close();
  await redisClient.quit();
  process.exit(0);
});

// 서버 시작
startServer();

module.exports = app;