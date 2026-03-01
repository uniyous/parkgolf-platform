import Foundation
import UIKit
import SocketIO
import Combine

// MARK: - Chat Socket Manager

@MainActor
class ChatSocketManager: ObservableObject {
    static let shared = ChatSocketManager()

    // MARK: - Published Properties

    @Published var isConnected = false
    @Published var isNatsConnected = true
    @Published var connectionError: String?

    // MARK: - Event Publishers

    let messageReceived = PassthroughSubject<ChatMessage, Never>()
    let userJoined = PassthroughSubject<UserJoinedEvent, Never>()
    let userLeft = PassthroughSubject<UserLeftEvent, Never>()
    let typingReceived = PassthroughSubject<TypingEvent, Never>()
    let reconnected = PassthroughSubject<Void, Never>()
    let natsStatusChanged = PassthroughSubject<Bool, Never>()

    // MARK: - Private Properties

    private var manager: SocketManager?
    private var socket: SocketIOClient?
    private var currentToken: String?
    private var isRefreshingToken = false
    private var hasEverConnected = false
    private var isIntentionalDisconnect = false

    // Heartbeat — Cloud Run / proxy idle timeout 방지
    private var heartbeatTimer: Timer?
    private var missedHeartbeats = 0
    private let heartbeatInterval: TimeInterval = 30
    private let maxMissedHeartbeats = 2

    // Reconnection — 자체 관리 (fresh token + 지수 백오프)
    private var reconnectTimer: Timer?
    private var reconnectAttempts = 0
    private let maxReconnectDelay: TimeInterval = 30

    // MARK: - Configuration

    private var socketURL: URL { Configuration.API.chatSocketURL }
    private let namespace = "/chat"

