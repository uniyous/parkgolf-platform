import Foundation
import Combine

@MainActor
final class AiChatViewModel: ObservableObject {
    @Published var isAiMode = false
    @Published var isAiLoading = false
    @Published var conversationId: String?
    @Published private(set) var conversationState: ConversationState = .idle
    @Published private(set) var lastResponse: AiChatResponse?
    @Published var lastError: String?
    @Published var showWelcome = false
    @Published var selectedClubId: String?
    @Published var selectedSlotId: String?

    /// 메시지별 actions 저장 (Web의 aiMessageActions Map과 동일)
    @Published var messageActions: [String: [ChatAction]] = [:]

    func toggleAiMode() {
        isAiMode.toggle()
        if isAiMode {
            showWelcome = true
            selectedClubId = nil
            selectedSlotId = nil
        } else {
            // Reset all conversation state
            conversationId = nil
            conversationState = .idle
            showWelcome = false
            selectedClubId = nil
            selectedSlotId = nil
        }
    }

    /// AI 로딩 상태에 따른 텍스트
    var aiLoadingText: String {
        switch conversationState {
        case .collecting: return "검색 중..."
        case .confirming: return "예약 확인 중..."
        case .booking: return "예약 처리 중..."
        default: return "생각 중..."
        }
    }

    /// AI 메시지 전송. 성공 시 lastResponse 업데이트, 실패 시 lastError 설정
    func sendAiMessage(roomId: String, message: String) async {
        isAiLoading = true
        lastError = nil
        showWelcome = false
        defer { isAiLoading = false }

        do {
            let location = LocationManager.shared
            let endpoint = ChatEndpoints.sendAiMessage(
                roomId: roomId,
                message: message,
                conversationId: conversationId,
                latitude: location.latitude,
                longitude: location.longitude
            )
            let response: AiChatResponse = try await APIClient.shared.request(endpoint, responseType: AiChatResponse.self)
            conversationId = response.conversationId
            conversationState = response.state
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
