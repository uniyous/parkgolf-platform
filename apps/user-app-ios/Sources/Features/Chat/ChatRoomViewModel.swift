import Foundation
import Combine

@MainActor
final class ChatRoomViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var messages: [ChatMessage] = []
    @Published var inputText = ""
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var isSending = false
    @Published var error: Error?
    @Published var isConnected = false
    @Published private(set) var hasMoreMessages = true

    // MARK: - Properties

    let roomId: String
    let currentUserId: String

    private let apiClient = APIClient.shared
    private let socketManager = ChatSocketManager.shared
    private var cancellables = Set<AnyCancellable>()
    private var cursor: String?
    private var connectionCheckTimer: Timer?
    private var cachedToken: String?

    // MARK: - Init

    init(roomId: String, currentUserId: String) {
        self.roomId = roomId
        self.currentUserId = currentUserId
        setupSocketSubscriptions()
    }

    // MARK: - Socket Subscriptions

    private func setupSocketSubscriptions() {
        // Subscribe to new messages
        socketManager.messageReceived
            .receive(on: DispatchQueue.main)
            .sink { [weak self] message in
                guard let self = self else { return }
                // Only add messages for this room
                if message.roomId == self.roomId {
                    // Avoid duplicates
                    if !self.messages.contains(where: { $0.id == message.id }) {
                        self.messages.append(message)
                    }
                }
            }
            .store(in: &cancellables)

        // Subscribe to connection status
        socketManager.$isConnected
            .receive(on: DispatchQueue.main)
            .sink { [weak self] connected in
                self?.isConnected = connected
            }
            .store(in: &cancellables)
    }

    // MARK: - Load Messages

    func loadMessages() async {
        isLoading = true
        cursor = nil
        hasMoreMessages = true

        defer { isLoading = false }

        do {
            let response = try await apiClient.request(
                ChatEndpoints.messages(roomId: roomId, cursor: nil, limit: 50),
                responseType: ChatMessagesResponse.self
            )
            messages = response.messages.sorted { $0.createdAt < $1.createdAt }
            hasMoreMessages = response.hasMore
            cursor = response.nextCursor
        } catch {
            self.error = error
            print("Failed to load messages: \(error)")
        }
    }

    func loadMoreMessages() async {
        guard hasMoreMessages, !isLoading, !isLoadingMore else { return }

        isLoadingMore = true
        defer { isLoadingMore = false }

        do {
            let response = try await apiClient.request(
                ChatEndpoints.messages(roomId: roomId, cursor: cursor, limit: 50),
                responseType: ChatMessagesResponse.self
            )

            // 이전 메시지를 맨 앞에 추가
            let olderMessages = response.messages.sorted { $0.createdAt < $1.createdAt }
            messages.insert(contentsOf: olderMessages, at: 0)
            hasMoreMessages = response.hasMore
            cursor = response.nextCursor
        } catch {
            self.error = error
            print("Failed to load more messages: \(error)")
        }
    }

    // MARK: - Send Message

    func sendMessage() async {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        let messageText = text
        inputText = ""
        isSending = true

        defer { isSending = false }

        // If connected via socket, send through socket
        if socketManager.isConnected {
            socketManager.sendMessage(roomId: roomId, content: messageText) { [weak self] message in
                Task { @MainActor in
                    guard let self = self else { return }
                    if let message = message {
                        // Message was sent successfully, add if not already added
                        if !self.messages.contains(where: { $0.id == message.id }) {
                            self.messages.append(message)
                        }
                    } else {
                        // Socket send failed, try REST API
                        await self.sendMessageViaREST(content: messageText)
                    }
                }
            }
        } else {
            // Socket not connected, use REST API
            await sendMessageViaREST(content: messageText)
        }
    }

    private func sendMessageViaREST(content: String) async {
        do {
            let message = try await apiClient.request(
                ChatEndpoints.sendMessage(roomId: roomId, content: content),
                responseType: ChatMessage.self
            )

            // Add to local messages if not already added
            if !messages.contains(where: { $0.id == message.id }) {
                messages.append(message)
            }
        } catch {
            self.error = error
            // Restore input text on failure
            inputText = content
            print("Failed to send message: \(error)")
        }
    }

    // MARK: - WebSocket Connection

    func connectSocket() async {
        guard let token = await apiClient.getAccessToken() else {
            print("No access token available for socket connection")
            return
        }

        cachedToken = token

        // Connect to socket
        socketManager.connect(token: token)

        // Wait for connection to be established (max 5 seconds)
        for _ in 0..<50 {
            if socketManager.isConnected {
                break
            }
            try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 second
        }

        guard socketManager.isConnected else {
            print("❌ Socket connection timeout")
            return
        }

        // Join the room
        socketManager.joinRoom(roomId: roomId) { success in
            if success {
                print("✅ Joined room: \(self.roomId)")
            } else {
                print("❌ Failed to join room: \(self.roomId)")
            }
        }

        // Start periodic connection check
        startConnectionCheck()
    }

    func disconnectSocket() {
        stopConnectionCheck()
        socketManager.leaveRoom(roomId: roomId)
        // Don't disconnect the socket manager itself as it may be used by other rooms
    }

    // MARK: - Connection Check

    private func startConnectionCheck() {
        stopConnectionCheck()

        // Check connection every 30 seconds
        connectionCheckTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.checkAndReconnectIfNeeded()
            }
        }
    }

    private func stopConnectionCheck() {
        connectionCheckTimer?.invalidate()
        connectionCheckTimer = nil
    }

    private func checkAndReconnectIfNeeded() {
        guard let token = cachedToken else { return }

        if !socketManager.isConnected && socketManager.canReconnect {
            print("🔄 Periodic check: attempting reconnection...")
            if socketManager.ensureConnected(token: token) {
                // Already connected, rejoin room
                socketManager.joinRoom(roomId: roomId) { success in
                    print(success ? "✅ Rejoined room: \(self.roomId)" : "❌ Failed to rejoin room")
                }
            }
        }
    }

    /// 강제 재연결 (UI에서 호출)
    func forceReconnect() async {
        let token: String
        if let cached = cachedToken {
            token = cached
        } else if let fetched = await apiClient.getAccessToken() {
            token = fetched
        } else {
            print("No token available for force reconnect")
            return
        }

        cachedToken = token
        socketManager.forceReconnect(token: token)

        // Wait for connection
        for _ in 0..<50 {
            if socketManager.isConnected {
                break
            }
            try? await Task.sleep(nanoseconds: 100_000_000)
        }

        if socketManager.isConnected {
            socketManager.joinRoom(roomId: roomId) { success in
                print(success ? "✅ Rejoined room after force reconnect" : "❌ Failed to rejoin room")
            }
        }
    }

    // MARK: - Typing Indicator

    func sendTypingIndicator(_ isTyping: Bool) {
        guard socketManager.isConnected else { return }
        socketManager.sendTyping(roomId: roomId, isTyping: isTyping)
    }
}