    private init() {
        setupAppLifecycleObservers()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - App Lifecycle

    private func setupAppLifecycleObservers() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleAppWillEnterForeground()
            }
        }

        NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleAppDidEnterBackground()
            }
        }
    }

    private func handleAppWillEnterForeground() {
        #if DEBUG
        print("📱 App entered foreground, socket state: \(isConnected ? "connected" : "disconnected")")
        #endif

        if !isConnected, currentToken != nil {
            // 백그라운드에서 대기 중이던 reconnect 타이머 취소 후 즉시 재연결
            stopReconnectTimer()
            reconnectAttempts = 0
            Task {
                let freshToken = await APIClient.shared.getAccessToken() ?? currentToken
                if let token = freshToken {
                    forceReconnect(token: token)
                }
            }
        } else if isConnected {
            // 연결 유지 중이어도 포그라운드 복귀 시 방 재참여 유도
            reconnected.send()
        }
    }

    private func handleAppDidEnterBackground() {
        // 백그라운드 진입 시 특별한 처리 없음 (소켓은 유지)
        #if DEBUG
        print("📱 App entered background, socket state: \(isConnected ? "connected" : "disconnected")")
        #endif
    }

    // MARK: - Connection

    func connect(token: String) {
        guard !isConnected else { return }

        currentToken = token
        isIntentionalDisconnect = false

        // Auto-reconnect 비활성화: 재연결 시 항상 fresh token을 사용하기 위해 자체 관리
        manager = SocketManager(socketURL: socketURL, config: [
            .log(false),
            .compress,
            .forceWebsockets(false),
            .reconnects(false),
            .connectParams(["token": token])
        ])

        socket = manager?.socket(forNamespace: namespace)

        setupEventHandlers()

        socket?.connect()
    }

    /// 강제 재연결 (UI에서 호출)
    func forceReconnect(token: String) {
        stopReconnectTimer()
        reconnectAttempts = 0
        cleanupSocket()
        connect(token: token)
    }

    private func cleanupSocket() {
        stopHeartbeat()
        socket?.removeAllHandlers()
        socket?.disconnect()
        socket = nil
        manager = nil
    }

    func disconnect() {
        isIntentionalDisconnect = true
        stopReconnectTimer()
        cleanupSocket()
        currentToken = nil
        isConnected = false
        hasEverConnected = false
    }

    // MARK: - Heartbeat

    private func startHeartbeat() {
        stopHeartbeat()
        missedHeartbeats = 0
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: heartbeatInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.sendHeartbeat()
            }
        }
    }

    private func stopHeartbeat() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
    }

    private func sendHeartbeat() {
        guard let socket = socket, socket.status == .connected else { return }
        missedHeartbeats += 1
        if missedHeartbeats > maxMissedHeartbeats {
            #if DEBUG
            print("[ChatSocket] Heartbeat timeout, forcing reconnect")
            #endif
            socket.disconnect()
            return
        }
        socket.emitWithAck("heartbeat", [:]).timingOut(after: 10) { [weak self] _ in
            Task { @MainActor in
                self?.missedHeartbeats = 0
            }
        }
    }

    // MARK: - Reconnection (자체 관리, fresh token + 지수 백오프)

    private func scheduleReconnect() {
        stopReconnectTimer()
        guard !isIntentionalDisconnect, currentToken != nil else { return }

        let delay = min(pow(2.0, Double(reconnectAttempts)), maxReconnectDelay)
        reconnectAttempts += 1

        #if DEBUG
        print("[ChatSocket] Scheduling reconnect in \(String(format: "%.1f", delay))s (attempt \(reconnectAttempts))")
        #endif

        reconnectTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            Task { @MainActor in
                guard let self = self, !self.isConnected, !self.isIntentionalDisconnect else { return }
                // 항상 APIClient에서 fresh token 획득 (Keychain fallback 포함)
                let token = await APIClient.shared.getAccessToken() ?? self.currentToken
                guard let token = token else { return }
                self.currentToken = token
                self.forceReconnect(token: token)
            }
        }
    }

    private func stopReconnectTimer() {
        reconnectTimer?.invalidate()
        reconnectTimer = nil
    }

    // MARK: - Event Handlers

    private func setupEventHandlers() {
        guard let socket = socket else { return }

        // Connection events
        socket.on(clientEvent: .connect) { [weak self] _, _ in
            Task { @MainActor in
                guard let self = self else { return }
                let isReconnection = self.hasEverConnected
                self.hasEverConnected = true
                self.reconnectAttempts = 0
                self.isConnected = true
                self.isNatsConnected = true
                self.connectionError = nil
                self.startHeartbeat()
                if isReconnection {
                    // forceReconnect 후에도 방 재참여 + 메시지 갱신 트리거
                    self.reconnected.send()
                }
                #if DEBUG
                print(isReconnection ? "🔄 Socket.IO reconnected" : "✅ Socket.IO connected")
                #endif
            }
        }

        socket.on(clientEvent: .disconnect) { [weak self] _, _ in
            Task { @MainActor in
                guard let self = self else { return }
                self.isConnected = false
                self.stopHeartbeat()
                if !self.isIntentionalDisconnect {
                    self.scheduleReconnect()
                }
                #if DEBUG
                print("🔌 Socket.IO disconnected")
                #endif
            }
        }

        socket.on(clientEvent: .reconnect) { _, _ in
            // Auto-reconnection disabled; reconnection managed by scheduleReconnect
        }

        socket.on(clientEvent: .error) { [weak self] data, _ in
            Task { @MainActor in
                guard let self = self else { return }
                if let error = data.first as? [String: Any],
                   let message = error["message"] as? String {
                    self.connectionError = message
                    #if DEBUG
                    print("❌ Socket.IO error: \(message)")
                    #endif
                    if message.contains("Unauthorized") || message.contains("Authentication") {
                        await self.handleAuthError()
                    } else if !self.isConnected {
                        // 비인증 연결 오류 시 지수 백오프로 재연결
                        self.scheduleReconnect()
                    }
                }
            }
        }

        // Token lifecycle events — server session stays alive, just refresh REST API token
        socket.on("token_expiring") { [weak self] _, _ in
            Task {
                #if DEBUG
                print("⚠️ Token expiring soon, refreshing REST API token...")
                #endif
                let refreshed = await APIClient.shared.refreshAccessToken()
                if refreshed, let newToken = await APIClient.shared.getAccessToken() {
                    await MainActor.run { self?.currentToken = newToken }
                }
            }
        }

        socket.on("token_refresh_needed") { [weak self] _, _ in
            Task {
                #if DEBUG
                print("⚠️ Token expired, refreshing REST API token...")
                #endif
                let refreshed = await APIClient.shared.refreshAccessToken()
                if refreshed, let newToken = await APIClient.shared.getAccessToken() {
                    await MainActor.run { self?.currentToken = newToken }
                }
            }
        }

        // NATS status event — server-side NATS connection status
        socket.on("system:nats_status") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let connected = dict["connected"] as? Bool else { return }
            Task { @MainActor in
                self?.isNatsConnected = connected
                self?.natsStatusChanged.send(connected)
                #if DEBUG
                print("[ChatSocket] NATS status: \(connected ? "connected" : "disconnected")")
                #endif
            }
        }

        // Custom events
        socket.on("connected") { data, _ in
            Task { @MainActor in
                #if DEBUG
                print("✅ Authenticated: \(data)")
                #endif
            }
        }

        socket.on("new_message") { [weak self] data, _ in
            guard let messageData = data.first as? [String: Any] else { return }
            if let message = self?.parseChatMessage(from: messageData) {
                Task { @MainActor in
                    self?.messageReceived.send(message)
                }
            }
        }

        socket.on("user_joined") { [weak self] data, _ in
            guard let eventData = data.first as? [String: Any] else { return }
            if let event = self?.parseUserJoinedEvent(from: eventData) {
                Task { @MainActor in
                    self?.userJoined.send(event)
                }
            }
        }

        socket.on("user_left") { [weak self] data, _ in
            guard let eventData = data.first as? [String: Any] else { return }
            if let event = self?.parseUserLeftEvent(from: eventData) {
                Task { @MainActor in
                    self?.userLeft.send(event)
                }
            }
        }

        socket.on("typing") { [weak self] data, _ in
            guard let eventData = data.first as? [String: Any] else { return }
            if let event = self?.parseTypingEvent(from: eventData) {
                Task { @MainActor in
                    self?.typingReceived.send(event)
                }
            }
        }

        socket.on("error") { [weak self] data, _ in
            Task { @MainActor in
                if let error = data.first as? [String: Any],
                   let message = error["message"] as? String {
                    self?.connectionError = message
                }
            }
        }
    }

    // MARK: - Room Actions

    func joinRoom(roomId: String, completion: ((Bool) -> Void)? = nil) {
        socket?.emitWithAck("join_room", ["roomId": roomId]).timingOut(after: 10) { data in
            if let response = data.first as? [String: Any],
               let success = response["success"] as? Bool {
                completion?(success)
            } else {
                completion?(false)
            }
        }
    }

    func leaveRoom(roomId: String) {
        socket?.emit("leave_room", ["roomId": roomId])
    }

    // MARK: - Message Actions

    func sendMessage(roomId: String, content: String, type: String = "text", completion: ((ChatMessage?) -> Void)? = nil) {
        let messageData: [String: Any] = [
            "roomId": roomId,
            "content": content,
            "type": type
        ]

        socket?.emitWithAck("send_message", messageData).timingOut(after: 10) { [weak self] data in
            if let response = data.first as? [String: Any],
               let success = response["success"] as? Bool,
               success,
               let messageDict = response["message"] as? [String: Any],
               let message = self?.parseChatMessage(from: messageDict) {
                completion?(message)
            } else {
                completion?(nil)
            }
        }
    }

    func sendTyping(roomId: String, isTyping: Bool) {
        socket?.emit("typing", ["roomId": roomId, "isTyping": isTyping])
    }

    // MARK: - Auth Error Handling

    private func handleAuthError() async {
        guard !isRefreshingToken else { return }
        isRefreshingToken = true
        defer { isRefreshingToken = false }

        let refreshed = await APIClient.shared.refreshAccessToken()
        if refreshed, let newToken = await APIClient.shared.getAccessToken() {
            currentToken = newToken
            forceReconnect(token: newToken)
        }
    }

    // MARK: - Parsing Helpers

    private func parseChatMessage(from dict: [String: Any]) -> ChatMessage? {
        guard let id = dict["id"] as? String,
              let roomId = dict["roomId"] as? String,
              let content = dict["content"] as? String else {
            return nil
        }

        let senderId = "\(dict["senderId"] ?? "")"
        let senderName = dict["senderName"] as? String ?? "Unknown"
        // Socket.IO broadcast may send "messageType" or "type"
        let typeString = dict["messageType"] as? String ?? dict["type"] as? String ?? "TEXT"
        let messageType = MessageType(rawValue: typeString.uppercased()) ?? .text
        let metadata = dict["metadata"] as? String
        let createdAtString = dict["createdAt"] as? String
        let createdAt = createdAtString.flatMap { ISO8601DateFormatter().date(from: $0) } ?? Date()

        return ChatMessage(
            id: id,
            roomId: roomId,
            senderId: senderId,
            senderName: senderName,
            content: content,
            messageType: messageType,
            metadata: metadata,
            createdAt: createdAt,
            readBy: nil
        )
    }

    private func parseUserJoinedEvent(from dict: [String: Any]) -> UserJoinedEvent? {
        guard let roomId = dict["roomId"] as? String else { return nil }
        let userId = "\(dict["userId"] ?? "")"
        let userName = dict["userName"] as? String
        return UserJoinedEvent(roomId: roomId, userId: userId, userName: userName)
    }

    private func parseUserLeftEvent(from dict: [String: Any]) -> UserLeftEvent? {
        guard let roomId = dict["roomId"] as? String else { return nil }
        let userId = "\(dict["userId"] ?? "")"
        let userName = dict["userName"] as? String
        return UserLeftEvent(roomId: roomId, userId: userId, userName: userName)
    }

    private func parseTypingEvent(from dict: [String: Any]) -> TypingEvent? {
        guard let roomId = dict["roomId"] as? String else { return nil }
        let userId = "\(dict["userId"] ?? "")"
        let userName = dict["userName"] as? String
        let isTyping = dict["isTyping"] as? Bool ?? false
        return TypingEvent(roomId: roomId, userId: userId, userName: userName, isTyping: isTyping)
    }
}

// MARK: - Socket Events

struct UserJoinedEvent {
    let roomId: String
    let userId: String
    let userName: String?
}

struct UserLeftEvent {
    let roomId: String
    let userId: String
    let userName: String?
}

struct TypingEvent {
    let roomId: String
    let userId: String
    let userName: String?
    let isTyping: Bool
}
