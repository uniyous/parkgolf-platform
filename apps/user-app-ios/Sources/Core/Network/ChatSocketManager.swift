import Foundation
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

    // MARK: - Configuration

    private let socketURL = "https://chat-gateway-dev-iihuzmuufa-du.a.run.app"
    private let namespace = "/chat"

    private init() {}

    // MARK: - Connection

    func connect(token: String) {
        guard !isConnected else { return }

        currentToken = token

        // Configure Socket.IO
        let url = URL(string: socketURL)!
        manager = SocketManager(socketURL: url, config: [
            .log(false),
            .compress,
            .forceWebsockets(true),
            .reconnects(true),
            .reconnectAttempts(5),
            .reconnectWait(3),
            .connectParams(["token": token])
        ])

        socket = manager?.socket(forNamespace: namespace)

        setupEventHandlers()

        socket?.connect()
    }

    func disconnect() {
        socket?.disconnect()
        socket = nil
        manager = nil
        isConnected = false
    }

    // MARK: - Event Handlers

    private func setupEventHandlers() {
        guard let socket = socket else { return }

        // Connection events
        socket.on(clientEvent: .connect) { [weak self] _, _ in
            Task { @MainActor in
                self?.isConnected = true
                self?.connectionError = nil
                print("✅ Socket.IO connected")
            }
        }

        socket.on(clientEvent: .disconnect) { [weak self] _, _ in
            Task { @MainActor in
                self?.isConnected = false
                print("🔌 Socket.IO disconnected")
            }
        }

        socket.on(clientEvent: .error) { [weak self] data, _ in
            Task { @MainActor in
                if let error = data.first as? [String: Any],
                   let message = error["message"] as? String {
                    self?.connectionError = message
                    print("❌ Socket.IO error: \(message)")
                }
            }
        }

        // Custom events
        socket.on("connected") { data, _ in
            Task { @MainActor in
                print("✅ Authenticated: \(data)")
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
