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
    @Published var pendingPayment: PendingPayment?

    /// 메시지별 actions 저장 (Web의 aiMessageActions Map과 동일)
    @Published var messageActions: [String: [ChatAction]] = [:]

    // MARK: - Pending Payment

    struct PendingPayment {
        let orderId: String
        let orderName: String
        let amount: Int
        let type: String  // "single" | "split"
    }

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
        case .selectingParticipants: return "팀 편성 중..."
        case .settling: return "정산 처리 중..."
        case .teamComplete: return "팀 예약 완료..."
        default: return "생각 중..."
        }
    }

    /// AI 메시지 전송 (텍스트만). 성공 시 lastResponse 업데이트, 실패 시 lastError 설정
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

    /// 구조화된 AI 요청 (카드 상호작용)
    func sendAiRequest(roomId: String, request: AiChatRequest) async {
        isAiLoading = true
        lastError = nil
        showWelcome = false
        defer { isAiLoading = false }

        do {
            var fullRequest = request
            fullRequest.conversationId = fullRequest.conversationId ?? conversationId
            fullRequest.chatRoomId = roomId

            let location = LocationManager.shared
            fullRequest.latitude = fullRequest.latitude ?? location.latitude
            fullRequest.longitude = fullRequest.longitude ?? location.longitude

            let endpoint = ChatEndpoints.sendAiRequest(roomId: roomId, request: fullRequest)
            let response: AiChatResponse = try await APIClient.shared.request(endpoint, responseType: AiChatResponse.self)
            conversationId = response.conversationId
            conversationState = response.state
            lastResponse = response
        } catch {
            #if DEBUG
            print("AI request error: \(error)")
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

    // MARK: - Payment Persistence (UserDefaults)

    private let pendingPaymentKey = "ai_pending_payment"

    func savePendingPayment(_ payment: PendingPayment) {
        let dict: [String: Any] = [
            "orderId": payment.orderId,
            "orderName": payment.orderName,
            "amount": payment.amount,
            "type": payment.type
        ]
        UserDefaults.standard.set(dict, forKey: pendingPaymentKey)
    }

    func loadPendingPayment() -> PendingPayment? {
        guard let dict = UserDefaults.standard.dictionary(forKey: pendingPaymentKey),
              let orderId = dict["orderId"] as? String,
              let orderName = dict["orderName"] as? String,
              let amount = dict["amount"] as? Int,
              let type = dict["type"] as? String else { return nil }
        return PendingPayment(orderId: orderId, orderName: orderName, amount: amount, type: type)
    }

    func clearPendingPayment() {
        pendingPayment = nil
        UserDefaults.standard.removeObject(forKey: pendingPaymentKey)
    }
}
