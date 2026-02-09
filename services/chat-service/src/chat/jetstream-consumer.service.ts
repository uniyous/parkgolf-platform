import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  NatsConnection,
  JetStreamClient,
  JetStreamManager,
  StringCodec,
  ConsumerMessages,
  AckPolicy,
  DeliverPolicy,
} from 'nats';
import { ChatService, SaveMessageDto } from './chat.service';

@Injectable()
export class JetStreamConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JetStreamConsumerService.name);
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private consumerMessages: ConsumerMessages | null = null;
  private readonly sc = StringCodec();

  private static readonly STREAM_NAME = 'CHAT_MESSAGES';
  private static readonly CONSUMER_NAME = 'chat-service-messages';

  constructor(
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  async onModuleInit() {
    const natsUrl = this.configService.get<string>('NATS_URL');
    if (!natsUrl) {
      this.logger.warn('NATS_URL not configured, JetStream consumer disabled');
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

      this.logger.log(`Connected to NATS JetStream: ${natsUrl}`);

      await this.ensureConsumer();
      await this.startConsuming();
    } catch (error) {
      this.logger.error('Failed to initialize JetStream consumer', error);
    }
  }

  async onModuleDestroy() {
    if (this.consumerMessages) {
      this.consumerMessages.close();
      this.consumerMessages = null;
    }
    if (this.nc) {
      try {
        await this.nc.drain();
      } catch (error: any) {
        if (error?.code !== 'CONNECTION_DRAINING') {
          this.logger.warn(`NATS drain error: ${error.message}`);
        }
      }
      this.nc = null;
    }
  }

  private async ensureConsumer(): Promise<void> {
    if (!this.jsm) return;

    try {
      await this.jsm.consumers.info(
        JetStreamConsumerService.STREAM_NAME,
        JetStreamConsumerService.CONSUMER_NAME,
      );
      this.logger.log(`Consumer '${JetStreamConsumerService.CONSUMER_NAME}' already exists`);
    } catch {
      // Consumer doesn't exist, create it
      await this.jsm.consumers.add(JetStreamConsumerService.STREAM_NAME, {
        durable_name: JetStreamConsumerService.CONSUMER_NAME,
        deliver_policy: DeliverPolicy.All,
        ack_policy: AckPolicy.Explicit,
        ack_wait: 30_000_000_000, // 30 seconds in nanoseconds
      });
      this.logger.log(`Created durable consumer '${JetStreamConsumerService.CONSUMER_NAME}'`);
    }
  }

  private async startConsuming(): Promise<void> {
    if (!this.js) return;

    const consumer = await this.js.consumers.get(
      JetStreamConsumerService.STREAM_NAME,
      JetStreamConsumerService.CONSUMER_NAME,
    );

    this.consumerMessages = await consumer.consume();
    this.logger.log('Started consuming messages from CHAT_MESSAGES stream');

    this.processMessages();
  }

  private async processMessages(): Promise<void> {
    if (!this.consumerMessages) return;

    for await (const msg of this.consumerMessages) {
      try {
        const raw = this.sc.decode(msg.data);
        const data: SaveMessageDto = JSON.parse(raw);

        await this.chatService.saveMessage(data);
        msg.ack();

        this.logger.debug(`Processed and saved message: ${data.id}`);
      } catch (error: any) {
        this.logger.error(`Failed to process JetStream message: ${error.message}`);
        msg.nak();
      }
    }
  }
}
