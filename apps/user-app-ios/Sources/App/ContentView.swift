import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        Group {
            if appState.isAuthenticated {
                MainTabView()
            } else {
                AuthenticationView()
            }
        }
        .animation(.easeInOut, value: appState.isAuthenticated)
    }
}

// MARK: - Main Tab View

struct MainTabView: View {
    @EnvironmentObject private var appState: AppState
    @State private var selectedTab: Tab = .home
    @State private var showChangePasswordSheet = false

    enum Tab: Hashable {
        case home
        case search
        case social
        case profile
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("홈", systemImage: "house.fill")
                }
                .tag(Tab.home)

            RoundBookingView()
                .tabItem {
                    Label("예약", systemImage: "magnifyingglass")
                }
                .tag(Tab.search)

            SocialView()
                .tabItem {
                    Label("소셜", systemImage: "person.2.fill")
                }
                .tag(Tab.social)

            ProfileView()
                .tabItem {
                    Label("마이", systemImage: "person.crop.circle.fill")
                }
                .tag(Tab.profile)
        }
        .tint(.parkPrimary)
        .sheet(isPresented: $appState.showPasswordChangeReminder) {
            PasswordChangeReminderSheet(
                expiryInfo: appState.passwordExpiryInfo,
                onChangeNow: {
                    appState.showPasswordChangeReminder = false
                    showChangePasswordSheet = true
                },
                onChangeLater: {
                    appState.skipPasswordReminder()
                }
            )
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showChangePasswordSheet) {
            NavigationStack {
                ChangePasswordView()
            }
        }
        .sheet(isPresented: $appState.showMyBookingsSheet) {
            NavigationStack {
                MyBookingsView()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .navigateToBookingDetail)) { notification in
            if let bookingId = notification.userInfo?["bookingId"] as? Int {
                appState.pendingBookingId = bookingId
                // 내 예약 시트 열기 (예약 상세로 이동)
                appState.showMyBookingsSheet = true
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .navigateToFriendRequests)) { _ in
            appState.pendingSocialSegment = .friends
            selectedTab = .social
        }
        .onReceive(NotificationCenter.default.publisher(for: .navigateToFriendsList)) { _ in
            appState.pendingSocialSegment = .friends
            selectedTab = .social
        }
        .onReceive(NotificationCenter.default.publisher(for: .navigateToChatRoom)) { notification in
            if let chatRoomId = notification.userInfo?["chatRoomId"] as? String {
                appState.pendingChatRoomId = chatRoomId
                appState.pendingSocialSegment = .chat
                selectedTab = .social
            }
        }
        .onChange(of: appState.navigateToTab) { _, newTab in
            if let tab = newTab {
                selectedTab = tab
                appState.navigateToTab = nil
            }
        }
        .onAppear {
            configureTabBarAppearance()
        }
    }

    private func configureTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color.gradientStart)

        // 선택된 아이템 스타일
        appearance.stackedLayoutAppearance.selected.iconColor = UIColor(Color.parkPrimary)
        appearance.stackedLayoutAppearance.selected.titleTextAttributes = [.foregroundColor: UIColor(Color.parkPrimary)]

        // 선택되지 않은 아이템 스타일
        appearance.stackedLayoutAppearance.normal.iconColor = UIColor.white.withAlphaComponent(0.6)
        appearance.stackedLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: UIColor.white.withAlphaComponent(0.6)]

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}

// MARK: - Password Change Reminder Sheet

struct PasswordChangeReminderSheet: View {
    let expiryInfo: PasswordExpiryInfo?
    let onChangeNow: () -> Void
    let onChangeLater: () -> Void

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            VStack(spacing: ParkSpacing.lg) {
                // 아이콘
                ZStack {
                    Circle()
                        .fill(Color.parkWarning.opacity(0.2))
                        .frame(width: 100, height: 100)

                    Image(systemName: "lock.trianglebadge.exclamationmark")
                        .font(.system(size: 50))
                        .foregroundStyle(Color.parkWarning)
                }
                .padding(.top, ParkSpacing.lg)

                // 제목
                Text("보안 알림")
                    .font(.parkDisplaySmall)
                    .foregroundStyle(.white)

                // 설명
                VStack(spacing: ParkSpacing.sm) {
                    if let info = expiryInfo {
                        Text(info.message)
                            .font(.parkBodyMedium)
                            .foregroundStyle(.white.opacity(0.8))
                            .multilineTextAlignment(.center)
                    }

                    Text("보안을 위해 비밀번호를 변경해 주세요.")
                        .font(.parkBodyMedium)
                        .foregroundStyle(.white.opacity(0.8))
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, ParkSpacing.lg)

                Spacer()

                // 버튼
                VStack(spacing: ParkSpacing.sm) {
                    GradientButton(title: "지금 변경하기") {
                        onChangeNow()
                    }

                    Button {
                        onChangeLater()
                    } label: {
                        Text("다음에 변경하기")
                            .font(.parkBodyMedium)
                            .foregroundStyle(.white.opacity(0.6))
                    }
                }
                .padding(.horizontal, ParkSpacing.md)
                .padding(.bottom, ParkSpacing.lg)
            }
        }
    }
}

// MARK: - Authentication View

struct AuthenticationView: View {
    var body: some View {
        NavigationStack {
            LoginView()
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
