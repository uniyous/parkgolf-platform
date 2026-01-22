import SwiftUI

// MARK: - Change Password View

struct ChangePasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = ChangePasswordViewModel()

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: ParkSpacing.lg) {
                    // 안내 문구
                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            HStack {
                                Image(systemName: "info.circle.fill")
                                    .foregroundStyle(Color.parkInfo)
                                Text("비밀번호 정책")
                                    .font(.parkHeadlineSmall)
                                    .foregroundStyle(.white)
                            }

                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                PolicyItem(text: "8자 이상 128자 이하")
                                PolicyItem(text: "영문, 숫자, 특수문자 조합")
                                PolicyItem(text: "현재 비밀번호와 다르게 설정")
                            }
                        }
                    }

                    // 비밀번호 입력 폼
                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.md) {
                            // 현재 비밀번호
                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("현재 비밀번호")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                PasswordFieldWithToggle(
                                    placeholder: "현재 비밀번호 입력",
                                    text: $viewModel.currentPassword,
                                    isSecure: $viewModel.isCurrentPasswordSecure
                                )
                            }

                            Divider()
                                .background(Color.white.opacity(0.1))

                            // 새 비밀번호
                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("새 비밀번호")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                PasswordFieldWithToggle(
                                    placeholder: "새 비밀번호 입력",
                                    text: $viewModel.newPassword,
                                    isSecure: $viewModel.isNewPasswordSecure
                                )

                                // 비밀번호 강도 표시
                                if !viewModel.newPassword.isEmpty {
                                    PasswordStrengthIndicator(strength: viewModel.passwordStrength)
                                }

                                // 유효성 에러 메시지
                                ForEach(viewModel.validationErrors, id: \.self) { error in
                                    HStack(spacing: 4) {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.system(size: 12))
                                        Text(error)
                                            .font(.parkCaption)
                                    }
                                    .foregroundStyle(Color.parkError)
                                }
                            }

                            // 새 비밀번호 확인
                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("새 비밀번호 확인")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                PasswordFieldWithToggle(
                                    placeholder: "새 비밀번호 다시 입력",
                                    text: $viewModel.confirmPassword,
                                    isSecure: $viewModel.isConfirmPasswordSecure
                                )

                                // 일치 여부 표시
                                if !viewModel.confirmPassword.isEmpty {
                                    HStack(spacing: 4) {
                                        Image(systemName: viewModel.passwordsMatch ? "checkmark.circle.fill" : "xmark.circle.fill")
                                            .font(.system(size: 12))
                                        Text(viewModel.passwordsMatch ? "비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다")
                                            .font(.parkCaption)
                                    }
                                    .foregroundStyle(viewModel.passwordsMatch ? Color.parkSuccess : Color.parkError)
                                }
                            }
                        }
                    }

                    // 변경 버튼
                    GradientButton(
                        title: "비밀번호 변경",
                        isLoading: viewModel.isLoading,
                        isDisabled: !viewModel.canSubmit
                    ) {
                        Task {
                            await viewModel.changePassword()
                        }
                    }
                }
                .padding(ParkSpacing.md)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("비밀번호 변경")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .alert("오류", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("확인") {
                viewModel.errorMessage = nil
            }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .alert("비밀번호 변경 완료", isPresented: $viewModel.showSuccessAlert) {
            Button("확인") {
                dismiss()
            }
        } message: {
            Text("비밀번호가 성공적으로 변경되었습니다.\n보안을 위해 다시 로그인해 주세요.")
        }
    }
}

// MARK: - Change Password ViewModel

@MainActor
class ChangePasswordViewModel: ObservableObject {
    @Published var currentPassword = ""
    @Published var newPassword = ""
    @Published var confirmPassword = ""

    @Published var isCurrentPasswordSecure = true
    @Published var isNewPasswordSecure = true
    @Published var isConfirmPasswordSecure = true

    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showSuccessAlert = false

    private let accountService = AccountService.shared

