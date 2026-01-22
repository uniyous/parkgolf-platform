import SwiftUI

// MARK: - Settings View

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: ParkSpacing.md) {
                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            SectionHeader(title: "개인정보", icon: "lock.shield")

                            ProfileMenuRow(
                                icon: "key.fill",
                                iconColor: .parkAccent,
                                title: "비밀번호 변경"
                            ) {
                                ChangePasswordView()
                            }

                            ProfileMenuRow(
                                icon: "trash.fill",
                                iconColor: .parkError,
                                title: "계정 삭제"
                            ) {
                                DeleteAccountView()
                            }
                        }
                    }

                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            SectionHeader(title: "약관 및 정책", icon: "doc.text")

                            ProfileMenuRow(
                                icon: "doc.plaintext",
                                iconColor: .parkInfo,
                                title: "이용약관"
                            ) {
                                TermsView()
                            }

                            ProfileMenuRow(
                                icon: "hand.raised.fill",
                                iconColor: .parkWarning,
                                title: "개인정보처리방침"
                            ) {
                                PrivacyPolicyView()
                            }
                        }
                    }
                }
                .padding(.horizontal, ParkSpacing.md)
                .padding(.top, ParkSpacing.sm)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("설정")
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

// MARK: - Change Password View

struct ChangePasswordView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "key.fill",
                title: "비밀번호 변경",
                description: "준비중입니다"
            )
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
        SettingsView()
    }
}
