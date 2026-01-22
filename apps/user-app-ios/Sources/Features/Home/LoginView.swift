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

#Preview {
    NavigationStack {
        LoginView()
            .environmentObject(AppState())
    }
}
