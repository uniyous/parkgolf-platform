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
  /** 소비 루프 세대. 재구독/재시작 때 증가시켜 옛 루프의 종료 콜백을 무효화(무한 재구독 방지). */
  private generation = 0;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private readonly sc = StringCodec();

  private static readonly STREAM_NAME = 'CHAT_MESSAGES';
  private static readonly CONSUMER_NAME = 'chat-service-messages';
  private static readonly RESUBSCRIBE_DEBOUNCE_MS = 500;
  private static readonly WATCHDOG_INTERVAL_MS = 30_000;

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
      // 주기 watchdog — 연결은 유지된 채 stream/consumer 가 재생성돼 소비가 멈춘 경우 복구 (UNI-39)
      this.startWatchdog();
    } catch (error) {
      this.logger.error('Failed to initialize JetStream consumer', error);
    }
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.watchdog) {
      clearInterval(this.watchdog);
      this.watchdog = null;
    }
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

  /**
   * 주기 watchdog (UNI-39). NATS 연결은 유지된 채 stream/consumer 가 재생성(gateway 503 복구 등)되면
   * reconnect 이벤트가 안 와서 소비가 조용히 멈춘다. 주기적으로 consumer 존재 + 소비 상태를 점검해 복구.
   */
  private startWatchdog(): void {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => {
      if (this.isShuttingDown) return;
      void this.ensureHealthy();
    }, JetStreamConsumerService.WATCHDOG_INTERVAL_MS);
  }

  private async ensureHealthy(): Promise<void> {
    if (this.isShuttingDown || this.resubscribePending || !this.jsm) return;
    // 소비 iterator 가 없으면 즉시 재구독
    if (!this.consumerMessages) {
      this.logger.warn('Watchdog: no active consumer iterator — resubscribing');
      this.scheduleResubscribe();
      return;
    }
    // consumer 가 실제로 존재하는지 확인 (stream/consumer 재생성으로 사라졌을 수 있음)
    try {
      await this.jsm.consumers.info(
        JetStreamConsumerService.STREAM_NAME,
        JetStreamConsumerService.CONSUMER_NAME,
      );
    } catch {
      this.logger.warn('Watchdog: consumer missing — resubscribing');
      this.scheduleResubscribe();
    }
  }

  private async resubscribe(): Promise<void> {
    if (this.isShuttingDown || !this.nc) return;
    try {
      // 세대 증가 → 곧 닫을 옛 루프의 종료 콜백이 재구독을 다시 트리거하지 않도록 무효화
      this.generation++;
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
    const gen = ++this.generation;
    this.logger.log('Started consuming messages from CHAT_MESSAGES stream');

    void this.processMessages(this.consumerMessages, gen);
  }

  private async processMessages(cm: ConsumerMessages, gen: number): Promise<void> {
    try {
      for await (const msg of cm) {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Consume loop error: ${message}`);
    } finally {
      // 루프 종료 = consumer/iterator 가 닫힘(stream·consumer 재생성 등). 종료 중이 아니고
      // 이 루프가 최신 세대일 때만 재구독 (재구독으로 교체된 옛 루프는 무시 → 무한 재구독 방지, UNI-39).
      if (!this.isShuttingDown && gen === this.generation) {
        this.logger.warn('Consume loop ended — scheduling resubscribe');
        this.scheduleResubscribe();
      }
    }
  }
}
