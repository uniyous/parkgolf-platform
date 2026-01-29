import Foundation

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var error: Error?
    @Published var stats: UserStats?
    @Published var isLoadingStats = false

    private let apiClient = APIClient.shared

    func loadProfile() async -> User? {
        isLoading = true
        defer { isLoading = false }

        do {
            let user = try await apiClient.request(
                AuthEndpoints.me(),
                responseType: User.self
            )
            return user
        } catch {
            self.error = error
            #if DEBUG
            print("Failed to load profile: \(error)")
            #endif
            return nil
        }
    }

    func loadStats() async {
        isLoadingStats = true
        defer { isLoadingStats = false }

        do {
            stats = try await apiClient.request(
                AuthEndpoints.stats(),
                responseType: UserStats.self
            )
        } catch {
            #if DEBUG
            print("Failed to load stats: \(error)")
            #endif
        }
    }

    func updateProfile(name: String, phoneNumber: String?) async -> Bool {
        isLoading = true
        defer { isLoading = false }

        // TODO: Implement profile update endpoint
        return false
    }

    func logout() async -> Bool {
        do {
            _ = try await apiClient.request(
                AuthEndpoints.logout(),
                responseType: EmptyResponse.self
            )

            // Clear tokens from memory and Keychain
            await APIClient.shared.clearTokens()

            return true
        } catch {
            // Clear tokens even if server logout fails
            await APIClient.shared.clearTokens()

            self.error = error
            #if DEBUG
            print("Failed to logout: \(error)")
            #endif
            return false
        }
    }
}

struct EmptyResponse: Codable {}
