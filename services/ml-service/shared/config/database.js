const mongoose = require('mongoose');
const winston = require('winston');

// 로거 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'database' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// MongoDB 연결 옵션
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2
};

// MongoDB 연결 함수
async function connectMongoDB(uri, serviceName) {
  try {
    await mongoose.connect(uri, mongoOptions);
    
    logger.info(`MongoDB connected successfully for ${serviceName}`);
    
    // 연결 이벤트 핸들러
    mongoose.connection.on('connected', () => {
      logger.info(`Mongoose connected to ${serviceName}`);
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error(`Mongoose connection error for ${serviceName}:`, err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn(`Mongoose disconnected from ${serviceName}`);
    });
    
    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB connection failed for ${serviceName}:`, error);
    throw error;
  }
}

// Redis 연결 설정
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis reconnection failed after 10 attempts');
        return new Error('Too many reconnection attempts');
      }
      const delay = Math.min(retries * 100, 3000);
      logger.info(`Reconnecting to Redis in ${delay}ms...`);
      return delay;
    }
  },
  password: process.env.REDIS_PASSWORD,
  database: process.env.REDIS_DB || 0
};

// Redis 연결 함수
async function connectRedis(redisClient, serviceName) {
  try {
    await redisClient.connect();
    logger.info(`Redis connected successfully for ${serviceName}`);
    
    // 에러 핸들러
    redisClient.on('error', (err) => {
      logger.error(`Redis error for ${serviceName}:`, err);
    });
    
    redisClient.on('ready', () => {
      logger.info(`Redis ready for ${serviceName}`);
    });
    
    redisClient.on('reconnecting', () => {
      logger.info(`Redis reconnecting for ${serviceName}`);
    });
    
    return redisClient;
  } catch (error) {
    logger.error(`Redis connection failed for ${serviceName}:`, error);
    throw error;
  }
}

// 데이터베이스 헬스체크
async function checkDatabaseHealth(mongoConnection, redisClient) {
  const health = {
    mongodb: {
      status: 'DOWN',
      readyState: mongoConnection.readyState,
      states: {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      }
    },
    redis: {
      status: 'DOWN',
      isOpen: false
    }
  };
  
  // MongoDB 상태 확인
  health.mongodb.status = mongoConnection.readyState === 1 ? 'UP' : 'DOWN';
  health.mongodb.currentState = health.mongodb.states[mongoConnection.readyState];
  
  // Redis 상태 확인
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.ping();
      health.redis.status = 'UP';
      health.redis.isOpen = true;
    }
  } catch (error) {
    logger.error('Redis health check failed:', error);
  }
  
  return health;
}

// Graceful shutdown 헬퍼
async function gracefulShutdown(mongoConnection, redisClient, serviceName) {
  logger.info(`Starting graceful shutdown for ${serviceName}`);
  
  try {
    // MongoDB 연결 종료
    if (mongoConnection) {
      await mongoConnection.close();
      logger.info('MongoDB connection closed');
    }
    
    // Redis 연결 종료
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
  }
}

module.exports = {
  connectMongoDB,
  connectRedis,
  redisConfig,
  mongoOptions,
  checkDatabaseHealth,
  gracefulShutdown
};