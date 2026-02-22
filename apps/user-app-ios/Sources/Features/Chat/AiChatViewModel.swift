import Foundation
import Combine

@MainActor
final class AiChatViewModel: ObservableObject {
    @Published var isAiMode = false
    @Published var isAiLoading = false
    @Published var conversationId: String?
    @Published private(set) var lastResponse: AiChatResponse?
    @Published var lastError: String?

    /// 메시지별 actions 저장 (Web의 aiMessageActions Map과 동일)
    @Published var messageActions: [String: [ChatAction]] = [:]

    func toggleAiMode() {
        isAiMode.toggle()
    }

    /// AI 메시지 전송. 성공 시 lastResponse 업데이트, 실패 시 lastError 설정
    func sendAiMessage(roomId: String, message: String) async {
        isAiLoading = true
        lastError = nil
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
            lastError = "AI 응답에 실패했습니다."
        }
    }

    /// 메시지 ID에 대한 actions 저장
    func storeActions(messageId: String, actions: [ChatAction]) {
        messageActions[messageId] = actions
    }

    /// 메시지 ID에 대한 actions 조회
    func getActions(for messageId: String) -> [ChatAction]? {
        messageActions[messageId]
    }
}
