import SwiftUI

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

#Preview {
    NavigationStack {
        ForgotPasswordView()
    }
}
