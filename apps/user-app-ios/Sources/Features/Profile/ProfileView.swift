import SwiftUI

// MARK: - Profile View

struct ProfileView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = ProfileViewModel()
    @State private var showLogoutAlert = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    profileViewHeader

                    ScrollView {
                        VStack(spacing: ParkSpacing.md) {
                            // Profile Header
                            profileHeader

                            // Stats Card
                            statsCard

                            // Menu Sections
                            accountSection
                            appSection
                            supportSection
                            logoutSection
                        }
                        .padding(.horizontal, ParkSpacing.md)
                        .padding(.bottom, ParkSpacing.xxl)
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }

    // MARK: - View Header

    private var profileViewHeader: some View {
        HStack {
            Text("마이페이지")
                .font(.parkDisplaySmall)
                .foregroundStyle(.white)

            Spacer()
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.top, ParkSpacing.sm)
    }

    // MARK: - Profile Header

    private var profileHeader: some View {
        GlassCard {
            HStack(spacing: ParkSpacing.md) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.parkPrimary, Color.parkSecondary],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 80, height: 80)

                    Text(avatarInitial)
                        .font(.parkDisplaySmall)
                        .foregroundStyle(.white)
                }

                // Info
                VStack(alignment: .leading, spacing: ParkSpacing.xxs) {
                    Text(appState.currentUser?.name ?? "사용자")
                        .font(.parkHeadlineMedium)
                        .foregroundStyle(.white)

                    Text(appState.currentUser?.email ?? "")
                        .font(.parkBodySmall)
                        .foregroundStyle(.white.opacity(0.6))

                    // Membership Badge
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                        Text("일반 회원")
                            .font(.parkCaption)
                    }
                    .foregroundStyle(Color.parkAccent)
                    .padding(.horizontal, ParkSpacing.xs)
                    .padding(.vertical, 2)
                    .background(Color.parkAccent.opacity(0.2))
                    .clipShape(Capsule())
                }

                Spacer()

                NavigationLink {
                    EditProfileView()
                } label: {
                    Image(systemName: "pencil.circle.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(Color.parkPrimary)
                }
            }
        }
        .padding(.top, ParkSpacing.sm)
    }

    private var avatarInitial: String {
        let name = appState.currentUser?.name ?? "U"
        return String(name.prefix(1))
    }

    // MARK: - Stats Card

    private var statsCard: some View {
        GlassCard(padding: ParkSpacing.sm) {
            HStack(spacing: 0) {
                StatItem(
                    icon: "calendar.badge.checkmark",
                    value: "\(viewModel.stats?.totalBookings ?? 0)",
                    label: "총 라운드"
                )

                Divider()
                    .frame(height: 40)
                    .background(Color.white.opacity(0.2))

                StatItem(
                    icon: "person.2.fill",
                    value: "\(viewModel.stats?.friendCount ?? 0)",
                    label: "친구"
                )

                Divider()
                    .frame(height: 40)
                    .background(Color.white.opacity(0.2))

                StatItem(
                    icon: "trophy.fill",
                    value: "\(viewModel.stats?.achievementCount ?? 0)",
                    label: "업적"
                )
            }
        }
        .task {
            await viewModel.loadStats()
        }
    }

    // MARK: - Account Section

    private var accountSection: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                SectionHeader(title: "계정", icon: "person.crop.circle")

                ProfileMenuRow(
                    icon: "calendar",
                    iconColor: .parkPrimary,
                    title: "예약 내역"
                ) {
                    MyBookingsView()
                }

                ProfileMenuRow(
                    icon: "creditcard.fill",
                    iconColor: .parkAccent,
                    title: "결제 수단"
                ) {
                    PaymentMethodsView()
                }

                ProfileMenuRow(
                    icon: "key.fill",
                    iconColor: .parkWarning,
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
    }

    // MARK: - App Section

    private var appSection: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                SectionHeader(title: "앱 설정", icon: "gearshape")

                ProfileMenuRow(
                    icon: "bell.fill",
                    iconColor: .parkError,
                    title: "알림 설정"
                ) {
                    NotificationSettingsView()
                }
            }
        }
    }

    // MARK: - Support Section

    private var supportSection: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                SectionHeader(title: "지원", icon: "questionmark.circle")

                ProfileMenuRow(
                    icon: "megaphone.fill",
                    iconColor: .parkInfo,
                    title: "공지사항"
                ) {
                    AnnouncementsView()
                }

                ProfileMenuRow(
                    icon: "questionmark.circle.fill",
                    iconColor: .parkPrimary,
                    title: "자주 묻는 질문"
                ) {
                    FAQView()
                }

                ProfileMenuRow(
                    icon: "envelope.fill",
                    iconColor: .parkAccent,
                    title: "문의하기"
                ) {
                    ContactUsView()
                }

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

                HStack {
                    Image(systemName: "info.circle.fill")
                        .foregroundStyle(.white.opacity(0.5))
                        .frame(width: 24)

                    Text("버전")
                        .font(.parkBodyMedium)
                        .foregroundStyle(.white)

                    Spacer()

                    Text("1.0.0")
                        .font(.parkBodyMedium)
                        .foregroundStyle(.white.opacity(0.5))
                }
                .padding(.vertical, ParkSpacing.xs)
            }
        }
    }

    // MARK: - Logout Section

    private var logoutSection: some View {
        GradientButton(
            title: "로그아웃",
            style: .destructive
        ) {
            showLogoutAlert = true
        }
        .alert("로그아웃", isPresented: $showLogoutAlert) {
            Button("취소", role: .cancel) {}
            Button("로그아웃", role: .destructive) {
                appState.signOut()
            }
        } message: {
            Text("정말 로그아웃 하시겠습니까?")
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(AppState())
}
