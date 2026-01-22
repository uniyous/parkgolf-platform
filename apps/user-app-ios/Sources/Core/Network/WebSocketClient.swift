import Foundation

// MARK: - WebSocket Client for Real-time Chat

actor WebSocketClient {
    private var webSocket: URLSessionWebSocketTask?
    private let session: URLSession
    private var isConnected = false
    private var messageHandler: (@Sendable (ChatMessage) -> Void)?

    init() {
        let configuration = URLSessionConfiguration.default
        self.session = URLSession(configuration: configuration)
    }

    // MARK: - Connection

    func connect(token: String) async throws {
        guard !isConnected else { return }

        // TODO: Load from configuration
        guard var urlComponents = URLComponents(string: "wss://api.parkgolf.com/ws/chat") else {
            throw WebSocketError.invalidURL
        }

        urlComponents.queryItems = [
            URLQueryItem(name: "token", value: token)
        ]

        guard let url = urlComponents.url else {
            throw WebSocketError.invalidURL
        }

        webSocket = session.webSocketTask(with: url)
        webSocket?.resume()
        isConnected = true

        // Start receiving messages
        await receiveMessages()
    }

    func disconnect() {
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        isConnected = false
    }

    // MARK: - Send Message

    func send(message: WebSocketMessage) async throws {
        guard let webSocket = webSocket, isConnected else {
            throw WebSocketError.notConnected
        }

        let encoder = JSONEncoder()
        let data = try encoder.encode(message)

        guard let jsonString = String(data: data, encoding: .utf8) else {
            throw WebSocketError.encodingError
        }

        try await webSocket.send(.string(jsonString))
    }

    // MARK: - Receive Messages

    func setMessageHandler(_ handler: @escaping @Sendable (ChatMessage) -> Void) {
        self.messageHandler = handler
    }

    private func receiveMessages() async {
        guard let webSocket = webSocket else { return }

        do {
            let message = try await webSocket.receive()

            switch message {
            case .string(let text):
                handleIncomingMessage(text)
            case .data(let data):
                if let text = String(data: data, encoding: .utf8) {
                    handleIncomingMessage(text)
                }
            @unknown default:
                break
            }

            // Continue receiving
            if isConnected {
                await receiveMessages()
            }
        } catch {
            isConnected = false
            #if DEBUG
            print("WebSocket receive error: \(error)")
            #endif
        }
    }

    private func handleIncomingMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        do {
            let wsMessage = try decoder.decode(WebSocketIncomingMessage.self, from: data)

            switch wsMessage.type {
            case "chat_message":
                if let chatMessage = wsMessage.payload {
                    messageHandler?(chatMessage)
                }
            case "typing":
                // Handle typing indicator
                break
            case "read":
                // Handle read receipt
                break
            default:
                break
            }
        } catch {
            #if DEBUG
            print("Failed to decode WebSocket message: \(error)")
            #endif
        }
    }
}

// MARK: - WebSocket Messages

struct WebSocketMessage: Codable, Sendable {
    let type: String
    let roomId: String
    let content: String?

    enum CodingKeys: String, CodingKey {
        case type
        case roomId = "room_id"
        case content
    }
}

struct WebSocketIncomingMessage: Codable, Sendable {
    let type: String
    let payload: ChatMessage?
}

// MARK: - WebSocket Error

enum WebSocketError: Error, LocalizedError {
    case invalidURL
    case notConnected
    case encodingError
    case connectionFailed

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "WebSocket URL이 잘못되었습니다."
        case .notConnected:
            return "WebSocket이 연결되어 있지 않습니다."
        case .encodingError:
            return "메시지 인코딩에 실패했습니다."
        case .connectionFailed:
            return "WebSocket 연결에 실패했습니다."
        }
    }
}
