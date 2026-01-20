import Foundation

@MainActor
final class ChatRoomViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var inputText = ""
    @Published var isLoading = false
    @Published var error: Error?

    let roomId: String
    let currentUserId: String = "current-user-id" // TODO: Get from auth state

    private let apiClient = APIClient.shared
    private let webSocketClient = WebSocketClient()
    private var currentPage = 1
    private var hasMorePages = true

    init(roomId: String) {
        self.roomId = roomId
    }

    // MARK: - Load Messages

    func loadMessages() async {
        isLoading = true
        currentPage = 1

        defer { isLoading = false }

        do {
            let response = try await apiClient.requestList(
                ChatEndpoints.messages(roomId: roomId, page: currentPage, limit: 50),
                responseType: ChatMessage.self
            )
            messages = response.data.reversed() // Oldest first
            hasMorePages = response.pagination.page < response.pagination.totalPages
        } catch {
            self.error = error
            print("Failed to load messages: \(error)")
        }
    }

    func loadMoreMessages() async {
        guard hasMorePages, !isLoading else { return }

        currentPage += 1

        do {
            let response = try await apiClient.requestList(
                ChatEndpoints.messages(roomId: roomId, page: currentPage, limit: 50),
                responseType: ChatMessage.self
            )

            // Insert at beginning (older messages)
            messages.insert(contentsOf: response.data.reversed(), at: 0)
            hasMorePages = response.pagination.page < response.pagination.totalPages
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

        inputText = ""

        do {
            // Send via WebSocket for real-time
            let wsMessage = WebSocketMessage(
                type: "chat_message",
                roomId: roomId,
                content: text
            )
            try await webSocketClient.send(message: wsMessage)

            // Also send via REST as backup
            let message = try await apiClient.request(
                ChatEndpoints.sendMessage(roomId: roomId, content: text),
                responseType: ChatMessage.self
            )

            // Add to local messages if not already added by WebSocket
            if !messages.contains(where: { $0.id == message.id }) {
                messages.append(message)
            }
        } catch {
            self.error = error
            print("Failed to send message: \(error)")
        }
    }

    // MARK: - WebSocket

    func connectWebSocket() async {
        // TODO: Get token from auth state
        let token = "user-access-token"
        let roomId = self.roomId

        do {
            try await webSocketClient.connect(token: token)

            await webSocketClient.setMessageHandler { @Sendable [weak self] message in
                Task { @MainActor in
                    guard let self = self else { return }
                    if message.roomId == roomId {
                        self.messages.append(message)
                    }
                }
            }
        } catch {
            print("WebSocket connection failed: \(error)")
        }
    }

    func disconnectWebSocket() async {
        await webSocketClient.disconnect()
    }
}
