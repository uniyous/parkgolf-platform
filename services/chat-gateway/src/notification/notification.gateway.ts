import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedSocket, WsUser } from '../auth/ws-auth.guard';
import { NatsService } from '../nats/nats.service';

export interface NotificationPayload {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3002',
      /^https:\/\/.*\.run\.app$/,
      'https://parkgolf-user.web.app',
      'https://parkgolf-user-dev.web.app',
      'https://dev-api.goparkmate.com',
      'https://api.goparkmate.com',
    ],
    credentials: true,
  },
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

  // Track online users: Map<socket.id, user>
  private onlineUsers: Map<string, WsUser> = new Map();

  // NATS subscription cleanup
  private natsSubscription: (() => void) | null = null;

  constructor(
    private readonly natsService: NatsService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // Subscribe to notification events from NATS
    await this.subscribeToNotifications();
  }

  async onModuleDestroy() {
    if (this.natsSubscription) {
      this.natsSubscription();
      this.natsSubscription = null;
    }
  }

  private async subscribeToNotifications() {
    // Subscribe to notification.created events
    this.natsSubscription = await this.natsService.subscribeToNotifications(
      (notification: NotificationPayload) => {
        this.deliverNotificationToUser(notification);
      },
    );
  }

  private deliverNotificationToUser(notification: NotificationPayload) {
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
    try {
      // Authenticate on connection
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Connection rejected: No token - ${client.id}`);
        client.emit('error', { message: 'Unauthorized' });
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const user: WsUser = {
        id: payload.sub || payload.id,
        email: payload.email,
        name: payload.name,
      };
      client.user = user;

      const userId = String(user.id);

      // Track online user
      this.onlineUsers.set(client.id, user);

      // Track user's sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(
        `User connected to notifications: ${user.name || user.email} (${userId}) - Socket: ${client.id}`,
      );

      // Send connection success
      client.emit('connected', {
        userId: user.id,
        name: user.name,
        socketId: client.id,
      });
    } catch (error) {
      this.logger.warn(`Connection failed: ${error} - ${client.id}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const user = this.onlineUsers.get(client.id);
    if (!user) return;

    const userId = String(user.id);

    // Remove from online users
    this.onlineUsers.delete(client.id);

    // Remove from user sockets
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(
      `User disconnected from notifications: ${user.name || user.email} (${userId}) - Socket: ${client.id}`,
    );
  }

  // Utility method to broadcast to specific user (can be called from other services)
  broadcastToUser(userId: string, event: string, data: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  // Get connected user count
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const token = client.handshake.query.token;
    if (typeof token === 'string') {
      return token;
    }

    const auth = client.handshake.auth;
    if (auth?.token) {
      return auth.token;
    }

    return null;
  }
}
