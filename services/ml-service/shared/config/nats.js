const { connect, StringCodec, JSONCodec } = require('nats');
const winston = require('winston');

// 로거 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'nats' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// NATS 코덱
const stringCodec = StringCodec();
const jsonCodec = JSONCodec();

// NATS 연결 설정
const natsConfig = {
  servers: process.env.NATS_SERVERS?.split(',') || ['nats://localhost:4222'],
  name: process.env.SERVICE_NAME || 'parkgolf-service',
  reconnect: true,
  maxReconnectAttempts: 10,
  reconnectTimeWait: 2000,
  pingInterval: 20000,
  maxPingOut: 3,
  timeout: 30000
};

// NATS 연결 함수
async function connectNATS(serviceName) {
  try {
    const nc = await connect({
      ...natsConfig,
      name: `${serviceName}-${Date.now()}`
    });
    
    logger.info(`NATS connected successfully for ${serviceName}`);
    
    // 연결 이벤트 리스너
    (async () => {
      for await (const status of nc.status()) {
        logger.info(`NATS connection status: ${status.type}`, {
          data: status.data
        });
      }
    })();
    
    return nc;
  } catch (error) {
    logger.error(`NATS connection failed for ${serviceName}:`, error);
    throw error;
  }
}

// 메시지 발행 헬퍼
async function publishMessage(nc, subject, data, options = {}) {
  try {
    const message = typeof data === 'string' ? stringCodec.encode(data) : jsonCodec.encode(data);
    
    if (options.reply) {
      // Request-Reply 패턴
      const response = await nc.request(subject, message, {
        timeout: options.timeout || 5000
      });
      return jsonCodec.decode(response.data);
    } else {
      // Publish 패턴
      nc.publish(subject, message);
      logger.debug(`Message published to ${subject}`);
    }
  } catch (error) {
    logger.error(`Failed to publish message to ${subject}:`, error);
    throw error;
  }
}

// 메시지 구독 헬퍼
async function subscribeToSubject(nc, subject, handler, options = {}) {
  try {
    const sub = nc.subscribe(subject, {
      queue: options.queue,
      max: options.max
    });
    
    logger.info(`Subscribed to ${subject}${options.queue ? ` with queue ${options.queue}` : ''}`);
    
    (async () => {
      for await (const msg of sub) {
        try {
          const data = jsonCodec.decode(msg.data);
          await handler(data, msg);
        } catch (error) {
          logger.error(`Error processing message from ${subject}:`, error);
        }
      }
    })();
    
    return sub;
  } catch (error) {
    logger.error(`Failed to subscribe to ${subject}:`, error);
    throw error;
  }
}

// 이벤트 발행 헬퍼 (특정 이벤트 타입용)
async function publishEvent(nc, eventType, eventData) {
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: eventType,
    timestamp: new Date().toISOString(),
    source: natsConfig.name,
    data: eventData
  };
  
  await publishMessage(nc, `events.${eventType}`, event);
  return event.id;
}

// 서비스 간 RPC 호출 헬퍼
async function callService(nc, service, method, params, timeout = 5000) {
  const subject = `rpc.${service}.${method}`;
  const request = {
    jsonrpc: '2.0',
    method,
    params,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  try {
    const response = await publishMessage(nc, subject, request, {
      reply: true,
      timeout
    });
    
    if (response.error) {
      throw new Error(response.error.message || 'RPC call failed');
    }
    
    return response.result;
  } catch (error) {
    logger.error(`RPC call to ${service}.${method} failed:`, error);
    throw error;
  }
}

// 서비스 RPC 핸들러 등록
async function registerRPCHandler(nc, service, method, handler) {
  const subject = `rpc.${service}.${method}`;
  
  await subscribeToSubject(nc, subject, async (request, msg) => {
    const response = {
      jsonrpc: '2.0',
      id: request.id
    };
    
    try {
      response.result = await handler(request.params);
    } catch (error) {
      response.error = {
        code: error.code || -32603,
        message: error.message
      };
    }
    
    msg.respond(jsonCodec.encode(response));
  });
  
  logger.info(`RPC handler registered: ${service}.${method}`);
}

// NATS 헬스체크
async function checkNATSHealth(nc) {
  if (!nc) {
    return { status: 'DOWN', message: 'No connection' };
  }
  
  try {
    const rtt = await nc.rtt();
    return {
      status: 'UP',
      rtt: `${rtt}ms`,
      server: nc.getServer()
    };
  } catch (error) {
    return {
      status: 'DOWN',
      error: error.message
    };
  }
}

// Graceful shutdown
async function gracefulNATSShutdown(nc, serviceName) {
  if (nc) {
    logger.info(`Draining NATS connection for ${serviceName}`);
    await nc.drain();
    await nc.close();
    logger.info(`NATS connection closed for ${serviceName}`);
  }
}

// 공통 이벤트 주제
const EventSubjects = {
  // ML 서비스 이벤트
  ML_RECOMMENDATION_CREATED: 'ml.recommendation.created',
  ML_PREDICTION_COMPLETED: 'ml.prediction.completed',
  ML_ANALYTICS_UPDATED: 'ml.analytics.updated',
  
  // MCP 서비스 이벤트
  MCP_CONTEXT_CREATED: 'mcp.context.created',
  MCP_CONTEXT_UPDATED: 'mcp.context.updated',
  MCP_MODEL_REGISTERED: 'mcp.model.registered',
  
  // 시스템 이벤트
  SYSTEM_HEALTH_CHECK: 'system.health.check',
  SYSTEM_METRIC_COLLECTED: 'system.metric.collected'
};

module.exports = {
  connectNATS,
  publishMessage,
  subscribeToSubject,
  publishEvent,
  callService,
  registerRPCHandler,
  checkNATSHealth,
  gracefulNATSShutdown,
  EventSubjects,
  stringCodec,
  jsonCodec
};