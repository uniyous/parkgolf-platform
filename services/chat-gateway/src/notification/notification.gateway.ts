import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NatsService, NotificationEvent } from '../nats/nats.service';
import { AuthenticatedSocket } from '../common/ws.types';
import { authenticateSocket } from '../common/ws.utils';
import { getCorsConfig } from '../common/cors.config';

@WebSocketGateway({
  cors: getCorsConfig(),
  namespace: '/notification',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  // Track user sockets: Map<userId, Set<socket.id>>
  private userSockets: Map<string, Set<string>> = new Map();

  // NATS subscription cleanup
  private natsSubscription: (() => void) | null = null;

  constructor(
    private readonly natsService: NatsService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    this.natsSubscription = await this.natsService.subscribeToNotifications(
      (notification: NotificationEvent) => {
        this.deliverNotificationToUser(notification);
      },
    );
  }

  async onModuleDestroy() {
    if (this.natsSubscription) {
      this.natsSubscription();
      this.natsSubscription = null;
    }
  }

  private deliverNotificationToUser(notification: NotificationEvent) {
    const { userId } = notification;
    const userSocketIds = this.userSockets.get(userId);

    if (userSocketIds && userSocketIds.size > 0) {
      for (const socketId of userSocketIds) {
        this.server.to(socketId).emit('notification', notification);
      }
      this.logger.log(
        `Delivered notification ${notification.id} to user ${userId} (${userSocketIds.size} sockets)`,
      );
    } else {
      this.logger.debug(`User ${userId} not connected, notification ${notification.id} not delivered via WebSocket`);
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    const user = await authenticateSocket(client, this.jwtService, this.logger);
    if (!user) return;

    const userId = String(user.id);

    // Track user's sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    this.logger.log(
      `User connected to notifications: ${user.name} (${userId}) - Socket: ${client.id}`,
    );

    client.emit('connected', {
      userId: user.id,
      name: user.name,
      socketId: client.id,
    });
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const user = client.user;
    if (!user) return;

    const userId = String(user.id);

    // Remove from user sockets
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(
      `User disconnected from notifications: ${user.name} (${userId}) - Socket: ${client.id}`,
    );
  }
}
