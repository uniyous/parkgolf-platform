import SwiftUI

// MARK: - Login View

struct LoginView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = LoginViewModel()
    @FocusState private var focusedField: Field?

    enum Field: Hashable {
        case email
        case password
    }

    var body: some View {
        ZStack {
            // Background
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: ParkSpacing.lg) {
                    Spacer()
                        .frame(height: ParkSpacing.xl)

                    // Logo
                    logoSection

                    // Login Form
                    loginFormCard

                    // Test Users Section
                    testUsersCard

                    // Divider
                    dividerSection

                    // Social Login
                    socialLoginSection

                    // Sign Up Link
                    signUpSection

                    Spacer()
                        .frame(height: ParkSpacing.xl)
                }
                .padding(.horizontal, ParkSpacing.md)
            }
        }
        .navigationBarHidden(true)
        .alert("오류", isPresented: $viewModel.showError) {
            Button("확인", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
    }

    // MARK: - Logo Section

    private var logoSection: some View {
        VStack(spacing: ParkSpacing.md) {
            // Animated Logo
            ZStack {
                Circle()
                    .fill(Color.parkPrimary.opacity(0.2))
                    .frame(width: 100, height: 100)

                Circle()
                    .fill(Color.parkPrimary.opacity(0.3))
                    .frame(width: 80, height: 80)

                Image(systemName: "leaf.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(Color.parkPrimary)
            }

            VStack(spacing: ParkSpacing.xs) {
                Text("ParkMate")
                    .font(.parkDisplayMedium)
                    .foregroundStyle(.white)

                Text("친구와 함께하는 파크골프")
                    .font(.parkBodyMedium)
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .padding(.vertical, ParkSpacing.lg)
    }

    // MARK: - Login Form Card

    private var loginFormCard: some View {
        GlassCard {
            VStack(spacing: ParkSpacing.md) {
                // Email Field
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
                    .focused($focusedField, equals: .email)
                    .submitLabel(.next)
                    .onSubmit {
                        focusedField = .password
                    }
                }

                // Password Field
                VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                    Text("비밀번호")
                        .font(.parkLabelMedium)
                        .foregroundStyle(.white.opacity(0.8))

                    GlassSecureField(
                        placeholder: "비밀번호를 입력하세요",
                        text: $viewModel.password,
                        icon: "lock"
                    )
                    .textContentType(.password)
                    .focused($focusedField, equals: .password)
                    .submitLabel(.done)
                    .onSubmit {
                        Task {
                            await login()
                        }
                    }
                }

                // Forgot Password
                HStack {
                    Spacer()
                    NavigationLink {
                        ForgotPasswordView()
                    } label: {
                        Text("비밀번호 찾기")
                            .font(.parkLabelSmall)
                            .foregroundStyle(Color.parkPrimary)
                    }
                }

                // Login Button
                GradientButton(
                    title: "로그인",
                    isLoading: viewModel.isLoading,
                    isDisabled: !viewModel.isFormValid
                ) {
                    Task {
                        await login()
                    }
                }
            }
        }
    }

    // MARK: - Test Users Card

    private var testUsersCard: some View {
        GlassCard(padding: ParkSpacing.sm) {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                HStack {
                    Image(systemName: "person.crop.circle.badge.questionmark")
                        .foregroundStyle(Color.parkInfo)
                    Text("테스트 계정")
                        .font(.parkLabelMedium)
                        .foregroundStyle(.white)
                }

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: ParkSpacing.xs) {
                    ForEach(TestUser.allUsers, id: \.email) { user in
                        TestUserCard(user: user) {
                            withAnimation(.spring(response: 0.3)) {
                                viewModel.email = user.email
                                viewModel.password = user.password
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Divider Section

    private var dividerSection: some View {
        HStack(spacing: ParkSpacing.md) {
            Rectangle()
                .fill(Color.white.opacity(0.2))
                .frame(height: 1)

            Text("또는")
                .font(.parkCaption)
                .foregroundStyle(.white.opacity(0.5))

            Rectangle()
                .fill(Color.white.opacity(0.2))
                .frame(height: 1)
        }
        .padding(.vertical, ParkSpacing.xs)
    }

    // MARK: - Social Login Section

    private var socialLoginSection: some View {
        VStack(spacing: ParkSpacing.sm) {
            // Apple Login
            Button {
                // Apple Sign In
            } label: {
                HStack(spacing: ParkSpacing.sm) {
                    Image(systemName: "apple.logo")
                        .font(.system(size: 18, weight: .medium))
                    Text("Apple로 계속하기")
                        .font(.parkHeadlineSmall)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, ParkSpacing.md)
                .background(Color.white)
                .foregroundStyle(.black)
                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.lg))
            }

            // Kakao Login
            Button {
                // Kakao Sign In
            } label: {
                HStack(spacing: ParkSpacing.sm) {
                    Image(systemName: "message.fill")
                        .font(.system(size: 18, weight: .medium))
                    Text("카카오로 계속하기")
                        .font(.parkHeadlineSmall)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, ParkSpacing.md)
                .background(Color(hex: "FEE500"))
                .foregroundStyle(.black.opacity(0.85))
                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.lg))
            }
        }
    }

    // MARK: - Sign Up Section

    private var signUpSection: some View {
        HStack(spacing: ParkSpacing.xs) {
            Text("계정이 없으신가요?")
                .foregroundStyle(.white.opacity(0.6))

            NavigationLink {
                SignUpView()
            } label: {
                Text("회원가입")
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.parkPrimary)
            }
        }
        .font(.parkBodySmall)
        .padding(.top, ParkSpacing.sm)
    }

    // MARK: - Actions

    private func login() async {
        guard let user = await viewModel.login() else { return }
        appState.signIn(user: user)
    }
}

// MARK: - Glass Secure Field

struct GlassSecureField: View {
    let placeholder: String
    @Binding var text: String
    var icon: String? = nil
    @State private var isSecured = true

    var body: some View {
        HStack(spacing: ParkSpacing.sm) {
            if let icon = icon {
                Image(systemName: icon)
                    .foregroundStyle(.white.opacity(0.5))
                    .frame(width: 20)
            }

            Group {
                if isSecured {
                    SecureField("", text: $text, prompt: Text(placeholder).foregroundColor(.white.opacity(0.4)))
                } else {
                    TextField("", text: $text, prompt: Text(placeholder).foregroundColor(.white.opacity(0.4)))
                }
            }
            .foregroundStyle(.white)
            .font(.parkBodyMedium)

            Button {
                isSecured.toggle()
            } label: {
                Image(systemName: isSecured ? "eye.slash" : "eye")
                    .foregroundStyle(.white.opacity(0.5))
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.vertical, ParkSpacing.sm)
        .background(Color.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: ParkRadius.md)
                .stroke(Color.white.opacity(0.2), lineWidth: 1)
        )
    }
}

// MARK: - Test User Card

struct TestUserCard: View {
    let user: TestUser
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 2) {
                Text(user.name)
                    .font(.parkLabelSmall)
                    .foregroundStyle(.white)

                Text(user.email)
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.5))
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(ParkSpacing.sm)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: ParkRadius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: ParkRadius.sm)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Forgot Password View

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var showConfirmation = false

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            VStack(spacing: ParkSpacing.lg) {
                // Icon
                ZStack {
                    Circle()
                        .fill(Color.parkInfo.opacity(0.2))
                        .frame(width: 80, height: 80)

                    Image(systemName: "envelope.badge.shield.half.filled")
                        .font(.system(size: 36))
                        .foregroundStyle(Color.parkInfo)
                }
                .padding(.top, ParkSpacing.xl)

                VStack(spacing: ParkSpacing.xs) {
                    Text("비밀번호 재설정")
                        .font(.parkHeadlineLarge)
                        .foregroundStyle(.white)

                    Text("가입하신 이메일로\n재설정 링크를 보내드립니다")
                        .font(.parkBodyMedium)
                        .foregroundStyle(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                }

                GlassCard {
                    VStack(spacing: ParkSpacing.md) {
                        GlassTextField(
                            placeholder: "이메일을 입력하세요",
                            text: $email,
                            icon: "envelope"
                        )
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)

                        GradientButton(
                            title: "재설정 링크 보내기",
                            isDisabled: email.isEmpty || !email.contains("@")
                        ) {
                            showConfirmation = true
                        }
                    }
                }
                .padding(.horizontal, ParkSpacing.md)

                Spacer()
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
        .alert("이메일 전송 완료", isPresented: $showConfirmation) {
            Button("확인") {
                dismiss()
            }
        } message: {
            Text("비밀번호 재설정 링크가 이메일로 전송되었습니다.")
        }
    }
}

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

// MARK: - Test User Model

struct TestUser {
    let email: String
    let password: String
    let name: String
    let role: String

    static let allUsers: [TestUser] = [
        TestUser(email: "test@parkgolf.com", password: "test1234", name: "테스트사용자", role: "USER"),
        TestUser(email: "kim@parkgolf.com", password: "test1234", name: "김철수", role: "USER"),
        TestUser(email: "park@parkgolf.com", password: "test1234", name: "박영희", role: "USER"),
        TestUser(email: "lee@parkgolf.com", password: "test1234", name: "이민수", role: "USER"),
    ]
}

#Preview {
    NavigationStack {
        LoginView()
            .environmentObject(AppState())
    }
}
