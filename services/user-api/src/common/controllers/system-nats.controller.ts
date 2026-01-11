import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

/**
 * System NATS Controller
 *
 * user-api의 NATS 통신 상태 확인용 ping 핸들러
 */
@Controller()
export class SystemNatsController {
  private readonly logger = new Logger(SystemNatsController.name);

  @MessagePattern('user-api.ping')
  async ping(@Payload() payload: { ping: boolean; timestamp: string }) {
    this.logger.debug(`NATS ping received: ${payload.timestamp}`);
    return {
      pong: true,
      service: 'user-api',
      timestamp: new Date().toISOString(),
      receivedAt: payload.timestamp,
    };
  }
}
