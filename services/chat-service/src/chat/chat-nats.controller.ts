import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ChatService, SaveMessageDto, GetMessagesDto, MarkReadDto } from './chat.service';

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

  @MessagePattern('chat.messages.save')
  async saveMessage(@Payload() data: SaveMessageDto) {
    this.logger.debug(`Saving message: ${data.id}`);
    try {
      const message = await this.chatService.saveMessage(data);
      return { success: true, data: message };
    } catch (error: any) {
      this.logger.error(`Failed to save message: ${error.message}`);
      return { success: false, error: { code: 'SAVE_MESSAGE_ERROR', message: error.message } };
    }
  }

  @MessagePattern('chat.messages.list')
  async getMessages(@Payload() data: GetMessagesDto) {
    try {
      const result = await this.chatService.getMessages(data);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: { code: 'LIST_MESSAGES_ERROR', message: error.message } };
    }
  }

  @MessagePattern('chat.messages.markRead')
  async markRead(@Payload() data: MarkReadDto) {
    try {
      await this.chatService.markRead(data);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { code: 'MARK_READ_ERROR', message: error.message } };
    }
  }

  @MessagePattern('chat.messages.unreadCount')
  async getUnreadCount(@Payload() data: { roomId: string; userId: number }) {
    try {
      const count = await this.chatService.getUnreadCount(data.roomId, data.userId);
      return { success: true, data: { count } };
    } catch (error: any) {
      return { success: false, error: { code: 'UNREAD_COUNT_ERROR', message: error.message } };
    }
  }

  @MessagePattern('chat.messages.delete')
  async deleteMessage(@Payload() data: { messageId: string; userId: number }) {
    try {
      const result = await this.chatService.deleteMessage(data.messageId, data.userId);
      return result.success
        ? { success: true }
        : { success: false, error: { code: 'DELETE_MESSAGE_ERROR', message: result.error } };
    } catch (error: any) {
      return { success: false, error: { code: 'DELETE_MESSAGE_ERROR', message: error.message } };
    }
  }
}
