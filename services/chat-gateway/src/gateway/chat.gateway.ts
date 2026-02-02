import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, UseGuards, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NatsService, ChatMessage, TypingEvent } from '../nats/nats.service';
import { WsAuthGuard, AuthenticatedSocket, WsUser } from '../auth/ws-auth.guard';
import { v4 as uuidv4 } from 'uuid';

interface SendMessageDto {
  roomId: string;
  content: string;
  type?: 'text' | 'image';
}

interface JoinRoomDto {
  roomId: string;
}

interface TypingDto {
  roomId: string;
  isTyping: boolean;
}

interface DirectMessageDto {
  targetUserId: number;
  content: string;
  type?: 'text' | 'image';
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [
          'http://localhost:3002',
          'https://parkgolf-user.web.app',
          'https://parkgolf-user-dev.web.app',
          'https://dev-user.goparkmate.com',
          'https://user.goparkmate.com',
          'https://dev-api.goparkmate.com',
          'https://api.goparkmate.com',
        ],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Track online users: Map<socket.id, user>
  private onlineUsers: Map<string, WsUser> = new Map();

  // Track user sockets: Map<userId, Set<socket.id>>
  private userSockets: Map<number, Set<string>> = new Map();

  // Track room subscriptions: Map<roomId, Set<socket.id>>
  private roomSubscriptions: Map<string, Set<string>> = new Map();

  // Token expiry check interval
  private tokenCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly natsService: NatsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    // Check for expired tokens every 60 seconds
    this.tokenCheckInterval = setInterval(() => {
      this.checkExpiredTokens();
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }
  }

