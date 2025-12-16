const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 로그 디렉토리 생성
const logDir = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 환경별 로그 레벨
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// 커스텀 로그 포맷
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
    let msg = `${timestamp} [${service || 'app'}] ${level}: ${message}`;
    
    // 메타데이터가 있으면 추가
    if (Object.keys(metadata).length > 0) {
      // stack trace는 별도로 처리
      if (metadata.stack) {
        msg += `\n${metadata.stack}`;
        delete metadata.stack;
      }
      
      // 나머지 메타데이터
      if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
      }
    }
    
    return msg;
  })
);

// 로거 생성 함수
function createLogger(serviceName, options = {}) {
  const transports = [];
  
  // 콘솔 출력
  if (process.env.NODE_ENV !== 'test') {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          customFormat
        )
      })
    );
  }
  
  // 파일 출력 - 에러
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, `${serviceName}-error.log`),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  );
  
  // 파일 출력 - 전체
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, `${serviceName}-combined.log`),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  );
  
  // 프로덕션 환경에서는 JSON 포맷 사용
  const fileFormat = process.env.NODE_ENV === 'production' 
    ? winston.format.json() 
    : customFormat;
  
  return winston.createLogger({
    level: options.level || logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      fileFormat
    ),
    defaultMeta: { 
      service: serviceName,
      environment: process.env.NODE_ENV || 'development'
    },
    transports,
    exitOnError: false
  });
}

// HTTP 요청 로거 미들웨어
function createRequestLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();
    
    // 요청 정보 로깅
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
    
    // 응답 완료 시 로깅
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      logger.info('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    });
    
    next();
  };
}

// 에러 로거 미들웨어
function createErrorLogger(logger) {
  return (err, req, res, next) => {
    logger.error('Request error', {
      method: req.method,
      url: req.url,
      error: err.message,
      stack: err.stack,
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    next(err);
  };
}

// 성능 로거
function logPerformance(logger, operationName, operation) {
  return async (...args) => {
    const start = Date.now();
    
    try {
      const result = await operation(...args);
      const duration = Date.now() - start;
      
      logger.debug(`${operationName} completed`, {
        duration: `${duration}ms`,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      logger.error(`${operationName} failed`, {
        duration: `${duration}ms`,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  };
}

// 메트릭 로거
class MetricLogger {
  constructor(logger) {
    this.logger = logger;
    this.metrics = new Map();
  }
  
  increment(metric, value = 1, tags = {}) {
    this.logger.debug('Metric increment', {
      metric,
      value,
      tags,
      type: 'counter'
    });
  }
  
  gauge(metric, value, tags = {}) {
    this.logger.debug('Metric gauge', {
      metric,
      value,
      tags,
      type: 'gauge'
    });
  }
  
  histogram(metric, value, tags = {}) {
    this.logger.debug('Metric histogram', {
      metric,
      value,
      tags,
      type: 'histogram'
    });
  }
  
  timing(metric, duration, tags = {}) {
    this.logger.debug('Metric timing', {
      metric,
      duration,
      tags,
      type: 'timing'
    });
  }
}

// 로그 레벨 동적 변경
function setLogLevel(logger, level) {
  logger.level = level;
  logger.info(`Log level changed to ${level}`);
}

// 로그 파일 로테이션 수동 트리거
function rotateLogs(logger) {
  logger.info('Manual log rotation triggered');
  // Winston의 파일 트랜스포트가 자동으로 처리
}

module.exports = {
  createLogger,
  createRequestLogger,
  createErrorLogger,
  logPerformance,
  MetricLogger,
  setLogLevel,
  rotateLogs
};