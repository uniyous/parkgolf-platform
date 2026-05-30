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
  private isShuttingDown = false;
  private resubscribePending = false;
  private readonly sc = StringCodec();

  private static readonly STREAM_NAME = 'CHAT_MESSAGES';
  private static readonly CONSUMER_NAME = 'chat-service-messages';
  private static readonly RESUBSCRIBE_DEBOUNCE_MS = 500;

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

      // NATS 연결 상태 변화 감지 → reconnect 시 consumer 자동 재구독
      this.watchConnectionStatus();
    } catch (error) {
      this.logger.error('Failed to initialize JetStream consumer', error);
    }
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.consumerMessages) {
      this.consumerMessages.close();
      this.consumerMessages = null;
    }
    if (this.nc) {
      try {
        await this.nc.drain();
      } catch (error: unknown) {
        const isConnectionDraining = error instanceof Error && 'code' in error && (error as { code: string }).code === 'CONNECTION_DRAINING';
        if (!isConnectionDraining) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`NATS drain error: ${message}`);
        }
      }
      this.nc = null;
    }
  }

  /**
   * NATS 연결 상태 변화 감지.
   * reconnect 발생 시 ConsumerMessages iterator는 자동 갱신되지 않으므로
   * 명시적으로 재구독한다 (disconnect 동안 stream에 쌓인 메시지 손실 방지).
   */
  private async watchConnectionStatus(): Promise<void> {
    if (!this.nc) return;
    try {
      for await (const status of this.nc.status()) {
        if (this.isShuttingDown) break;
        switch (status.type) {
          case 'reconnect':
            this.logger.warn(`NATS reconnected: ${String(status.data)} — scheduling consumer resubscribe`);
            this.scheduleResubscribe();
            break;
          case 'disconnect':
            this.logger.warn(`NATS disconnected: ${String(status.data)}`);
            break;
          case 'reconnecting':
            this.logger.warn(`NATS reconnecting: ${String(status.data)}`);
            break;
          case 'error':
            this.logger.error(`NATS error: ${String(status.data)}`);
            break;
          default:
            break;
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`NATS status watcher ended: ${message}`);
    }
  }

  /**
   * 짧은 시간 안에 reconnect 이벤트가 여러 번 와도 한 번만 재구독 수행.
   */
  private scheduleResubscribe(): void {
    if (this.resubscribePending || this.isShuttingDown) return;
    this.resubscribePending = true;
    setTimeout(() => {
      this.resubscribePending = false;
      void this.resubscribe();
    }, JetStreamConsumerService.RESUBSCRIBE_DEBOUNCE_MS);
  }

  private async resubscribe(): Promise<void> {
    if (this.isShuttingDown || !this.nc) return;
    try {
      if (this.consumerMessages) {
        try {
          this.consumerMessages.close();
        } catch {
          // ignore — 이미 닫힌 iterator일 수 있음
        }
        this.consumerMessages = null;
      }

      // jetstream client / manager 재바인딩 (NatsConnection은 유지, 내부 컨텍스트만 갱신)
      this.js = this.nc.jetstream();
      this.jsm = await this.nc.jetstreamManager();

      await this.ensureConsumer();
      await this.startConsuming();

      this.logger.log('Resubscribed to JetStream consumer after NATS reconnect');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to resubscribe after reconnect: ${message}`);
      // 재시도 — 다음 reconnect 이벤트 또는 별도 backoff에서 처리되지 않으면 다시 시도
      if (!this.isShuttingDown) {
        setTimeout(() => this.scheduleResubscribe(), 5000);
      }
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
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to process JetStream message: ${message}`);
        msg.nak();
      }
    }
  }
}
