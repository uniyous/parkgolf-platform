import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { BehaviorSubject, firstValueFrom, Observable, timeout } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import {
  connect,
  NatsConnection,
  JetStreamClient,
  JetStreamManager,
  StringCodec,
  RetentionPolicy,
  StorageType,
} from 'nats';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: number;
  senderName: string;
  content: string;
  type: string;
  metadata?: string;
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

export interface RoomMessageEvent {
  roomId: string;
  message: {
    id: string;
    roomId: string;
    senderId: number;
    senderName: string;
    content: string;
    type: string;
    messageType: string;
    metadata?: string;
    createdAt: string;
  };
}

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name);
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private sc = StringCodec();

  // NATS connection status observable for broadcasting to Socket.IO clients
  private readonly natsStatusSubject = new BehaviorSubject<boolean>(false);
  readonly natsStatus$: Observable<boolean> = this.natsStatusSubject.pipe(distinctUntilChanged());

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
      this.natsStatusSubject.next(true);
      this.monitorNatsStatus();
      this.logger.log(`Connected to NATS: ${natsUrl}`);
    } catch (error) {
      this.logger.error('Failed to connect to NATS', error);
      this.natsStatusSubject.next(false);
    }
  }

  private async disconnect() {
    this.natsStatusSubject.next(false);
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

  /**
   * Monitor NATS connection status via async iterator.
   * Emits status changes to natsStatusSubject for broadcasting to Socket.IO clients.
   */
  private async monitorNatsStatus() {
    if (!this.nc) return;

    try {
      for await (const status of this.nc.status()) {
        switch (status.type) {
          case 'disconnect':
          case 'reconnecting':
            this.logger.warn(`NATS status: ${status.type}`);
            this.natsStatusSubject.next(false);
            break;

          case 'reconnect':
            this.logger.log('NATS reconnected, reinitializing JetStream and ClientProxies');
            // Reinitialize JetStream client + recreate streams (NATS 파드 재시작 시 스트림 소실 대응)
            try {
              this.js = this.nc!.jetstream();
              this.jsm = await this.nc!.jetstreamManager();
              await this.setupStreams();
            } catch (error) {
              this.logger.error('Failed to reinitialize JetStream after reconnect', error);
            }
            // Reconnect NestJS ClientProxies
            try {
              await this.chatServiceClient.connect();
              this.logger.log('Reconnected chat-service ClientProxy');
            } catch (error: any) {
              this.logger.warn(`Failed to reconnect chat-service ClientProxy: ${error.message}`);
            }
            try {
              await this.notifyClient.connect();
              this.logger.log('Reconnected notify-service ClientProxy');
            } catch (error: any) {
              this.logger.warn(`Failed to reconnect notify-service ClientProxy: ${error.message}`);
            }
            this.natsStatusSubject.next(true);
            break;
        }
      }
    } catch (error) {
      this.logger.error('NATS status monitor error', error);
    }
  }

  private async setupStreams() {
    if (!this.jsm) return;

    // Chat messages stream
    try {
      await this.jsm.streams.add({
        name: 'CHAT_MESSAGES',
        subjects: ['chat.room.*.message', 'chat.dm.*.message'],
        retention: RetentionPolicy.Limits,
        max_msgs: 100000,
        max_age: 30 * 24 * 60 * 60 * 1000000000, // 30 days in nanoseconds
        storage: StorageType.File,
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
        retention: RetentionPolicy.Limits,
        max_msgs: 10000,
        max_age: 5 * 60 * 1000000000, // 5 minutes
        storage: StorageType.Memory,
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
      this.logger.warn('JetStream not available, message will not be persisted');
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
    } catch (error: any) {
      // 503 = 스트림 없음 (NATS 파드 재배치 후) → 스트림 재생성 후 재시도
      if (error?.code === '503') {
        this.logger.warn('JetStream 503 — recreating streams and retrying');
        try {
          await this.setupStreams();
          await this.js.publish(subject, data, { msgID: message.id });
          this.logger.log('Retry publish succeeded after stream recreation');
          return;
        } catch (retryError) {
          this.logger.error('Retry publish failed after stream recreation', retryError);
        }
      }
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
    } catch (error: any) {
      if (error?.code === '503') {
        try {
          await this.setupStreams();
          await this.js.publish(subject, data);
          return;
        } catch { /* ignore retry failure for presence */ }
      }
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

  // Subscribe to room message broadcast events from agent-service
  async subscribeToRoomMessages(
    handler: (event: RoomMessageEvent) => void,
  ): Promise<() => void> {
    if (!this.nc) {
      this.logger.warn('NATS not connected, cannot subscribe to room messages');
      return () => {};
    }

    const subject = 'chat.message.room';
    const sub = this.nc.subscribe(subject);
    this.logger.log(`Subscribed to ${subject} for room message broadcasts`);

    (async () => {
      for await (const msg of sub) {
        try {
          const raw = JSON.parse(this.sc.decode(msg.data));
          // NestJS ClientProxy emit() wraps data in { pattern, data } envelope
          const event = (raw.data !== undefined && raw.pattern) ? raw.data : raw;
          handler(event as RoomMessageEvent);
        } catch (error) {
          this.logger.error('Failed to process room message event', error);
        }
      }
    })();

    return () => {
      sub.unsubscribe();
      this.logger.log(`Unsubscribed from ${subject}`);
    };
  }
}
