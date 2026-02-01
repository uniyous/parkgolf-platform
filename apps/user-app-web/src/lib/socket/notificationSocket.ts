import { io, Socket } from 'socket.io-client';
import type { AppNotification, NotificationType, NotificationData } from '@/lib/api/notificationApi';

// ============================================
// 환경 설정
// ============================================

const mode = (import.meta as any).env?.MODE;
const isDev = mode === 'development' || mode === 'e2e';

// chat-gateway와 동일한 서버 사용 (namespace만 다름)
const SOCKET_URL = (import.meta as any).env?.VITE_CHAT_SOCKET_URL ||
  'http://34.160.211.91';

const NAMESPACE = '/notification';

// ============================================
// 타입 정의
// ============================================

export interface NotificationEvent {
  id: number;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  isRead: boolean;
  createdAt: string;
}

export type NotificationHandler = (notification: NotificationEvent) => void;
export type ConnectionHandler = () => void;
export type ErrorHandler = (error: string) => void;

// ============================================
// Notification Socket Manager
// ============================================

class NotificationSocketManager {
  private socket: Socket | null = null;
  private token: string | null = null;

  // Event handlers
  private notificationHandlers: Set<NotificationHandler> = new Set();
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

    if (isDev) {
      console.log(`[NotificationSocket] Connecting to ${SOCKET_URL}${NAMESPACE}`);
    }

    this.socket = io(`${SOCKET_URL}${NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      auth: { token },
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

  // ============================================
  // Event Handlers Setup
  // ============================================

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      if (isDev) {
        console.log('[NotificationSocket] Connected');
      }
      this.connectHandlers.forEach(handler => handler());
    });

    this.socket.on('disconnect', () => {
      if (isDev) {
        console.log('[NotificationSocket] Disconnected');
      }
      this.disconnectHandlers.forEach(handler => handler());
    });

    this.socket.on('connect_error', (error) => {
      console.error('[NotificationSocket] Connection error:', error.message);
      this.errorHandlers.forEach(handler => handler(error.message));
    });

    this.socket.on('error', (data: { message: string }) => {
      console.error('[NotificationSocket] Error:', data.message);
      this.errorHandlers.forEach(handler => handler(data.message));
    });

    // Handle incoming notifications
    this.socket.on('notification', (data: NotificationEvent) => {
      if (isDev) {
        console.log('[NotificationSocket] Received notification:', data);
      }
      this.notificationHandlers.forEach(handler => handler(data));
    });

    // Handle connection confirmation
    this.socket.on('connected', (data: { userId: number; name: string; socketId: string }) => {
      if (isDev) {
        console.log('[NotificationSocket] Connection confirmed:', data);
      }
    });

    // Socket.IO Manager 레벨 재연결 이벤트
    this.socket.io.on('reconnect', () => {
      if (isDev) {
        console.log('[NotificationSocket] Reconnected');
      }
      this.reconnectHandlers.forEach(handler => handler());
    });
  }

  // ============================================
  // Event Subscription
  // ============================================

  onNotification(handler: NotificationHandler): () => void {
    this.notificationHandlers.add(handler);
    return () => this.notificationHandlers.delete(handler);
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

export const notificationSocket = new NotificationSocketManager();
