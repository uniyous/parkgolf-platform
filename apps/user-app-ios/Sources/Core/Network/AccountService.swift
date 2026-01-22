import Foundation

// MARK: - Account Service

final class AccountService: Sendable {
    private let apiClient: APIClient

    static let shared = AccountService()

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    /// 비밀번호 변경
    func changePassword(
        currentPassword: String,
        newPassword: String,
        confirmPassword: String
    ) async throws -> ChangePasswordResponse {
        let request = ChangePasswordRequest(
            currentPassword: currentPassword,
            newPassword: newPassword,
            confirmPassword: confirmPassword
        )

        let endpoint = AccountEndpoints.changePassword(request: request)
        return try await apiClient.request(endpoint, responseType: ChangePasswordResponse.self)
    }

    /// 비밀번호 만료 여부 확인
    func checkPasswordExpiry() async throws -> PasswordExpiryResponse {
        let endpoint = AccountEndpoints.passwordExpiry()
        return try await apiClient.request(endpoint, responseType: PasswordExpiryResponse.self)
    }
}

// MARK: - Password Validation

enum PasswordValidation {
    /// 비밀번호 정책 검사 결과
    struct ValidationResult {
        let isValid: Bool
        let errors: [String]
    }

    /// 비밀번호 정책 검사
    static func validate(_ password: String) -> ValidationResult {
        var errors: [String] = []

        // 최소 8자
        if password.count < 8 {
            errors.append("8자 이상이어야 합니다")
        }

        // 최대 128자
        if password.count > 128 {
            errors.append("128자 이하여야 합니다")
        }

        // 영문 포함
        let hasLetter = password.range(of: "[a-zA-Z]", options: .regularExpression) != nil
        if !hasLetter {
            errors.append("영문을 포함해야 합니다")
        }

        // 숫자 포함
        let hasNumber = password.range(of: "[0-9]", options: .regularExpression) != nil
        if !hasNumber {
            errors.append("숫자를 포함해야 합니다")
        }

        // 특수문자 포함
        let hasSpecialChar = password.range(
            of: "[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]",
            options: .regularExpression
        ) != nil
        if !hasSpecialChar {
            errors.append("특수문자를 포함해야 합니다")
        }

        return ValidationResult(isValid: errors.isEmpty, errors: errors)
    }

    /// 비밀번호 강도 측정
    static func strength(_ password: String) -> PasswordStrength {
        var score = 0

        // 길이 점수
        if password.count >= 8 { score += 1 }
        if password.count >= 12 { score += 1 }
        if password.count >= 16 { score += 1 }

        // 복잡성 점수
        if password.range(of: "[a-z]", options: .regularExpression) != nil { score += 1 }
        if password.range(of: "[A-Z]", options: .regularExpression) != nil { score += 1 }
        if password.range(of: "[0-9]", options: .regularExpression) != nil { score += 1 }
        if password.range(of: "[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]", options: .regularExpression) != nil {
            score += 1
        }

        switch score {
        case 0...2: return .weak
        case 3...4: return .fair
        case 5...6: return .good
        default: return .strong
        }
    }

    enum PasswordStrength {
        case weak
        case fair
        case good
        case strong

        var description: String {
            switch self {
            case .weak: return "약함"
            case .fair: return "보통"
            case .good: return "좋음"
            case .strong: return "강함"
            }
        }

        var color: String {
            switch self {
            case .weak: return "parkError"
            case .fair: return "parkWarning"
            case .good: return "parkInfo"
            case .strong: return "parkSuccess"
            }
        }
    }
}
