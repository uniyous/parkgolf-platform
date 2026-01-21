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
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Text("마이페이지")
                        .font(.parkHeadlineMedium)
                        .foregroundStyle(.white)
                }

                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .foregroundStyle(.white)
                    }
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
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
                    icon: "person.2.fill",
                    iconColor: .parkInfo,
                    title: "친구 관리"
                ) {
                    FriendsView()
                }

                ProfileMenuRow(
                    icon: "creditcard.fill",
                    iconColor: .parkAccent,
                    title: "결제 수단"
                ) {
                    PaymentMethodsView()
                }

                ProfileMenuRow(
                    icon: "trophy.fill",
                    iconColor: .parkWarning,
                    title: "내 통계"
                ) {
                    MyStatsView()
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

                ProfileMenuRow(
                    icon: "moon.fill",
                    iconColor: .purple,
                    title: "테마"
                ) {
                    ThemeSettingsView()
                }

                ProfileMenuRow(
                    icon: "globe",
                    iconColor: .parkSuccess,
                    title: "언어"
                ) {
                    LanguageSettingsView()
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

// MARK: - Stat Item

struct StatItem: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: ParkSpacing.xxs) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(Color.parkPrimary)

            Text(value)
                .font(.parkHeadlineMedium)
                .foregroundStyle(.white)

            Text(label)
                .font(.parkCaption)
                .foregroundStyle(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Section Header

struct SectionHeader: View {
    let title: String
    let icon: String

    var body: some View {
        HStack(spacing: ParkSpacing.xs) {
            Image(systemName: icon)
                .foregroundStyle(Color.parkPrimary)
            Text(title)
                .font(.parkHeadlineSmall)
                .foregroundStyle(.white)
        }
        .padding(.bottom, ParkSpacing.xxs)
    }
}

// MARK: - Profile Menu Row

struct ProfileMenuRow<Destination: View>: View {
    let icon: String
    let iconColor: Color
    let title: String
    @ViewBuilder let destination: () -> Destination

    var body: some View {
        NavigationLink {
            destination()
        } label: {
            HStack(spacing: ParkSpacing.sm) {
                Image(systemName: icon)
                    .foregroundStyle(iconColor)
                    .frame(width: 24)

                Text(title)
                    .font(.parkBodyMedium)
                    .foregroundStyle(.white)

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.3))
            }
            .padding(.vertical, ParkSpacing.xs)
        }
    }
}

// MARK: - Edit Profile View

struct EditProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @State private var name = ""
    @State private var phoneNumber = ""
    @State private var isSaving = false

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: ParkSpacing.lg) {
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
                            .frame(width: 100, height: 100)

                        Text(String(name.prefix(1)))
                            .font(.parkDisplayMedium)
                            .foregroundStyle(.white)

                        // Edit Badge
                        Circle()
                            .fill(Color.parkPrimary)
                            .frame(width: 32, height: 32)
                            .overlay(
                                Image(systemName: "camera.fill")
                                    .font(.system(size: 14))
                                    .foregroundStyle(.white)
                            )
                            .offset(x: 35, y: 35)
                    }
                    .padding(.top, ParkSpacing.lg)

                    // Form
                    GlassCard {
                        VStack(spacing: ParkSpacing.md) {
                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("이름")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                GlassTextField(
                                    placeholder: "이름을 입력하세요",
                                    text: $name,
                                    icon: "person"
                                )
                            }

                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("이메일")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                HStack(spacing: ParkSpacing.sm) {
                                    Image(systemName: "envelope")
                                        .foregroundStyle(.white.opacity(0.3))
                                        .frame(width: 20)

                                    Text(appState.currentUser?.email ?? "")
                                        .font(.parkBodyMedium)
                                        .foregroundStyle(.white.opacity(0.5))

                                    Spacer()
                                }
                                .padding(.horizontal, ParkSpacing.md)
                                .padding(.vertical, ParkSpacing.sm)
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))
                            }

                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                Text("휴대폰 번호")
                                    .font(.parkLabelMedium)
                                    .foregroundStyle(.white.opacity(0.8))

                                GlassTextField(
                                    placeholder: "010-0000-0000",
                                    text: $phoneNumber,
                                    icon: "phone"
                                )
                                .keyboardType(.phonePad)
                            }
                        }
                    }

                    GradientButton(
                        title: "저장하기",
                        isLoading: isSaving
                    ) {
                        // Save profile
                    }

                    Spacer()
                }
                .padding(.horizontal, ParkSpacing.md)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("프로필 수정")
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
        .onAppear {
            name = appState.currentUser?.name ?? ""
            phoneNumber = appState.currentUser?.phoneNumber ?? ""
        }
    }
}

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

// MARK: - Notification Settings View

struct NotificationSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var bookingNotification = true
    @State private var chatNotification = true
    @State private var friendNotification = true
    @State private var marketingNotification = false

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: ParkSpacing.md) {
                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            SectionHeader(title: "서비스 알림", icon: "bell.fill")

                            NotificationToggleRow(
                                icon: "calendar.badge.clock",
                                iconColor: .parkPrimary,
                                title: "예약 알림",
                                description: "예약 확정, 취소, 리마인더",
                                isOn: $bookingNotification
                            )

                            NotificationToggleRow(
                                icon: "bubble.left.and.bubble.right.fill",
                                iconColor: .parkInfo,
                                title: "채팅 알림",
                                description: "새 메시지 알림",
                                isOn: $chatNotification
                            )

                            NotificationToggleRow(
                                icon: "person.2.fill",
                                iconColor: .parkAccent,
                                title: "친구 알림",
                                description: "친구 요청, 수락 알림",
                                isOn: $friendNotification
                            )
                        }
                    }

                    GlassCard {
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            SectionHeader(title: "마케팅", icon: "megaphone.fill")

                            NotificationToggleRow(
                                icon: "tag.fill",
                                iconColor: .parkWarning,
                                title: "마케팅 알림",
                                description: "이벤트, 프로모션 정보",
                                isOn: $marketingNotification
                            )
                        }
                    }
                }
                .padding(.horizontal, ParkSpacing.md)
                .padding(.top, ParkSpacing.sm)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("알림 설정")
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

// MARK: - Notification Toggle Row

struct NotificationToggleRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let description: String
    @Binding var isOn: Bool

    var body: some View {
        HStack(spacing: ParkSpacing.sm) {
            Image(systemName: icon)
                .foregroundStyle(iconColor)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.parkBodyMedium)
                    .foregroundStyle(.white)

                Text(description)
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.5))
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .tint(.parkPrimary)
                .labelsHidden()
        }
        .padding(.vertical, ParkSpacing.xxs)
    }
}

// MARK: - Placeholder Views

struct PaymentMethodsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "creditcard.fill",
                title: "결제 수단",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("결제 수단")
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

struct MyStatsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "chart.bar.fill",
                title: "내 통계",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("내 통계")
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

struct ThemeSettingsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "moon.fill",
                title: "테마 설정",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("테마")
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

struct LanguageSettingsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "globe",
                title: "언어 설정",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("언어")
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

struct AnnouncementsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "megaphone.fill",
                title: "공지사항",
                description: "새로운 공지사항이 없습니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("공지사항")
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

struct FAQView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "questionmark.circle.fill",
                title: "자주 묻는 질문",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("자주 묻는 질문")
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

struct ContactUsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            ParkEmptyStateView(
                icon: "envelope.fill",
                title: "문의하기",
                description: "준비중입니다"
            )
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("문의하기")
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
    ProfileView()
        .environmentObject(AppState())
}
