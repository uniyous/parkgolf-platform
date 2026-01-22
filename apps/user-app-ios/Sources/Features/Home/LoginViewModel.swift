import Foundation

@MainActor
final class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var showError = false
    @Published var errorMessage = ""

    private let apiClient = APIClient.shared

    var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty && email.contains("@")
    }

    func login() async -> User? {
        guard isFormValid else { return nil }

        isLoading = true
        defer { isLoading = false }

        do {
            let response = try await apiClient.requestDirect(
                AuthEndpoints.login(email: email, password: password),
                responseType: LoginResponse.self
            )

            // Save token
            await apiClient.setAccessToken(response.accessToken)
            // TODO: Save refresh token to Keychain

            return response.user
        } catch let error as APIError {
            errorMessage = error.localizedDescription
            showError = true
            return nil
        } catch {
            errorMessage = "로그인에 실패했습니다. 다시 시도해주세요."
            showError = true
            return nil
        }
    }
}

@MainActor
final class SignUpViewModel: ObservableObject {
    @Published var name = ""
    @Published var email = ""
    @Published var password = ""
    @Published var confirmPassword = ""
    @Published var phoneNumber = ""
    @Published var agreeToTerms = false
    @Published var isLoading = false
    @Published var showError = false
    @Published var errorMessage = ""

    private let apiClient = APIClient.shared

    var isFormValid: Bool {
        !name.isEmpty &&
        !email.isEmpty &&
        email.contains("@") &&
        !password.isEmpty &&
        password.count >= 8 &&
        password == confirmPassword &&
        agreeToTerms
    }

    func signUp() async -> User? {
        guard isFormValid else { return nil }

        isLoading = true
        defer { isLoading = false }

        do {
            let request = SignUpRequest(
                email: email,
                password: password,
                name: name,
                phoneNumber: phoneNumber.isEmpty ? nil : phoneNumber
            )

            let response = try await apiClient.requestDirect(
                AuthEndpoints.signUp(request: request),
                responseType: LoginResponse.self
            )

            // Save token
            await apiClient.setAccessToken(response.accessToken)

            return response.user
        } catch let error as APIError {
            errorMessage = error.localizedDescription
            showError = true
            return nil
        } catch {
            errorMessage = "회원가입에 실패했습니다. 다시 시도해주세요."
            showError = true
            return nil
        }
    }
}
