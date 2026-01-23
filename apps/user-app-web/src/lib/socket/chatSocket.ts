import { io, Socket } from 'socket.io-client';
import type { ChatMessage } from '@/lib/api/chatApi';

// ============================================
// 환경 설정
// ============================================

const mode = (import.meta as any).env?.MODE;
const isDev = mode === 'development' || mode === 'e2e';

// 환경 변수로 소켓 URL 지정 가능, 없으면 Cloud Run 사용
const SOCKET_URL = (import.meta as any).env?.VITE_CHAT_SOCKET_URL ||
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

  // Reconnection state
  private lastConnectAttempt = 0;
  private reconnectAttempts = 0;
  private readonly MIN_RECONNECT_INTERVAL = 3000; // 최소 3초 간격
  private readonly MAX_RECONNECT_DELAY = 30000; // 최대 30초 대기
  private readonly MAX_RECONNECT_ATTEMPTS = 10;

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
    this.lastConnectAttempt = Date.now();

    this.socket = io(`${SOCKET_URL}${NAMESPACE}`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: this.MIN_RECONNECT_INTERVAL,
      reconnectionDelayMax: this.MAX_RECONNECT_DELAY,
      auth: { token },
    });

    this.setupEventHandlers();
  }

  /**
   * 연결 상태를 확인하고 필요시 재연결
   * - 이미 연결됨: 즉시 true 반환
   * - 연결 중: false 반환 (중복 연결 방지)
   * - 최근 시도 후 MIN_RECONNECT_INTERVAL 이내: false 반환 (스팸 방지)
   * - 재연결 시도 횟수 초과: false 반환
   */
  ensureConnected(token: string): boolean {
    // 이미 연결되어 있으면 OK
    if (this.socket?.connected) {
      this.reconnectAttempts = 0; // 성공 시 카운터 리셋
      return true;
    }

    // 연결 중이면 대기
    if (this.isConnecting) {
      return false;
    }

    // 최대 재연결 시도 횟수 초과
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.warn(`⚠️ Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) exceeded`);
      return false;
    }

    // 최소 간격 체크 (스팸 방지)
    const timeSinceLastAttempt = Date.now() - this.lastConnectAttempt;
    if (timeSinceLastAttempt < this.MIN_RECONNECT_INTERVAL) {
      return false;
    }

    // 재연결 시도
    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting... (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);

    // 기존 소켓 정리 후 재연결
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connect(token);
    return false;
  }

  /**
   * 강제 재연결 (재연결 카운터 리셋)
   */
  forceReconnect(token: string): void {
    this.reconnectAttempts = 0;
    this.lastConnectAttempt = 0;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = false;
    this.connect(token);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get canReconnect(): boolean {
    return this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS;
  }

  // ============================================
  // Event Handlers Setup
  // ============================================

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0; // 성공 시 카운터 리셋
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
