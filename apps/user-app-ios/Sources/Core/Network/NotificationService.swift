import Foundation

// MARK: - Notification Service

actor NotificationService {
    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Get Notifications

    func getNotifications(
        page: Int = 1,
        limit: Int = 20,
        type: NotificationType? = nil,
        unreadOnly: Bool = false
    ) async throws -> NotificationsData {
        let endpoint = NotificationEndpoints.list(
            page: page,
            limit: limit,
            type: type,
            unreadOnly: unreadOnly
        )
        print("[NotificationService] Fetching notifications: page=\(page), limit=\(limit)")
        do {
            let response = try await apiClient.requestDirect(
                endpoint,
                responseType: NotificationsResponse.self
            )
            print("[NotificationService] Response: success=\(response.success), count=\(response.data.count), total=\(response.total)")
            // 백엔드 응답을 NotificationsData로 변환
            return NotificationsData(
                notifications: response.data,
                total: response.total,
                page: response.page,
                totalPages: response.totalPages
            )
        } catch {
            print("[NotificationService] Error: \(error)")
            throw error
        }
    }

    // MARK: - Get Unread Count

    func getUnreadCount() async throws -> Int {
        let endpoint = NotificationEndpoints.unreadCount()
        let response = try await apiClient.requestDirect(
            endpoint,
            responseType: UnreadCountResponse.self
        )
        return response.count
    }

    // MARK: - Mark As Read

    func markAsRead(notificationId: Int) async throws -> AppNotification? {
        let endpoint = NotificationEndpoints.markAsRead(id: notificationId)
        let response = try await apiClient.requestDirect(
            endpoint,
            responseType: MarkAsReadResponse.self
        )
        return response.data
    }

    // MARK: - Mark All As Read

    func markAllAsRead() async throws -> Int {
        let endpoint = NotificationEndpoints.markAllAsRead()
        let response = try await apiClient.requestDirect(
            endpoint,
            responseType: MarkAllAsReadResponse.self
        )
        return response.data?.count ?? 0
    }

    // MARK: - Delete Notification

    func deleteNotification(notificationId: Int) async throws {
        let endpoint = NotificationEndpoints.delete(id: notificationId)
        _ = try await apiClient.requestDirect(
            endpoint,
            responseType: APIResponse<EmptyData>.self
        )
    }
}

// MARK: - Empty Data for void responses

struct EmptyData: Codable, Sendable {}