    var validationErrors: [String] {
        guard !newPassword.isEmpty else { return [] }
        let result = PasswordValidation.validate(newPassword)
        return result.errors
    }

    var passwordStrength: PasswordValidation.PasswordStrength {
        PasswordValidation.strength(newPassword)
    }

    var passwordsMatch: Bool {
        !newPassword.isEmpty && newPassword == confirmPassword
    }

    var canSubmit: Bool {
        !currentPassword.isEmpty &&
        !newPassword.isEmpty &&
        !confirmPassword.isEmpty &&
        validationErrors.isEmpty &&
        passwordsMatch
    }

    func changePassword() async {
        guard canSubmit else { return }

        isLoading = true
        errorMessage = nil

        do {
            _ = try await accountService.changePassword(
                currentPassword: currentPassword,
                newPassword: newPassword,
                confirmPassword: confirmPassword
            )
            showSuccessAlert = true
        } catch let error as APIError {
            errorMessage = error.localizedDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

// MARK: - Password Field With Toggle

struct PasswordFieldWithToggle: View {
    let placeholder: String
    @Binding var text: String
    @Binding var isSecure: Bool

    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: ParkSpacing.sm) {
            Image(systemName: "lock")
                .font(.system(size: 18))
                .foregroundStyle(.white.opacity(0.6))
                .frame(width: 24)

            if isSecure {
                SecureField(placeholder, text: $text)
                    .textFieldStyle(.plain)
                    .foregroundStyle(.white)
                    .tint(Color.parkPrimary)
                    .focused($isFocused)
            } else {
                TextField(placeholder, text: $text)
                    .textFieldStyle(.plain)
                    .foregroundStyle(.white)
                    .tint(Color.parkPrimary)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($isFocused)
            }

            Button {
                isSecure.toggle()
            } label: {
                Image(systemName: isSecure ? "eye.slash" : "eye")
                    .foregroundStyle(.white.opacity(0.6))
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .frame(height: 52)
        .background(
            RoundedRectangle(cornerRadius: ParkRadius.md)
                .fill(.white.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: ParkRadius.md)
                        .stroke(isFocused ? Color.parkPrimary : Color.white.opacity(0.2), lineWidth: 1)
                )
        )
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }
}

// MARK: - Password Strength Indicator

struct PasswordStrengthIndicator: View {
    let strength: PasswordValidation.PasswordStrength

    var body: some View {
        HStack(spacing: ParkSpacing.sm) {
            // 강도 바
            HStack(spacing: 4) {
                ForEach(0..<4, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(index < strengthLevel ? strengthColor : Color.white.opacity(0.2))
                        .frame(height: 4)
                }
            }

            Text(strength.description)
                .font(.parkCaption)
                .foregroundStyle(strengthColor)
        }
    }

    private var strengthLevel: Int {
        switch strength {
        case .weak: return 1
        case .fair: return 2
        case .good: return 3
        case .strong: return 4
        }
    }

    private var strengthColor: Color {
        switch strength {
        case .weak: return .parkError
        case .fair: return .parkWarning
        case .good: return .parkInfo
        case .strong: return .parkSuccess
        }
    }
}

// MARK: - Policy Item

struct PolicyItem: View {
    let text: String

    var body: some View {
        HStack(spacing: ParkSpacing.xs) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 12))
                .foregroundStyle(Color.parkSuccess.opacity(0.8))
            Text(text)
                .font(.parkBodySmall)
                .foregroundStyle(.white.opacity(0.7))

            Spacer()
        }
    }
}

// MARK: - Delete Account View

struct DeleteAccountView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "trash.fill",
                title: "계정 삭제",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("계정 삭제")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

// MARK: - Terms View

struct TermsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "doc.plaintext",
                title: "이용약관",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("이용약관")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

// MARK: - Privacy Policy View

struct PrivacyPolicyView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "hand.raised.fill",
                title: "개인정보처리방침",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("개인정보처리방침")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }

            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

#Preview {
    NavigationStack {
        ChangePasswordView()
    }
}
