import Foundation

// MARK: - Notification Settings

struct NotificationSettings: Codable, Sendable {
    var booking: Bool
    var chat: Bool
    var friend: Bool
    var marketing: Bool

    static let `default` = NotificationSettings(
        booking: true,
        chat: true,
        friend: true,
        marketing: false
    )
}

// MARK: - Settings Service

actor SettingsService {
    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Get Notification Settings

    func getNotificationSettings() async throws -> NotificationSettings {
        let endpoint = Endpoint(
            path: "/api/user/settings/notifications",
            method: .get
        )
        return try await apiClient.request(endpoint, responseType: NotificationSettings.self)
    }

    // MARK: - Update Notification Settings

    func updateNotificationSettings(_ settings: NotificationSettings) async throws -> NotificationSettings {
        let endpoint = Endpoint(
            path: "/api/user/settings/notifications",
            method: .put,
            body: settings
        )
        return try await apiClient.request(endpoint, responseType: NotificationSettings.self)
    }

    // MARK: - Update Single Setting

    func updateBookingNotification(_ enabled: Bool) async throws -> NotificationSettings {
        struct UpdateRequest: Codable {
            let booking: Bool
        }
        let endpoint = Endpoint(
            path: "/api/user/settings/notifications",
            method: .put,
            body: UpdateRequest(booking: enabled)
        )
        return try await apiClient.request(endpoint, responseType: NotificationSettings.self)
    }

    func updateChatNotification(_ enabled: Bool) async throws -> NotificationSettings {
        struct UpdateRequest: Codable {
            let chat: Bool
        }
        let endpoint = Endpoint(
            path: "/api/user/settings/notifications",
            method: .put,
            body: UpdateRequest(chat: enabled)
        )
        return try await apiClient.request(endpoint, responseType: NotificationSettings.self)
    }

    func updateFriendNotification(_ enabled: Bool) async throws -> NotificationSettings {
        struct UpdateRequest: Codable {
            let friend: Bool
        }
        let endpoint = Endpoint(
            path: "/api/user/settings/notifications",
            method: .put,
            body: UpdateRequest(friend: enabled)
        )
        return try await apiClient.request(endpoint, responseType: NotificationSettings.self)
    }

    func updateMarketingNotification(_ enabled: Bool) async throws -> NotificationSettings {
        struct UpdateRequest: Codable {
            let marketing: Bool
        }
        let endpoint = Endpoint(
            path: "/api/user/settings/notifications",
            method: .put,
            body: UpdateRequest(marketing: enabled)
        )
        return try await apiClient.request(endpoint, responseType: NotificationSettings.self)
    }
}
