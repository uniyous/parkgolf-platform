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
    @Published var connectionError: String?

    // MARK: - Event Publishers

    let messageReceived = PassthroughSubject<ChatMessage, Never>()
    let userJoined = PassthroughSubject<UserJoinedEvent, Never>()
    let userLeft = PassthroughSubject<UserLeftEvent, Never>()
    let typingReceived = PassthroughSubject<TypingEvent, Never>()

    // MARK: - Private Properties

    private var manager: SocketManager?
    private var socket: SocketIOClient?
    private var currentToken: String?
    private var isConnecting = false

    // MARK: - Reconnection State

    private var lastConnectAttempt: Date = .distantPast
    private var reconnectAttempts = 0
    private let minReconnectInterval: TimeInterval = 3.0  // 최소 3초 간격
    private let maxReconnectDelay: TimeInterval = 30.0    // 최대 30초 대기
    private let maxReconnectAttempts = 10

    /// 재연결 가능 여부
    var canReconnect: Bool {
        reconnectAttempts < maxReconnectAttempts
    }

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
        guard let token = currentToken else { return }
        if !isConnected {
            #if DEBUG
            print("🔄 App entered foreground, checking connection...")
            #endif
            ensureConnected(token: token)
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
        guard !isConnected, !isConnecting else { return }

        currentToken = token
        isConnecting = true
        lastConnectAttempt = Date()

        // Configure Socket.IO
        manager = SocketManager(socketURL: socketURL, config: [
            .log(false),
            .compress,
            .forceWebsockets(true),
            .reconnects(true),
            .reconnectAttempts(maxReconnectAttempts),
            .reconnectWait(Int(minReconnectInterval)),
            .reconnectWaitMax(Int(maxReconnectDelay)),
            .connectParams(["token": token])
        ])

        socket = manager?.socket(forNamespace: namespace)

        setupEventHandlers()

        socket?.connect()
    }

    /// 연결 상태를 확인하고 필요시 재연결
    /// - Returns: 이미 연결되어 있으면 true
    @discardableResult
    func ensureConnected(token: String) -> Bool {
        // 이미 연결되어 있으면 OK
        if isConnected {
            reconnectAttempts = 0
            return true
        }

        // 연결 중이면 대기
        if isConnecting {
            return false
        }

        // 최대 재연결 시도 횟수 초과
        if reconnectAttempts >= maxReconnectAttempts {
            #if DEBUG
            print("⚠️ Max reconnection attempts (\(maxReconnectAttempts)) exceeded")
            #endif
            return false
        }

        // 최소 간격 체크 (스팸 방지)
        let timeSinceLastAttempt = Date().timeIntervalSince(lastConnectAttempt)
        if timeSinceLastAttempt < minReconnectInterval {
            return false
        }

        // 재연결 시도
        reconnectAttempts += 1
        #if DEBUG
        print("🔄 Reconnecting... (attempt \(reconnectAttempts)/\(maxReconnectAttempts))")
        #endif

        // 기존 소켓 정리 후 재연결
        cleanupSocket()
        connect(token: token)
        return false
    }

    /// 강제 재연결 (재연결 카운터 리셋)
    func forceReconnect(token: String) {
        reconnectAttempts = 0
        lastConnectAttempt = .distantPast
        cleanupSocket()
        connect(token: token)
    }

    private func cleanupSocket() {
        socket?.removeAllHandlers()
        socket?.disconnect()
        socket = nil
        manager = nil
        isConnecting = false
    }

    func disconnect() {
        cleanupSocket()
        currentToken = nil
        isConnected = false
        reconnectAttempts = 0
    }

    // MARK: - Event Handlers

    private func setupEventHandlers() {
        guard let socket = socket else { return }

        // Connection events
        socket.on(clientEvent: .connect) { [weak self] _, _ in
            Task { @MainActor in
                self?.isConnected = true
                self?.isConnecting = false
                self?.reconnectAttempts = 0  // 성공 시 카운터 리셋
                self?.connectionError = nil
                #if DEBUG
                print("✅ Socket.IO connected")
                #endif
            }
        }

        socket.on(clientEvent: .disconnect) { [weak self] _, _ in
            Task { @MainActor in
                self?.isConnected = false
                self?.isConnecting = false
                #if DEBUG
                print("🔌 Socket.IO disconnected")
                #endif
            }
        }

        socket.on(clientEvent: .error) { [weak self] data, _ in
            Task { @MainActor in
                self?.isConnecting = false
                if let error = data.first as? [String: Any],
                   let message = error["message"] as? String {
                    self?.connectionError = message
                    #if DEBUG
                    print("❌ Socket.IO error: \(message)")
                    #endif
                }
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

    // MARK: - Parsing Helpers

    private func parseChatMessage(from dict: [String: Any]) -> ChatMessage? {
        guard let id = dict["id"] as? String,
              let roomId = dict["roomId"] as? String,
              let content = dict["content"] as? String else {
            return nil
        }

        let senderId = "\(dict["senderId"] ?? "")"
        let senderName = dict["senderName"] as? String ?? "Unknown"
        let typeString = dict["type"] as? String ?? "TEXT"
        let messageType = MessageType(rawValue: typeString.uppercased()) ?? .text
        let createdAtString = dict["createdAt"] as? String
        let createdAt = createdAtString.flatMap { ISO8601DateFormatter().date(from: $0) } ?? Date()

        return ChatMessage(
            id: id,
            roomId: roomId,
            senderId: senderId,
            senderName: senderName,
            content: content,
            messageType: messageType,
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
