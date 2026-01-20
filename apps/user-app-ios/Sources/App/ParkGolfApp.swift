import SwiftUI

@main
struct ParkGolfApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

// MARK: - App State

@MainActor
final class AppState: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var currentUser: User?

    init() {
        checkAuthenticationStatus()
    }

    private func checkAuthenticationStatus() {
        // TODO: Check keychain for stored token
    }

    func signIn(user: User) {
        currentUser = user
        isAuthenticated = true
    }

    func signOut() {
        currentUser = nil
        isAuthenticated = false
    }
}
