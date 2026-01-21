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

            NavigationStack {
                ChatListView()
            }
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
