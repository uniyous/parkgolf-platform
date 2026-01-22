import SwiftUI

// MARK: - Sign Up View

struct SignUpView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = SignUpViewModel()

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: ParkSpacing.lg) {
                    // Header
                    VStack(spacing: ParkSpacing.xs) {
                        Text("회원가입")
                            .font(.parkDisplaySmall)
                            .foregroundStyle(.white)

                        Text("ParkMate와 함께 시작하세요")
                            .font(.parkBodyMedium)
                            .foregroundStyle(.white.opacity(0.7))
                    }
                    .padding(.top, ParkSpacing.lg)

                    // Form
                    GlassCard {
                        VStack(spacing: ParkSpacing.md) {
                            // Name
                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("이름")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                GlassTextField(
                                    placeholder: "이름을 입력하세요",
                                    text: $viewModel.name,
                                    icon: "person"
                                )
                                .textContentType(.name)
                            }

                            // Email
                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("이메일")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                GlassTextField(
                                    placeholder: "이메일을 입력하세요",
                                    text: $viewModel.email,
                                    icon: "envelope"
                                )
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                            }

                            // Password
                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("비밀번호")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                GlassSecureField(
                                    placeholder: "8자 이상 입력하세요",
                                    text: $viewModel.password,
                                    icon: "lock"
                                )
                                .textContentType(.newPassword)
                            }

                            // Confirm Password
                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("비밀번호 확인")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                GlassSecureField(
                                    placeholder: "비밀번호를 다시 입력하세요",
                                    text: $viewModel.confirmPassword,
                                    icon: "lock.shield"
                                )
                                .textContentType(.newPassword)

                                if !viewModel.confirmPassword.isEmpty && viewModel.password != viewModel.confirmPassword {
                                    Text("비밀번호가 일치하지 않습니다")
                                        .font(.parkCaption)
                                        .foregroundStyle(Color.parkError)
                                }
                            }

                            // Phone
                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("휴대폰 번호 (선택)")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                GlassTextField(
                                    placeholder: "010-0000-0000",
                                    text: $viewModel.phoneNumber,
                                    icon: "phone"
                                )
                                .textContentType(.telephoneNumber)
                                .keyboardType(.phonePad)
                            }
                        }
                    }

                    // Terms
                    GlassCard(padding: ParkSpacing.sm) {
                        Button {
                            viewModel.agreeToTerms.toggle()
                        } label: {
                            HStack(spacing: ParkSpacing.sm) {
                                Image(systemName: viewModel.agreeToTerms ? "checkmark.square.fill" : "square")
                                    .foregroundStyle(viewModel.agreeToTerms ? Color.parkPrimary : .white.opacity(0.4))
                                    .font(.system(size: 22))

                                VStack(alignment: .leading, spacing: 2) {
                                    Text("이용약관 및 개인정보처리방침에 동의합니다")
                                        .font(.parkBodySmall)
                                        .foregroundStyle(.white.opacity(0.8))

                                    Text("(필수)")
                                        .font(.parkCaption)
                                        .foregroundStyle(Color.parkError)
                                }

                                Spacer()
                            }
                        }
                    }

                    // Sign Up Button
                    GradientButton(
                        title: "회원가입",
                        isLoading: viewModel.isLoading,
                        isDisabled: !viewModel.isFormValid
                    ) {
                        Task {
                            if let user = await viewModel.signUp() {
                                appState.signIn(user: user)
                            }
                        }
                    }

                    Spacer()
                        .frame(height: ParkSpacing.xl)
                }
                .padding(.horizontal, ParkSpacing.md)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
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
        .alert("오류", isPresented: $viewModel.showError) {
            Button("확인", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
    }
}

#Preview {
    NavigationStack {
        SignUpView()
            .environmentObject(AppState())
    }
}
