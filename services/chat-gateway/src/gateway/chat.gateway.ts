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
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { NatsService, ChatMessage, TypingEvent } from '../nats/nats.service';
import { AuthenticatedSocket, WsUser } from '../common/ws.types';
import { authenticateSocket } from '../common/ws.utils';
import { getCorsConfig } from '../common/cors.config';
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

@WebSocketGateway({
  cors: getCorsConfig(),
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Track online users on THIS pod: Map<socket.id, user>
  private onlineUsers: Map<string, WsUser> = new Map();

  // Token expiry check interval
  private tokenCheckInterval: ReturnType<typeof setInterval> | null = null;

  // NATS status subscription
  private natsStatusSubscription: Subscription | null = null;

  constructor(
    private readonly natsService: NatsService,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit() {
    // Check for expired tokens every 60 seconds
    this.tokenCheckInterval = setInterval(() => {
      this.checkExpiredTokens();
    }, 60_000);

    // Subscribe to NATS connection status and broadcast to all Socket.IO clients
    this.natsStatusSubscription = this.natsService.natsStatus$.subscribe((connected) => {
      this.logger.log(`NATS status changed: ${connected ? 'connected' : 'disconnected'}, broadcasting to clients`);
      this.server?.emit('system:nats_status', { connected });
    });
  }

  onModuleDestroy() {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }
    if (this.natsStatusSubscription) {
      this.natsStatusSubscription.unsubscribe();
      this.natsStatusSubscription = null;
    }
  }

  private checkExpiredTokens() {
    const now = Math.floor(Date.now() / 1000);
    const WARNING_THRESHOLD = 5 * 60; // 5 minutes before expiry

    for (const [socketId, user] of this.onlineUsers) {
      const socket = this.server?.sockets?.sockets?.get(socketId) as AuthenticatedSocket | undefined;
      if (!socket) continue;

      const tokenExp = socket.data?.tokenExp;
      if (!tokenExp) continue;

      const timeLeft = tokenExp - now;

      if (timeLeft <= 0) {
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
    const user = await authenticateSocket(client, this.jwtService, this.logger);
    if (!user) return;

    // Track online user on this pod
    this.onlineUsers.set(client.id, user);

    // Join user-specific room for DM and cross-pod presence
    client.join(`user:${user.id}`);

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
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const user = this.onlineUsers.get(client.id);
    if (!user) return;

    // Remove from local tracking
    this.onlineUsers.delete(client.id);

    // Check all pods for remaining sockets of this user via adapter
    try {
      const remoteSockets = await this.server.in(`user:${user.id}`).fetchSockets();
      if (remoteSockets.length === 0) {
        // User is fully offline across all pods
        await this.natsService.publishPresence(user.id, {
          userId: user.id,
          userName: user.name,
          status: 'offline',
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // Fallback: if fetchSockets fails, check local only
      const hasLocalSockets = Array.from(this.onlineUsers.values()).some(u => u.id === user.id);
      if (!hasLocalSockets) {
        await this.natsService.publishPresence(user.id, {
          userId: user.id,
          userName: user.name,
          status: 'offline',
          timestamp: new Date().toISOString(),
        });
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

    // Join Socket.IO room — adapter handles cross-pod broadcast
    client.join(roomId);

    this.logger.log(`User ${user.name} joined room ${roomId}`);

    // Notify room members (adapter propagates to all pods)
    this.server.to(roomId).emit('user_joined', {
      roomId,
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
    });

    // Dismiss chat notifications for this room
    this.natsService.emitNotificationDismiss({
      userId: String(user.id),
      type: 'CHAT_MESSAGE',
      dataFilter: { chatRoomId: roomId },
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

    // Leave Socket.IO room
    client.leave(roomId);

    this.logger.log(`User ${user.name} left room ${roomId}`);

    // Notify room members (adapter propagates to all pods)
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

    // 1. Broadcast to other clients (adapter propagates to all pods)
    client.to(roomId).emit('new_message', message);
    this.logger.debug(`Message sent to room ${roomId} by ${user.name}`);

    // 2. JetStream 발행 - 비동기 (메시지 영속성, chat-service consumer가 DB 저장)
    this.natsService.publishMessage(roomId, message).catch((error) => {
      this.logger.error(`Failed to publish message to JetStream: ${error}`);
    });

    // 3. 오프라인 참여자에게 push 알림
    this.sendChatNotifications(roomId, user, content).catch((error) => {
      this.logger.error(`Failed to send chat notifications: ${error}`);
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

    // Broadcast typing to room (adapter propagates to all pods)
    client.to(roomId).emit('typing', event);
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
    return { success: true, timestamp: Date.now() };
  }

  @SubscribeMessage('get_online_users')
  handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    const users = Array.from(this.onlineUsers.values()).map((u) => ({
      id: u.id,
      name: u.name,
    }));

    return { success: true, data: users };
  }

  private async sendChatNotifications(roomId: string, sender: WsUser, content: string): Promise<void> {
    const roomResult = await this.natsService.requestChatService<{
      success: boolean; data: { members: { userId: number }[] };
    }>('rooms.get', { roomId });
    if (!roomResult?.success) return;

    const members = roomResult.data.members || [];

    // Fetch sockets across all pods via adapter
    const sockets = await this.server.in(roomId).fetchSockets();
    const onlineUserIds = new Set(
      sockets
        .map(s => s.data?.userId as number | undefined)
        .filter((id): id is number => id != null),
    );

    const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
    for (const member of members) {
      if (member.userId === sender.id || onlineUserIds.has(member.userId)) continue;
      this.natsService.emitChatMessageNotification({
        chatRoomId: roomId, senderId: sender.id, senderName: sender.name,
        recipientId: member.userId, messagePreview: preview, createdAt: new Date().toISOString(),
      });
    }
  }
}
