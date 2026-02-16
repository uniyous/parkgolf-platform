import Foundation

@MainActor
final class DeleteAccountViewModel: ObservableObject {
    @Published var isLoading = true
    @Published var status: DeletionStatusResponse?
    @Published var password = ""
    @Published var reason = ""
    @Published var confirmed = false
    @Published var isSubmitting = false
    @Published var isCancelling = false
    @Published var error: String?
    @Published var logoutComplete = false

    var canSubmit: Bool {
        !password.isEmpty && confirmed && !isSubmitting
    }

    private let accountService: AccountService

    init(accountService: AccountService = .shared) {
        self.accountService = accountService
    }

    func loadDeletionStatus() async {
        isLoading = true
        error = nil

        do {
            status = try await accountService.getDeletionStatus()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func requestDeletion() async {
        guard canSubmit else { return }

        isSubmitting = true
        error = nil

        do {
            let reasonValue = reason.isEmpty ? nil : reason
            _ = try await accountService.requestDeletion(password: password, reason: reasonValue)
            logoutComplete = true
        } catch let apiError as APIError {
            switch apiError {
            case .serverError(_, let message):
                self.error = message
            default:
                self.error = "계정 삭제 요청에 실패했습니다"
            }
        } catch {
            self.error = "계정 삭제 요청에 실패했습니다"
        }

        isSubmitting = false
    }

    func cancelDeletion() async {
        isCancelling = true
        error = nil

        do {
            _ = try await accountService.cancelDeletion()
            await loadDeletionStatus()
        } catch {
            self.error = "계정 삭제 취소에 실패했습니다"
        }

        isCancelling = false
    }
}
