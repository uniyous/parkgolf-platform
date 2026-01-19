import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  NatsConnection,
  JetStreamClient,
  JetStreamManager,
  StringCodec,
  AckPolicy,
  DeliverPolicy,
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

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name);
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private sc = StringCodec();

  // Message handlers
  private messageHandlers: Map<string, (msg: ChatMessage) => void> = new Map();
  private presenceHandlers: ((event: PresenceEvent) => void)[] = [];
  private typingHandlers: Map<string, (event: TypingEvent) => void> = new Map();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
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
      await this.nc.drain();
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

    // Typing events (no persistence needed)
    try {
      await this.jsm.streams.add({
        name: 'CHAT_TYPING',
        subjects: ['chat.room.*.typing'],
        retention: 'limits' as any,
        max_msgs: 1000,
        max_age: 10 * 1000000000, // 10 seconds
        storage: 'memory' as any,
      });
      this.logger.log('Created CHAT_TYPING stream');
    } catch (error: any) {
      if (error.message?.includes('already in use')) {
        this.logger.log('CHAT_TYPING stream already exists');
      } else {
        this.logger.error('Failed to create CHAT_TYPING stream', error);
      }
    }
  }

  // Publish message to room
  async publishMessage(roomId: string, message: ChatMessage): Promise<void> {
    if (!this.js) {
      this.logger.warn('JetStream not available');
      return;
    }

    const subject = `chat.room.${roomId}.message`;
    const data = this.sc.encode(JSON.stringify(message));

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

  // Publish DM
  async publishDirectMessage(userIds: number[], message: ChatMessage): Promise<void> {
    if (!this.js) return;

    const sortedIds = userIds.sort((a, b) => a - b).join('-');
    const subject = `chat.dm.${sortedIds}.message`;
    const data = this.sc.encode(JSON.stringify(message));

    try {
      await this.js.publish(subject, data, {
        msgID: message.id,
      });
    } catch (error) {
      this.logger.error(`Failed to publish DM to ${subject}`, error);
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

  // Publish typing event
  async publishTyping(roomId: string, event: TypingEvent): Promise<void> {
    if (!this.js) return;

    const subject = `chat.room.${roomId}.typing`;
    const data = this.sc.encode(JSON.stringify(event));

    try {
      await this.js.publish(subject, data);
    } catch (error) {
      this.logger.error(`Failed to publish typing event`, error);
    }
  }

  // Subscribe to room messages
  async subscribeToRoom(
    roomId: string,
    consumerId: string,
    handler: (msg: ChatMessage) => void,
  ): Promise<void> {
    if (!this.js) return;

    const subject = `chat.room.${roomId}.message`;
    const consumerName = `room-${roomId}-${consumerId}`;

    try {
      // Create ephemeral consumer
      const consumer = await this.js.consumers.get('CHAT_MESSAGES', consumerName).catch(async () => {
        return await this.jsm!.consumers.add('CHAT_MESSAGES', {
          durable_name: consumerName,
          filter_subject: subject,
          ack_policy: AckPolicy.Explicit,
          deliver_policy: DeliverPolicy.New,
        }).then(() => this.js!.consumers.get('CHAT_MESSAGES', consumerName));
      });

      const messages = await consumer.consume();

      (async () => {
        for await (const msg of messages) {
          try {
            const chatMessage = JSON.parse(this.sc.decode(msg.data)) as ChatMessage;
            handler(chatMessage);
            msg.ack();
          } catch (error) {
            this.logger.error('Failed to process message', error);
            msg.nak();
          }
        }
      })();

      this.messageHandlers.set(consumerName, handler);
      this.logger.debug(`Subscribed to room ${roomId}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to room ${roomId}`, error);
    }
  }

  // Unsubscribe from room
  async unsubscribeFromRoom(roomId: string, consumerId: string): Promise<void> {
    const consumerName = `room-${roomId}-${consumerId}`;
    this.messageHandlers.delete(consumerName);

    if (this.jsm) {
      try {
        await this.jsm.consumers.delete('CHAT_MESSAGES', consumerName);
      } catch (error) {
        // Consumer may not exist
      }
    }
  }

  // Subscribe to typing events for a room
  async subscribeToTyping(
    roomId: string,
    handler: (event: TypingEvent) => void,
  ): Promise<void> {
    if (!this.nc) return;

    const subject = `chat.room.${roomId}.typing`;
    const sub = this.nc.subscribe(subject);

    (async () => {
      for await (const msg of sub) {
        try {
          const event = JSON.parse(this.sc.decode(msg.data)) as TypingEvent;
          handler(event);
        } catch (error) {
          this.logger.error('Failed to process typing event', error);
        }
      }
    })();

    this.typingHandlers.set(roomId, handler);
  }

  // Request to chat-service via NATS
  async requestChatService<T>(pattern: string, data: any): Promise<T> {
    if (!this.nc) {
      throw new Error('NATS not connected');
    }

    const response = await this.nc.request(
      `chat.${pattern}`,
      this.sc.encode(JSON.stringify(data)),
      { timeout: 5000 },
    );

    return JSON.parse(this.sc.decode(response.data));
  }

  isConnected(): boolean {
    return this.nc !== null && !this.nc.isClosed();
  }
}
