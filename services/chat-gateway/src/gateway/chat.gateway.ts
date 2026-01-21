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
import { Logger, UseGuards } from '@nestjs/common';
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
    origin: [
      'http://localhost:3002',
      /^https:\/\/.*\.run\.app$/,
      'https://parkgolf-user.web.app',
      'https://parkgolf-user-dev.web.app',
    ],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Track online users: Map<socket.id, user>
  private onlineUsers: Map<string, WsUser> = new Map();

  // Track user sockets: Map<userId, Set<socket.id>>
  private userSockets: Map<number, Set<string>> = new Map();

  // Track room subscriptions: Map<roomId, Set<socket.id>>
  private roomSubscriptions: Map<string, Set<string>> = new Map();

  constructor(
    private readonly natsService: NatsService,
    private readonly jwtService: JwtService,
  ) {}

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
      return { success: false, error: 'Not authenticated' };
    }

    const { roomId } = data;

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

    return { success: true, roomId };
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinRoomDto,
  ) {
    const user = client.user;
    if (!user) {
      return { success: false, error: 'Not authenticated' };
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

    return { success: true, roomId };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    const user = client.user;
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { roomId, content, type = 'text' } = data;

    const message: ChatMessage = {
      id: uuidv4(),
      roomId,
      senderId: user.id,
      senderName: user.name,
      content,
      type,
      createdAt: new Date().toISOString(),
    };

    try {
      // Save message to DB via chat-service
      await this.natsService.requestChatService('messages.save', {
        id: message.id,
        roomId: message.roomId,
        senderId: message.senderId,
        senderName: message.senderName,
        content: message.content,
        type: message.type.toUpperCase(),
      });

      // Publish to NATS JetStream for real-time delivery to other instances
      await this.natsService.publishMessage(roomId, message);

      // Also emit directly to the room for instant delivery
      this.server.to(roomId).emit('new_message', message);

      this.logger.debug(`Message sent to room ${roomId} by ${user.name}`);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Failed to send message: ${error}`);
      return { success: false, error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('send_dm')
  async handleSendDirectMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: DirectMessageDto,
  ) {
    const user = client.user;
    if (!user) {
      return { success: false, error: 'Not authenticated' };
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

    try {
      // Save message to DB via chat-service
      await this.natsService.requestChatService('messages.save', {
        id: message.id,
        roomId: message.roomId,
        senderId: message.senderId,
        senderName: message.senderName,
        content: message.content,
        type: message.type.toUpperCase(),
      });

      // Publish to NATS JetStream
      await this.natsService.publishDirectMessage(userIds, message);

      // Send to target user if online
      const targetSockets = this.userSockets.get(targetUserId);
      if (targetSockets) {
        for (const socketId of targetSockets) {
          this.server.to(socketId).emit('new_dm', message);
        }
      }

      // Send back to sender
      client.emit('new_dm', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Failed to send DM: ${error}`);
      return { success: false, error: 'Failed to send message' };
    }
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

    return { success: true, users };
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
