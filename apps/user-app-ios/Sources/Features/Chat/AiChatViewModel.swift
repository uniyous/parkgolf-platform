import Foundation
import Combine

@MainActor
final class AiChatViewModel: ObservableObject {
    @Published var isAiMode = false
    @Published var isAiLoading = false
    @Published var conversationId: String?
    @Published private(set) var lastResponse: AiChatResponse?

    func toggleAiMode() {
        isAiMode.toggle()
    }

    func sendAiMessage(roomId: String, message: String) async {
        isAiLoading = true
        defer { isAiLoading = false }

        do {
            let endpoint = ChatEndpoints.sendAiMessage(
                roomId: roomId,
                message: message,
                conversationId: conversationId
            )
            let response: AiChatResponse = try await APIClient.shared.request(endpoint, responseType: AiChatResponse.self)
            conversationId = response.conversationId
            lastResponse = response
        } catch {
            #if DEBUG
            print("AI chat error: \(error)")
            #endif
            lastResponse = nil
        }
    }
}
