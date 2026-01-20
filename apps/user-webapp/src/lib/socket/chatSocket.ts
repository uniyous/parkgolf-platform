import { io, Socket } from 'socket.io-client';
import type { ChatMessage } from '@/lib/api/chatApi';

// ============================================
// 환경 설정
// ============================================

const mode = (import.meta as any).env?.MODE;
const isDev = mode === 'development' || mode === 'e2e';

const SOCKET_URL = isDev
  ? 'http://localhost:3003' // 개발 환경
  : (import.meta as any).env?.VITE_CHAT_SOCKET_URL ||
    'https://chat-gateway-dev-iihuzmuufa-du.a.run.app';

const NAMESPACE = '/chat';

// ============================================
// 타입 정의
// ============================================

export interface TypingEvent {
  roomId: string;
  userId: string;
  userName: string | null;
  isTyping: boolean;
}

export interface UserJoinedEvent {
  roomId: string;
  userId: string;
  userName: string | null;
}

export interface UserLeftEvent {
  roomId: string;
  userId: string;
  userName: string | null;
}

export type MessageHandler = (message: ChatMessage) => void;
export type TypingHandler = (event: TypingEvent) => void;
export type UserJoinedHandler = (event: UserJoinedEvent) => void;
export type UserLeftHandler = (event: UserLeftEvent) => void;
export type ConnectionHandler = () => void;
export type ErrorHandler = (error: string) => void;

// ============================================
// Chat Socket Manager
// ============================================

class ChatSocketManager {
  private socket: Socket | null = null;
  private token: string | null = null;
  private isConnecting = false;

  // Event handlers
  private messageHandlers: Set<MessageHandler> = new Set();
  private typingHandlers: Set<TypingHandler> = new Set();
  private userJoinedHandlers: Set<UserJoinedHandler> = new Set();
  private userLeftHandlers: Set<UserLeftHandler> = new Set();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();

  // ============================================
  // Connection
  // ============================================

  connect(token: string): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.token = token;
    this.isConnecting = true;

    this.socket = io(`${SOCKET_URL}${NAMESPACE}`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      auth: { token },
    });

    this.setupEventHandlers();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
    this.isConnecting = false;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ============================================
  // Event Handlers Setup
  // ============================================

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnecting = false;
      console.log('✅ Chat socket connected');
      this.connectHandlers.forEach(handler => handler());
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Chat socket disconnected');
      this.disconnectHandlers.forEach(handler => handler());
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      console.error('❌ Chat socket connection error:', error.message);
      this.errorHandlers.forEach(handler => handler(error.message));
    });

    this.socket.on('error', (data: { message: string }) => {
      console.error('❌ Chat socket error:', data.message);
      this.errorHandlers.forEach(handler => handler(data.message));
    });

    this.socket.on('new_message', (data: ChatMessage) => {
      this.messageHandlers.forEach(handler => handler(data));
    });

    this.socket.on('typing', (data: TypingEvent) => {
      this.typingHandlers.forEach(handler => handler(data));
    });

    this.socket.on('user_joined', (data: UserJoinedEvent) => {
      this.userJoinedHandlers.forEach(handler => handler(data));
    });

    this.socket.on('user_left', (data: UserLeftEvent) => {
      this.userLeftHandlers.forEach(handler => handler(data));
    });
  }

  // ============================================
  // Room Actions
  // ============================================

  joinRoom(roomId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve(false);
        return;
      }

      this.socket.emit('join_room', { roomId }, (response: { success: boolean }) => {
        resolve(response?.success ?? false);
      });
    });
  }

  leaveRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_room', { roomId });
    }
  }

  // ============================================
  // Message Actions
  // ============================================

  sendMessage(
    roomId: string,
    content: string,
    type: string = 'text'
  ): Promise<ChatMessage | null> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve(null);
        return;
      }

      this.socket.emit(
        'send_message',
        { roomId, content, type },
        (response: { success: boolean; message?: ChatMessage }) => {
          if (response?.success && response.message) {
            resolve(response.message);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  sendTyping(roomId: string, isTyping: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('typing', { roomId, isTyping });
    }
  }

  // ============================================
  // Event Subscription
  // ============================================

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onTyping(handler: TypingHandler): () => void {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  onUserJoined(handler: UserJoinedHandler): () => void {
    this.userJoinedHandlers.add(handler);
    return () => this.userJoinedHandlers.delete(handler);
  }

  onUserLeft(handler: UserLeftHandler): () => void {
    this.userLeftHandlers.add(handler);
    return () => this.userLeftHandlers.delete(handler);
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }
}

// ============================================
// Export Singleton
// ============================================

export const chatSocket = new ChatSocketManager();
