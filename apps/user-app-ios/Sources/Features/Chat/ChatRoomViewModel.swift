import Foundation
import UIKit
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
    @Published var typingUserName: String?

    // MARK: - Properties

    let roomId: String
    let currentUserId: String

    private let apiClient = APIClient.shared
    private let socketManager = ChatSocketManager.shared
    private var cancellables = Set<AnyCancellable>()
    private var cursor: String?
    private var cachedToken: String?
    private nonisolated(unsafe) var foregroundObserver: (any NSObjectProtocol)?
    private var typingTimer: Timer?

    // MARK: - Init

    init(roomId: String, currentUserId: String) {
        self.roomId = roomId
        self.currentUserId = currentUserId
        setupSocketSubscriptions()
        setupForegroundObserver()
    }

    deinit {
        if let observer = foregroundObserver {
            NotificationCenter.default.removeObserver(observer)
        }
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

        // Subscribe to typing events
        socketManager.typingReceived
            .receive(on: DispatchQueue.main)
            .sink { [weak self] event in
                guard let self = self else { return }
                guard event.roomId == self.roomId,
                      event.userId != self.currentUserId else { return }
                if event.isTyping {
                    self.typingUserName = event.userName
                    // Auto-clear after 3 seconds
                    self.typingTimer?.invalidate()
                    self.typingTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { [weak self] _ in
                        Task { @MainActor in
                            self?.typingUserName = nil
                        }
                    }
                } else {
                    self.typingUserName = nil
                    self.typingTimer?.invalidate()
                }
            }
            .store(in: &cancellables)

        // Subscribe to reconnection events
        socketManager.reconnected
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in
                guard let self = self else { return }
                // Rejoin room and reload messages on reconnect
                self.socketManager.joinRoom(roomId: self.roomId) { success in
                    #if DEBUG
                    print(success ? "✅ Rejoined room after reconnect" : "❌ Failed to rejoin room after reconnect")
                    #endif
                }
                Task {
                    await self.loadMessages()
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Foreground Observer

    private func setupForegroundObserver() {
        foregroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                guard let self = self else { return }

                // Reconnect socket if disconnected during background
                if !self.socketManager.isConnected {
                    await self.forceReconnect()
                }

                // Reload messages to fill any gap
                await self.loadMessages()
            }
        }
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

            // Mark messages as read
            struct MarkReadResponse: Codable { let success: Bool }
            _ = try? await apiClient.request(
                ChatEndpoints.markAsRead(roomId: roomId),
                responseType: MarkReadResponse.self
            )
        } catch {
            self.error = error
            #if DEBUG
            print("Failed to load messages: \(error)")
            #endif
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
            #if DEBUG
            print("Failed to load more messages: \(error)")
            #endif
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
            #if DEBUG
            print("Failed to send message: \(error)")
            #endif
        }
    }

    // MARK: - WebSocket Connection

    func connectSocket() async {
        guard let token = await apiClient.getAccessToken() else {
            #if DEBUG
            print("No access token available for socket connection")
            #endif
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
            #if DEBUG
            print("❌ Socket connection timeout")
            #endif
            return
        }

        // Join the room
        socketManager.joinRoom(roomId: roomId) { success in
            #if DEBUG
            if success {
                print("✅ Joined room: \(self.roomId)")
            } else {
                print("❌ Failed to join room: \(self.roomId)")
            }
            #endif
        }
    }

    func disconnectSocket() {
        socketManager.leaveRoom(roomId: roomId)
        // Don't disconnect the socket manager itself as it may be used by other rooms
    }

    /// 강제 재연결 (UI에서 호출)
    func forceReconnect() async {
        // 항상 신선한 토큰을 가져옴 (캐시된 토큰은 만료되었을 수 있음)
        guard let token = await apiClient.getAccessToken() else {
            #if DEBUG
            print("No token available for force reconnect")
            #endif
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
                #if DEBUG
                print(success ? "✅ Rejoined room after force reconnect" : "❌ Failed to rejoin room")
                #endif
            }
        }
    }

    // MARK: - Typing Indicator

    func sendTypingIndicator(_ isTyping: Bool) {
        guard socketManager.isConnected else { return }
        socketManager.sendTyping(roomId: roomId, isTyping: isTyping)
    }

    // MARK: - Room Actions

    func leaveChatRoom() async {
        do {
            _ = try await apiClient.request(
                ChatEndpoints.leaveRoom(roomId: roomId),
                responseType: SuccessResponse.self
            )
            disconnectSocket()
        } catch {
            self.error = error
            #if DEBUG
            print("Failed to leave chat room: \(error)")
            #endif
        }
    }

    func inviteMembers(userIds: [String]) async {
        do {
            _ = try await apiClient.request(
                ChatEndpoints.inviteMembers(roomId: roomId, userIds: userIds),
                responseType: SuccessResponse.self
            )
        } catch {
            self.error = error
            #if DEBUG
            print("Failed to invite members: \(error)")
            #endif
        }
    }
}
