import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ChatService, GetMessagesDto, MarkReadDto } from './chat.service';
import { NatsResponse } from '../common/types/response.types';

@Controller()
export class ChatNatsController {
  private readonly logger = new Logger(ChatNatsController.name);

  constructor(private readonly chatService: ChatService) {}

  @MessagePattern('chat.ping')
  async ping(@Payload() payload: { ping: boolean; timestamp: string }) {
    this.logger.debug(`NATS ping received: ${payload.timestamp}`);
    return {
      pong: true,
      service: 'chat-service',
      timestamp: new Date().toISOString(),
    };
  }

  @MessagePattern('chat.messages.list')
  async getMessages(@Payload() data: GetMessagesDto) {
    const result = await this.chatService.getMessages(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('chat.messages.markRead')
  async markRead(@Payload() data: MarkReadDto) {
    await this.chatService.markRead(data);
    return NatsResponse.success(null);
  }

  @MessagePattern('chat.messages.unreadCount')
  async getUnreadCount(@Payload() data: { roomId: string; userId: number }) {
    const count = await this.chatService.getUnreadCount(data.roomId, data.userId);
    return NatsResponse.success({ count });
  }

  @MessagePattern('chat.messages.delete')
  async deleteMessage(@Payload() data: { messageId: string; userId: number }) {
    await this.chatService.deleteMessage(data.messageId, data.userId);
    return NatsResponse.deleted();
  }
}
