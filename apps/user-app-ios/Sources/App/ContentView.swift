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
    @State private var selectedTab: Tab = .home

    enum Tab: Hashable {
        case home
        case search
        case friends
        case chat
        case profile
    }

    init() {
        // TabBar 스타일 설정
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

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("홈", systemImage: "house.fill")
                }
                .tag(Tab.home)

            GameSearchView()
                .tabItem {
                    Label("예약", systemImage: "magnifyingglass")
                }
                .tag(Tab.search)

            FriendsView()
                .tabItem {
                    Label("친구", systemImage: "person.2.fill")
                }
                .tag(Tab.friends)

            ChatListView()
                .tabItem {
                    Label("채팅", systemImage: "bubble.left.and.bubble.right.fill")
                }
                .tag(Tab.chat)

            ProfileView()
                .tabItem {
                    Label("마이", systemImage: "person.crop.circle.fill")
                }
                .tag(Tab.profile)
        }
        .tint(.parkPrimary)
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
