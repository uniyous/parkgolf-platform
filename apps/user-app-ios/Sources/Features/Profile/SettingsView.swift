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
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = DeleteAccountViewModel()

    private let deletionReasons = [
        "더 이상 서비스를 이용하지 않아요",
        "다른 계정을 사용할 거예요",
        "개인정보가 걱정돼요",
        "서비스에 불만이 있어요",
        "기타"
    ]

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            if viewModel.isLoading {
                ProgressView()
                    .tint(.parkPrimary)
            } else if viewModel.status?.isDeletionRequested == true {
                deletionStatusView
            } else {
                deletionRequestForm
            }
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
                Button { dismiss() } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .task {
            await viewModel.loadDeletionStatus()
        }
        .onChange(of: viewModel.logoutComplete) { _, complete in
            if complete {
                appState.signOut()
            }
        }
        .alert("오류", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("확인", role: .cancel) {}
        } message: {
            Text(viewModel.error ?? "")
        }
    }

    // MARK: - Deletion Status (Grace Period)

    private var deletionStatusView: some View {
        ScrollView {
            VStack(spacing: ParkSpacing.md) {
                GlassCard {
                    VStack(alignment: .leading, spacing: ParkSpacing.md) {
                        // Header
                        HStack(spacing: 12) {
                            Circle()
                                .fill(Color.parkWarning.opacity(0.2))
                                .frame(width: 48, height: 48)
                                .overlay {
                                    Image(systemName: "clock.fill")
                                        .foregroundStyle(Color.parkWarning)
                                        .font(.title3)
                                }

                            VStack(alignment: .leading, spacing: 2) {
                                Text("삭제 예정")
                                    .font(.parkHeadlineMedium)
                                    .foregroundStyle(.white)
                                Text("계정 삭제가 진행 중입니다")
                                    .font(.parkCaption)
                                    .foregroundStyle(Color.textSecondary)
                            }
                        }

                        // Timeline
                        VStack(spacing: 0) {
                            statusRow(label: "요청일", value: formatDate(viewModel.status?.deletionRequestedAt))
                            Divider().overlay(Color.glassBorder)
                                .padding(.vertical, 8)
                            statusRow(label: "삭제 예정일", value: formatDate(viewModel.status?.deletionScheduledAt))
                            Divider().overlay(Color.glassBorder)
                                .padding(.vertical, 8)
                            HStack {
                                Text("남은 기간")
                                    .font(.parkBodyMedium)
                                    .foregroundStyle(Color.textSecondary)
                                Spacer()
                                Text("D-\(viewModel.status?.daysRemaining ?? 0)")
                                    .font(.parkHeadlineMedium)
                                    .foregroundStyle(Color.parkWarning)
                            }
                        }

                        // Info
                        Text("삭제 예정일까지 로그인하거나 아래 버튼을 누르면 삭제가 취소됩니다.")
                            .font(.parkCaption)
                            .foregroundStyle(Color.textSecondary)
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.parkPrimary.opacity(0.1))
                            )
                    }
                }

                GradientButton(
                    title: viewModel.isCancelling ? "취소 중..." : "계정 삭제 취소",
                    isLoading: viewModel.isCancelling
                ) {
                    Task { await viewModel.cancelDeletion() }
                }

                Button("돌아가기") { dismiss() }
                    .font(.parkCaption)
                    .foregroundStyle(Color.textSecondary)
            }
            .padding(.horizontal, ParkSpacing.md)
            .padding(.top, ParkSpacing.sm)
        }
    }

    // MARK: - Deletion Request Form

    private var deletionRequestForm: some View {
        ScrollView {
            VStack(spacing: ParkSpacing.md) {
                // Warnings
                GlassCard {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(Color.parkError)
                            Text("주의사항")
                                .font(.parkHeadlineSmall)
                                .foregroundStyle(Color.parkError)
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            warningRow("계정 삭제 요청 후 7일의 유예 기간이 있습니다")
                            warningRow("유예 기간 내 로그인하면 삭제가 자동 취소됩니다")
                            warningRow("삭제 후 예약 내역, 채팅, 친구 등 모든 데이터가 삭제됩니다")
                            warningRow("삭제된 계정은 복구할 수 없습니다")
                        }
                    }
                }

                // Reason
                GlassCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("삭제 사유 (선택)")
                            .font(.parkHeadlineSmall)
                            .foregroundStyle(.white)

                        ForEach(deletionReasons, id: \.self) { r in
                            Button {
                                viewModel.reason = r
                            } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: viewModel.reason == r ? "largecircle.fill.circle" : "circle")
                                        .foregroundStyle(viewModel.reason == r ? Color.parkPrimary : Color.textTertiary)
                                        .font(.body)
                                    Text(r)
                                        .font(.parkBodyMedium)
                                        .foregroundStyle(.white)
                                    Spacer()
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 6)
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(viewModel.reason == r ? Color.parkPrimary.opacity(0.1) : Color.clear)
                                )
                            }
                        }
                    }
                }

                // Password
                GlassCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("본인 확인")
                            .font(.parkHeadlineSmall)
                            .foregroundStyle(.white)
                        Text("계정 삭제를 위해 비밀번호를 입력해 주세요.")
                            .font(.parkCaption)
                            .foregroundStyle(Color.textSecondary)

                        SecureField("비밀번호 입력", text: $viewModel.password)
                            .textContentType(.password)
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.white.opacity(0.08))
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
                            )
                            .foregroundStyle(.white)
                    }
                }

                // Confirmation
                Button {
                    viewModel.confirmed.toggle()
                } label: {
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: viewModel.confirmed ? "checkmark.square.fill" : "square")
                            .foregroundStyle(viewModel.confirmed ? Color.parkError : Color.textTertiary)
                            .font(.title3)
                        Text("위 내용을 확인했으며, 계정 삭제를 요청합니다. 7일 후 모든 데이터가 영구 삭제됨을 이해합니다.")
                            .font(.parkCaption)
                            .foregroundStyle(Color.textSecondary)
                            .multilineTextAlignment(.leading)
                    }
                    .padding(.horizontal, 4)
                }

                // Submit
                GradientButton(
                    title: viewModel.isSubmitting ? "처리 중..." : "계정 삭제 요청",
                    style: .destructive,
                    isLoading: viewModel.isSubmitting
                ) {
                    Task { await viewModel.requestDeletion() }
                }
                .disabled(!viewModel.canSubmit)
                .opacity(viewModel.canSubmit ? 1.0 : 0.5)

                Button("돌아가기") { dismiss() }
                    .font(.parkCaption)
                    .foregroundStyle(Color.textSecondary)
                    .padding(.bottom, ParkSpacing.lg)
            }
            .padding(.horizontal, ParkSpacing.md)
            .padding(.top, ParkSpacing.sm)
        }
    }

    // MARK: - Helpers

    private func statusRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.parkBodyMedium)
                .foregroundStyle(Color.textSecondary)
            Spacer()
            Text(value)
                .font(.parkBodyMedium)
                .foregroundStyle(.white)
        }
    }

    private func warningRow(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "shield.fill")
                .foregroundStyle(Color.parkError)
                .font(.caption)
            Text(text)
                .font(.parkCaption)
                .foregroundStyle(Color.textSecondary)
        }
    }

    private func formatDate(_ dateString: String?) -> String {
        guard let dateString = dateString, dateString.count >= 10 else { return "-" }
        let prefix = String(dateString.prefix(10))
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: prefix) else { return prefix }
        formatter.dateFormat = "yyyy년 M월 d일"
        return formatter.string(from: date)
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
