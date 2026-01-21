import Foundation
import Combine

@MainActor
final class ChatRoomViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var messages: [ChatMessage] = []
    @Published var inputText = ""
    @Published var isLoading = false
    @Published var isSending = false
    @Published var error: Error?
    @Published var isConnected = false

    // MARK: - Properties

    let roomId: String
    let currentUserId: String

    private let apiClient = APIClient.shared
    private let socketManager = ChatSocketManager.shared
    private var cancellables = Set<AnyCancellable>()
    private var currentPage = 1
    private var hasMorePages = true

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
        currentPage = 1

        defer { isLoading = false }

        do {
            let response = try await apiClient.request(
                ChatEndpoints.messages(roomId: roomId, page: currentPage, limit: 50),
                responseType: ChatMessagesResponse.self
            )
            messages = response.messages.reversed() // Oldest first
            hasMorePages = response.hasMore
        } catch {
            self.error = error
            print("Failed to load messages: \(error)")
        }
    }

    func loadMoreMessages() async {
        guard hasMorePages, !isLoading else { return }

        currentPage += 1

        do {
            let response = try await apiClient.request(
                ChatEndpoints.messages(roomId: roomId, page: currentPage, limit: 50),
                responseType: ChatMessagesResponse.self
            )

            // Insert at beginning (older messages)
            messages.insert(contentsOf: response.messages.reversed(), at: 0)
            hasMorePages = response.hasMore
        } catch {
            self.error = error
            currentPage -= 1
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

        // Connect to socket
        socketManager.connect(token: token)

        // Wait for connection
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 second

        // Join the room
        socketManager.joinRoom(roomId: roomId) { success in
            if success {
                print("✅ Joined room: \(self.roomId)")
            } else {
                print("❌ Failed to join room: \(self.roomId)")
            }
        }
    }

    func disconnectSocket() {
        socketManager.leaveRoom(roomId: roomId)
        // Don't disconnect the socket manager itself as it may be used by other rooms
    }

    // MARK: - Typing Indicator

    func sendTypingIndicator(_ isTyping: Bool) {
        guard socketManager.isConnected else { return }
        socketManager.sendTyping(roomId: roomId, isTyping: isTyping)
    }
}