  private checkExpiredTokens() {
    const now = Math.floor(Date.now() / 1000);
    const WARNING_THRESHOLD = 5 * 60; // 5 minutes before expiry

    for (const [socketId, user] of this.onlineUsers) {
      const socket = this.server?.sockets?.sockets?.get(socketId) as AuthenticatedSocket | undefined;
      if (!socket) continue;

      const tokenExp = (socket as any).data?.tokenExp;
      if (!tokenExp) continue;

      const timeLeft = tokenExp - now;

      if (timeLeft <= 0) {
        // JWT expired — notify client to refresh REST API token.
        // WebSocket session stays alive (server session-based).
        this.logger.debug(`Token expired for user ${user.id}, sending refresh reminder`);
        socket.emit('token_refresh_needed', { message: 'Please refresh your REST API token' });
      } else if (timeLeft <= WARNING_THRESHOLD) {
        socket.emit('token_expiring', {
          message: 'Token expiring soon',
          expiresIn: timeLeft,
        });
      }
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

      // Store token expiry for periodic check
      if (payload.exp) {
        (client as any).data = { ...(client as any).data, tokenExp: payload.exp };
      }

      // Track online user
      this.onlineUsers.set(client.id, user);

      // Track user's sockets
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      // Publish online status
      await this.natsService.publishPresence(user.id, {
        userId: user.id,
        userName: user.name,
        status: 'online',
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User connected: ${user.name} (${user.id}) - Socket: ${client.id}`);

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

    // Remove from online users
    this.onlineUsers.delete(client.id);

    // Remove from user sockets
    const sockets = this.userSockets.get(user.id);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(user.id);

        // User is fully offline
        await this.natsService.publishPresence(user.id, {
          userId: user.id,
          userName: user.name,
          status: 'offline',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Remove from room subscriptions
    for (const [roomId, subscribers] of this.roomSubscriptions) {
      if (subscribers.has(client.id)) {
        subscribers.delete(client.id);
        await this.natsService.unsubscribeFromRoom(roomId, client.id);
      }
    }

    this.logger.log(`User disconnected: ${user.name} (${user.id}) - Socket: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinRoomDto,
  ) {
    const user = client.user;
    if (!user) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } };
    }

    const { roomId } = data;

    // Verify room membership via chat-service
    try {
      const result = await this.natsService.requestChatService<{
        success: boolean;
        data: { isMember: boolean };
      }>('rooms.checkMembership', { roomId, userId: user.id });

      if (!result?.success || !result?.data?.isMember) {
        this.logger.warn(`User ${user.id} denied access to room ${roomId} — not a member`);
        return { success: false, error: { code: 'FORBIDDEN', message: 'Not a room member' } };
      }
    } catch (error) {
      this.logger.error(`Membership check failed for room ${roomId}: ${error}`);
      return { success: false, error: { code: 'MEMBERSHIP_CHECK_ERROR', message: 'Failed to verify room membership' } };
    }

    // Join Socket.io room
    client.join(roomId);

    // Track subscription
    if (!this.roomSubscriptions.has(roomId)) {
      this.roomSubscriptions.set(roomId, new Set());
    }
    this.roomSubscriptions.get(roomId)!.add(client.id);

    // Subscribe to NATS for this room
    await this.natsService.subscribeToRoom(roomId, client.id, (message) => {
      // Broadcast to all clients in the room except sender
      client.to(roomId).emit('new_message', message);
    });

    // Subscribe to typing events
    await this.natsService.subscribeToTyping(roomId, (event) => {
      if (event.userId !== user.id) {
        client.emit('typing', event);
      }
    });

    this.logger.log(`User ${user.name} joined room ${roomId}`);

    // Notify room members
    this.server.to(roomId).emit('user_joined', {
      roomId,
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
    });

    return { success: true, data: { roomId } };
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinRoomDto,
  ) {
    const user = client.user;
    if (!user) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } };
    }

    const { roomId } = data;

    // Leave Socket.io room
    client.leave(roomId);

    // Remove from tracking
    const subscribers = this.roomSubscriptions.get(roomId);
    if (subscribers) {
      subscribers.delete(client.id);
    }

    // Unsubscribe from NATS
    await this.natsService.unsubscribeFromRoom(roomId, client.id);

    this.logger.log(`User ${user.name} left room ${roomId}`);

    // Notify room members
    this.server.to(roomId).emit('user_left', {
      roomId,
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
    });

    return { success: true, data: { roomId } };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    const user = client.user;
    if (!user) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } };
    }

    const { roomId, content, type = 'text' } = data;

    // Verify sender has joined the room (lightweight Socket.IO room check)
    if (!client.rooms.has(roomId)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Not a room member' } };
    }

    const message: ChatMessage = {
      id: uuidv4(),
      roomId,
      senderId: user.id,
      senderName: user.name,
      content,
      type,
      createdAt: new Date().toISOString(),
    };

    // 1. 다른 클라이언트에만 브로드캐스트 (발신자 제외 — 발신자는 ACK로 수신)
    client.to(roomId).emit('new_message', message);
    this.logger.debug(`Message sent to room ${roomId} by ${user.name}`);

    // 2. DB 저장 - 비동기 (응답 대기 없이)
    this.natsService.requestChatService('messages.save', {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderName: message.senderName,
      content: message.content,
      type: message.type.toUpperCase(),
      createdAt: message.createdAt,
    }).catch((error) => {
      this.logger.error(`Failed to save message to DB: ${error}`);
    });

    // 3. JetStream 발행 - 비동기 (다른 인스턴스 전달용)
    this.natsService.publishMessage(roomId, message).catch((error) => {
      this.logger.error(`Failed to publish message to JetStream: ${error}`);
    });

    return { success: true, message };
  }

  @SubscribeMessage('send_dm')
  async handleSendDirectMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: DirectMessageDto,
  ) {
    const user = client.user;
    if (!user) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } };
    }

    const { targetUserId, content, type = 'text' } = data;
    const userIds = [user.id, targetUserId];
    const dmRoomId = `dm-${userIds.sort((a, b) => a - b).join('-')}`;

    const message: ChatMessage = {
      id: uuidv4(),
      roomId: dmRoomId,
      senderId: user.id,
      senderName: user.name,
      content,
      type,
      createdAt: new Date().toISOString(),
    };

    // 1. 상대방 소켓에만 전달 (발신자는 ACK로 수신)
    const targetSockets = this.userSockets.get(targetUserId);
    if (targetSockets) {
      for (const socketId of targetSockets) {
        this.server.to(socketId).emit('new_dm', message);
      }
    }

    // 2. DB 저장 - 비동기 (응답 대기 없이)
    this.natsService.requestChatService('messages.save', {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderName: message.senderName,
      content: message.content,
      type: message.type.toUpperCase(),
      createdAt: message.createdAt,
    }).catch((error) => {
      this.logger.error(`Failed to save DM to DB: ${error}`);
    });

    // 3. JetStream 발행 - 비동기
    this.natsService.publishDirectMessage(userIds, message).catch((error) => {
      this.logger.error(`Failed to publish DM to JetStream: ${error}`);
    });

    return { success: true, message };
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingDto,
  ) {
    const user = client.user;
    if (!user) return;

    const { roomId, isTyping } = data;

    const event: TypingEvent = {
      roomId,
      userId: user.id,
      userName: user.name,
      isTyping,
    };

    // Publish to NATS
    await this.natsService.publishTyping(roomId, event);

    // Also emit directly to room
    client.to(roomId).emit('typing', event);
  }

  @SubscribeMessage('get_online_users')
  handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    const users = Array.from(this.onlineUsers.values()).map((u) => ({
      id: u.id,
      name: u.name,
    }));

    return { success: true, data: users };
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    // 1. Preferred: auth object (Socket.IO auth)
    const auth = client.handshake.auth;
    if (auth?.token) {
      return auth.token;
    }

    // 2. Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 3. Deprecated: query param (token exposed in URL/logs)
    const token = client.handshake.query.token;
    if (typeof token === 'string') {
      this.logger.warn(
        `[DEPRECATION] Client ${client.id} using query param for token. ` +
        'Migrate to auth object or Authorization header.',
      );
      return token;
    }

    return null;
  }
}
