import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  connect,
  NatsConnection,
  JetStreamClient,
  JetStreamManager,
  StringCodec,
} from 'nats';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: number;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'system';
  createdAt: string;
}

export interface PresenceEvent {
  userId: number;
  userName: string;
  status: 'online' | 'offline';
  timestamp: string;
}

export interface TypingEvent {
  roomId: string;
  userId: number;
  userName: string;
  isTyping: boolean;
}

export interface NotificationEvent {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name);
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private sc = StringCodec();

  constructor(
    private configService: ConfigService,
    @Inject('CHAT_SERVICE') private chatServiceClient: ClientProxy,
    @Inject('NOTIFY_SERVICE') private notifyClient: ClientProxy,
  ) {}

  async onModuleInit() {
    // Connect raw NATS for JetStream
    await this.connect();

    // Connect NestJS ClientProxy for chat-service
    try {
      await this.chatServiceClient.connect();
      this.logger.log('Connected to chat-service via ClientProxy');
    } catch (error: any) {
      this.logger.warn(`Failed to connect chat-service ClientProxy: ${error.message}`);
    }

    // Connect NestJS ClientProxy for notify-service
    try {
      await this.notifyClient.connect();
      this.logger.log('Connected to notify-service via ClientProxy');
    } catch (error: any) {
      this.logger.warn(`Failed to connect notify-service ClientProxy: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    const natsUrl = this.configService.get<string>('NATS_URL');
    if (!natsUrl) {
      this.logger.warn('NATS_URL not configured, running without NATS');
      return;
    }

    try {
      this.nc = await connect({
        servers: [natsUrl],
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
      });

      this.js = this.nc.jetstream();
      this.jsm = await this.nc.jetstreamManager();

      await this.setupStreams();
      this.logger.log(`Connected to NATS: ${natsUrl}`);
    } catch (error) {
      this.logger.error('Failed to connect to NATS', error);
    }
  }

  private async disconnect() {
    if (this.nc) {
      try {
        await this.nc.drain();
      } catch (error: any) {
        // CONNECTION_DRAINING is expected during SIGTERM graceful shutdown
        if (error?.code !== 'CONNECTION_DRAINING') {
          this.logger.warn(`NATS drain error: ${error.message}`);
        }
      }
      this.nc = null;
    }
  }

  private async setupStreams() {
    if (!this.jsm) return;

    // Chat messages stream
    try {
      await this.jsm.streams.add({
        name: 'CHAT_MESSAGES',
        subjects: ['chat.room.*.message', 'chat.dm.*.message'],
        retention: 'limits' as any,
        max_msgs: 100000,
        max_age: 30 * 24 * 60 * 60 * 1000000000, // 30 days in nanoseconds
        storage: 'file' as any,
        duplicate_window: 60 * 1000000000, // 1 minute
      });
      this.logger.log('Created CHAT_MESSAGES stream');
    } catch (error: any) {
      if (error.message?.includes('already in use')) {
        this.logger.log('CHAT_MESSAGES stream already exists');
      } else {
        this.logger.error('Failed to create CHAT_MESSAGES stream', error);
      }
    }

    // Presence stream (ephemeral)
    try {
      await this.jsm.streams.add({
        name: 'CHAT_PRESENCE',
        subjects: ['chat.user.*.presence'],
        retention: 'limits' as any,
        max_msgs: 10000,
        max_age: 5 * 60 * 1000000000, // 5 minutes
        storage: 'memory' as any,
      });
      this.logger.log('Created CHAT_PRESENCE stream');
    } catch (error: any) {
      if (error.message?.includes('already in use')) {
        this.logger.log('CHAT_PRESENCE stream already exists');
      } else {
        this.logger.error('Failed to create CHAT_PRESENCE stream', error);
      }
    }
  }

  // Publish message to room (JetStream persistence)
  // type is uppercased to match Prisma MessageType enum for DB storage
  async publishMessage(roomId: string, message: ChatMessage): Promise<void> {
    if (!this.js) {
      this.logger.warn('JetStream not available');
      return;
    }

    const subject = `chat.room.${roomId}.message`;
    const payload = { ...message, type: message.type.toUpperCase() };
    const data = this.sc.encode(JSON.stringify(payload));

    try {
      await this.js.publish(subject, data, {
        msgID: message.id,
      });
      this.logger.debug(`Published message to ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to publish message to ${subject}`, error);
      throw error;
    }
  }

  // Publish presence
  async publishPresence(userId: number, event: PresenceEvent): Promise<void> {
    if (!this.js) return;

    const subject = `chat.user.${userId}.presence`;
    const data = this.sc.encode(JSON.stringify(event));

    try {
      await this.js.publish(subject, data);
    } catch (error) {
      this.logger.error(`Failed to publish presence for user ${userId}`, error);
    }
  }

  // Request to chat-service via NATS using NestJS ClientProxy
  async requestChatService<T>(pattern: string, data: any): Promise<T> {
    const subject = `chat.${pattern}`;
    this.logger.debug(`NATS request to ${subject}: ${JSON.stringify(data)}`);

    try {
      const result = await firstValueFrom(
        this.chatServiceClient.send<T>(subject, data).pipe(timeout(10000)),
      );
      this.logger.debug(`NATS response from ${subject}: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`NATS request failed for ${subject}: ${error.message}`);
      throw error;
    }
  }

  emitChatMessageNotification(data: {
    chatRoomId: string; senderId: number; senderName: string;
    recipientId: number; messagePreview: string; createdAt: string;
  }): void {
    this.notifyClient.emit('chat.message', data);
  }

  emitNotificationDismiss(data: {
    userId: string; type: string; dataFilter?: Record<string, any>;
  }): void {
    this.notifyClient.emit('notification.dismiss', data);
  }

  isConnected(): boolean {
    return this.nc !== null && !this.nc.isClosed();
  }

  // Subscribe to notification events from notify-service
  async subscribeToNotifications(
    handler: (notification: NotificationEvent) => void,
  ): Promise<() => void> {
    if (!this.nc) {
      this.logger.warn('NATS not connected, cannot subscribe to notifications');
      return () => {};
    }

    const subject = 'notification.created';
    const sub = this.nc.subscribe(subject);
    this.logger.log(`Subscribed to ${subject} for real-time notifications`);

    (async () => {
      for await (const msg of sub) {
        try {
          const notification = JSON.parse(this.sc.decode(msg.data)) as NotificationEvent;
          handler(notification);
        } catch (error) {
          this.logger.error('Failed to process notification event', error);
        }
      }
    })();

    // Return cleanup function
    return () => {
      sub.unsubscribe();
      this.logger.log(`Unsubscribed from ${subject}`);
    };
  }
}
