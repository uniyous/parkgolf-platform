import { io, Socket } from 'socket.io-client';
import type { ChatMessage } from '@/lib/api/chatApi';
import { authStorage } from '@/lib/storage';
import { apiClient } from '@/lib/api/client';

// ============================================
// 환경 설정
// ============================================

const mode = (import.meta as any).env?.MODE;
const isDev = mode === 'development' || mode === 'e2e';

// 환경 변수로 소켓 URL 지정 가능, 없으면 GKE Ingress 도메인 사용
const SOCKET_URL = (import.meta as any).env?.VITE_CHAT_SOCKET_URL ||
  'https://dev-api.goparkmate.com';

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
  private isRefreshingToken = false;

  // Heartbeat — Cloud Run / proxy idle timeout 방지
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private missedHeartbeats = 0;
  private static readonly HEARTBEAT_INTERVAL = 30_000;
  private static readonly MAX_MISSED_HEARTBEATS = 2;

  // Event handlers
  private messageHandlers: Set<MessageHandler> = new Set();
  private typingHandlers: Set<TypingHandler> = new Set();
  private userJoinedHandlers: Set<UserJoinedHandler> = new Set();
  private userLeftHandlers: Set<UserLeftHandler> = new Set();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private reconnectHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();

  // ============================================
  // Connection
  // ============================================

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.token = token;

    this.socket = io(`${SOCKET_URL}${NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      // 동적 auth: 재연결 시마다 최신 토큰을 authStorage에서 읽음
      auth: (cb) => {
        cb({ token: authStorage.getToken() || this.token });
      },
    });

    this.setupEventHandlers();
  }

  /**
   * 강제 재연결 (수동 재연결 버튼용)
   */
  forceReconnect(token: string): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connect(token);
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * 인증 에러 시 API Client의 토큰 갱신 메커니즘을 활용하여 재연결
   * - API Client의 mutex를 공유하여 동시 갱신 방지
   * - 동일한 refresh 엔드포인트 사용
   */
  private async handleAuthError(): Promise<void> {
    if (this.isRefreshingToken) return;
    this.isRefreshingToken = true;

    try {
      const refreshed = await apiClient.refreshAccessToken();
      if (refreshed) {
        const newToken = authStorage.getToken();
        if (newToken) {
          this.forceReconnect(newToken);
        }
      }
    } catch (e) {
      console.error('Token refresh failed for socket:', e);
    } finally {
      this.isRefreshingToken = false;
    }
  }

  // ============================================
  // Heartbeat
  // ============================================

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.missedHeartbeats = 0;
    this.heartbeatTimer = setInterval(() => {
      if (!this.socket?.connected) return;
      this.missedHeartbeats++;
      if (this.missedHeartbeats > ChatSocketManager.MAX_MISSED_HEARTBEATS) {
        console.warn('[ChatSocket] Heartbeat timeout, forcing reconnect');
        this.socket?.disconnect();
        return;
      }
      this.socket.emit('heartbeat', {}, () => {
        this.missedHeartbeats = 0;
      });
    }, ChatSocketManager.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ============================================
  // Event Handlers Setup
  // ============================================

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Chat socket connected');
      this.startHeartbeat();
      this.connectHandlers.forEach(handler => handler());
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Chat socket disconnected');
      this.stopHeartbeat();
      this.disconnectHandlers.forEach(handler => handler());
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Chat socket connection error:', error.message);
      // 인증 실패 시 토큰 갱신 후 재연결 시도
      if (error.message?.includes('Unauthorized') || error.message?.includes('Authentication')) {
        this.handleAuthError();
      }
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

    // Token lifecycle events from server
    this.socket.on('token_expiring', () => {
      console.log('[ChatSocket] Token expiring soon, refreshing REST API token...');
      apiClient.refreshAccessToken().catch(console.error);
    });

    this.socket.on('token_refresh_needed', () => {
      // Server session stays alive — just refresh the REST API token in background
      console.log('[ChatSocket] Token expired, refreshing REST API token...');
      apiClient.refreshAccessToken().catch(console.error);
    });

    // Socket.IO Manager 레벨 재연결 이벤트
    this.socket.io.on('reconnect', () => {
      console.log('🔄 Chat socket reconnected');
      this.reconnectHandlers.forEach(handler => handler());
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

  onReconnect(handler: ConnectionHandler): () => void {
    this.reconnectHandlers.add(handler);
    return () => this.reconnectHandlers.delete(handler);
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
