import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = LoginViewModel()
    @FocusState private var focusedField: Field?

    enum Field: Hashable {
        case email
        case password
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer()
                    .frame(height: 20)

                // Logo
                logoSection

                // Login Form
                loginForm

                // Test Users Section
                testUsersSection

                // Divider
                dividerSection

                // Social Login
                socialLoginSection

                // Sign Up Link
                signUpSection

                Spacer()
            }
            .padding(.horizontal, 24)
        }
        .navigationBarHidden(true)
        .alert("오류", isPresented: $viewModel.showError) {
            Button("확인", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
    }

    // MARK: - Test Users Section

    private var testUsersSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("테스트 계정 (탭하여 자동 입력)")
                .font(.caption)
                .foregroundStyle(.secondary)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(TestUser.allUsers, id: \.email) { user in
                    TestUserButton(user: user) {
                        viewModel.email = user.email
                        viewModel.password = user.password
                    }
                }
            }
        }
        .padding(16)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Logo Section

    private var logoSection: some View {
        VStack(spacing: 16) {
            Text("🏌️")
                .font(.system(size: 70))

            Text("ParkMate")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("친구와 함께하는 파크골프")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Login Form

    private var loginForm: some View {
        VStack(spacing: 16) {
            // Email Field
            VStack(alignment: .leading, spacing: 8) {
                Text("이메일")
                    .font(.subheadline)
                    .fontWeight(.medium)

                TextField("이메일을 입력하세요", text: $viewModel.email)
                    .textFieldStyle(CustomTextFieldStyle())
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
            VStack(alignment: .leading, spacing: 8) {
                Text("비밀번호")
                    .font(.subheadline)
                    .fontWeight(.medium)

                SecureField("비밀번호를 입력하세요", text: $viewModel.password)
                    .textFieldStyle(CustomTextFieldStyle())
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
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            // Login Button
            Button {
                Task {
                    await login()
                }
            } label: {
                HStack {
                    if viewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("로그인")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.green)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(viewModel.isLoading || !viewModel.isFormValid)
            .opacity(viewModel.isFormValid ? 1 : 0.6)
        }
    }

    // MARK: - Divider Section

    private var dividerSection: some View {
        HStack {
            Rectangle()
                .fill(Color(.separator))
                .frame(height: 1)

            Text("또는")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 16)

            Rectangle()
                .fill(Color(.separator))
                .frame(height: 1)
        }
    }

    // MARK: - Social Login Section

    private var socialLoginSection: some View {
        VStack(spacing: 12) {
            // Apple Login
            Button {
                // Apple Sign In
            } label: {
                HStack {
                    Image(systemName: "apple.logo")
                    Text("Apple로 계속하기")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.black)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Kakao Login
            Button {
                // Kakao Sign In
            } label: {
                HStack {
                    Image(systemName: "message.fill")
                    Text("카카오로 계속하기")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.yellow)
                .foregroundStyle(.black)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    // MARK: - Sign Up Section

    private var signUpSection: some View {
        HStack {
            Text("계정이 없으신가요?")
                .foregroundStyle(.secondary)

            NavigationLink {
                SignUpView()
            } label: {
                Text("회원가입")
                    .fontWeight(.semibold)
                    .foregroundStyle(.green)
            }
        }
        .font(.subheadline)
    }

    // MARK: - Actions

    private func login() async {
        guard let user = await viewModel.login() else { return }
        appState.signIn(user: user)
    }
}

// MARK: - Custom Text Field Style

struct CustomTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Forgot Password View

struct ForgotPasswordView: View {
    @State private var email = ""
    @State private var showConfirmation = false

    var body: some View {
        VStack(spacing: 24) {
            Text("비밀번호 재설정 링크를\n이메일로 보내드립니다")
                .font(.title2)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)

            TextField("이메일", text: $email)
                .textFieldStyle(CustomTextFieldStyle())
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)

            Button {
                showConfirmation = true
            } label: {
                Text("재설정 링크 보내기")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.green)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(email.isEmpty)

            Spacer()
        }
        .padding(24)
        .navigationTitle("비밀번호 찾기")
        .alert("이메일 전송 완료", isPresented: $showConfirmation) {
            Button("확인", role: .cancel) {}
        } message: {
            Text("비밀번호 재설정 링크가 이메일로 전송되었습니다.")
        }
    }
}

// MARK: - Sign Up View

struct SignUpView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = SignUpViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Form Fields
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("이름")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        TextField("이름을 입력하세요", text: $viewModel.name)
                            .textFieldStyle(CustomTextFieldStyle())
                            .textContentType(.name)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("이메일")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        TextField("이메일을 입력하세요", text: $viewModel.email)
                            .textFieldStyle(CustomTextFieldStyle())
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("비밀번호")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        SecureField("비밀번호를 입력하세요", text: $viewModel.password)
                            .textFieldStyle(CustomTextFieldStyle())
                            .textContentType(.newPassword)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("비밀번호 확인")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        SecureField("비밀번호를 다시 입력하세요", text: $viewModel.confirmPassword)
                            .textFieldStyle(CustomTextFieldStyle())
                            .textContentType(.newPassword)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("휴대폰 번호")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        TextField("휴대폰 번호를 입력하세요", text: $viewModel.phoneNumber)
                            .textFieldStyle(CustomTextFieldStyle())
                            .textContentType(.telephoneNumber)
                            .keyboardType(.phonePad)
                    }
                }

                // Terms
                Toggle(isOn: $viewModel.agreeToTerms) {
                    Text("이용약관 및 개인정보처리방침에 동의합니다")
                        .font(.subheadline)
                }

                // Sign Up Button
                Button {
                    Task {
                        if let user = await viewModel.signUp() {
                            appState.signIn(user: user)
                        }
                    }
                } label: {
                    HStack {
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("회원가입")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.green)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(!viewModel.isFormValid || viewModel.isLoading)
                .opacity(viewModel.isFormValid ? 1 : 0.6)
            }
            .padding(24)
        }
        .navigationTitle("회원가입")
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

// MARK: - Test User Button

struct TestUserButton: View {
    let user: TestUser
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                Text(user.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)

                Text(user.role)
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Text(user.email)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    NavigationStack {
        LoginView()
            .environmentObject(AppState())
    }
}
