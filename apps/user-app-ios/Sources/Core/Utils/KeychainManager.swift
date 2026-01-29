import Foundation
import KeychainAccess

// MARK: - Keychain Manager

final class KeychainManager: @unchecked Sendable {
    static let shared = KeychainManager()

    private let keychain: Keychain

    private enum Keys {
        static let accessToken = "com.parkgolf.accessToken"
        static let refreshToken = "com.parkgolf.refreshToken"
    }

    private init() {
        self.keychain = Keychain(service: "com.parkgolf.app")
            .accessibility(.afterFirstUnlock)
    }

    // MARK: - Access Token

    var accessToken: String? {
        try? keychain.get(Keys.accessToken)
    }

    func setAccessToken(_ token: String) throws {
        try keychain.set(token, key: Keys.accessToken)
    }

    // MARK: - Refresh Token

    var refreshToken: String? {
        try? keychain.get(Keys.refreshToken)
    }

    func setRefreshToken(_ token: String) throws {
        try keychain.set(token, key: Keys.refreshToken)
    }

    // MARK: - Bulk Operations

    func saveTokens(accessToken: String, refreshToken: String) throws {
        try setAccessToken(accessToken)
        try setRefreshToken(refreshToken)
    }

    func clearAll() {
        try? keychain.remove(Keys.accessToken)
        try? keychain.remove(Keys.refreshToken)
    }
}
