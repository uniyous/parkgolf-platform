import {
  ClusterAdapterWithHeartbeat,
  ClusterAdapterOptions,
  ClusterMessage,
  ClusterResponse,
  Offset,
  ServerId,
} from 'socket.io-adapter';
import { NatsConnection, Subscription, JSONCodec } from 'nats';

const jc = JSONCodec();

export class NatsSocketAdapter extends ClusterAdapterWithHeartbeat {
  private readonly channel: string;
  private readonly responseChannel: string;
  private broadcastSub: Subscription | null = null;
  private responseSub: Subscription | null = null;

  constructor(
    nsp: any,
    private readonly nc: NatsConnection,
    opts?: ClusterAdapterOptions,
  ) {
    super(nsp, opts || {});
    // Namespace name is e.g. "/chat" — sanitize for NATS subject
    const nspName = nsp.name.replace(/\//g, '_') || '_root';
    this.channel = `socketio.${nspName}`;
    this.responseChannel = `${this.channel}.response`;
  }

  override init(): void {
    // Subscribe to broadcast channel (all pods)
    this.broadcastSub = this.nc.subscribe(this.channel, {
      callback: (_err, msg) => {
        if (_err) return;
        try {
          const message = jc.decode(msg.data) as ClusterMessage;
          if (message.uid === this.uid) return; // ignore own messages
          this.onMessage(message);
        } catch {
          // ignore decode errors
        }
      },
    });

    // Subscribe to response channel (targeted at this pod)
    this.responseSub = this.nc.subscribe(
      `${this.responseChannel}.${this.uid}`,
      {
        callback: (_err, msg) => {
          if (_err) return;
          try {
            const response = jc.decode(msg.data) as ClusterResponse;
            this.onResponse(response);
          } catch {
            // ignore decode errors
          }
        },
      },
    );

    // Start heartbeat (calls super.init())
    super.init();
  }

  protected async doPublish(message: ClusterMessage): Promise<Offset> {
    this.nc.publish(this.channel, jc.encode(message));
    return Date.now().toString();
  }

  protected async doPublishResponse(
    requesterUid: ServerId,
    response: ClusterResponse,
  ): Promise<void> {
    this.nc.publish(
      `${this.responseChannel}.${requesterUid}`,
      jc.encode(response),
    );
  }

  override close(): void {
    if (this.broadcastSub) {
      this.broadcastSub.unsubscribe();
      this.broadcastSub = null;
    }
    if (this.responseSub) {
      this.responseSub.unsubscribe();
      this.responseSub = null;
    }
    super.close();
  }
}

export function createNatsAdapter(
  nc: NatsConnection,
  opts?: ClusterAdapterOptions,
) {
  return function (nsp: any) {
    return new NatsSocketAdapter(nsp, nc, opts);
  };
}
