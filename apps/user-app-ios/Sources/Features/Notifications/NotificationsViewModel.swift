import Foundation

// MARK: - Notification Filter

enum NotificationFilter: String, CaseIterable, Identifiable {
    case all = "전체"
    case booking = "예약"
    case social = "소셜"
    case system = "시스템"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .all: return "bell.fill"
        case .booking: return "calendar"
        case .social: return "person.2.fill"
        case .system: return "shield.fill"
        }
    }

    var types: [NotificationType]? {
        switch self {
        case .all:
            return nil
        case .booking:
            return [.bookingConfirmed, .bookingCancelled, .paymentSuccess, .paymentFailed]
        case .social:
            return [.friendRequest, .friendAccepted, .chatMessage]
        case .system:
            return [.systemAlert]
        }
    }

    func matches(_ type: NotificationType) -> Bool {
        guard let types = types else { return true }
        return types.contains(type)
    }
}

// MARK: - Notifications ViewModel

@MainActor
final class NotificationsViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var notifications: [AppNotification] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var error: String?
    @Published var selectedFilter: NotificationFilter = .all

    // MARK: - Computed Properties

    var filteredNotifications: [AppNotification] {
        guard let types = selectedFilter.types else {
            return notifications
        }
        return notifications.filter { types.contains($0.type) }
    }

    var unreadCount: Int {
        notifications.filter { !$0.isRead }.count
    }

    var unreadCounts: [NotificationFilter: Int] {
        var counts: [NotificationFilter: Int] = [:]
        for filter in NotificationFilter.allCases {
            if let types = filter.types {
                counts[filter] = notifications.filter { !$0.isRead && types.contains($0.type) }.count
            } else {
                counts[filter] = notifications.filter { !$0.isRead }.count
            }
        }
        return counts
    }

    func emptyMessage(for filter: NotificationFilter) -> (title: String, description: String) {
        switch filter {
        case .all:
            return ("알림이 없습니다", "새로운 알림이 도착하면 여기에 표시됩니다")
        case .booking:
            return ("예약 알림이 없습니다", "예약 관련 알림이 도착하면 여기에 표시됩니다")
        case .social:
            return ("소셜 알림이 없습니다", "친구 요청이나 채팅 알림이 도착하면 여기에 표시됩니다")
        case .system:
            return ("시스템 알림이 없습니다", "시스템 공지사항이 도착하면 여기에 표시됩니다")
        }
    }

    // MARK: - Pagination

    private var currentPage = 1
    private var totalPages = 1
    private var hasMorePages: Bool { currentPage < totalPages }

    // MARK: - Dependencies

    private let notificationService = NotificationService()

    // MARK: - Public Methods

    func loadNotifications() async {
        guard !isLoading else { return }

        isLoading = true
        error = nil
        currentPage = 1

        do {
            let data = try await notificationService.getNotifications(page: 1, limit: 50)
            notifications = data.notifications
            totalPages = data.totalPages
            currentPage = 1
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func loadMoreNotifications() async {
        guard !isLoadingMore, hasMorePages else { return }

        isLoadingMore = true
        let nextPage = currentPage + 1

        do {
            let data = try await notificationService.getNotifications(page: nextPage)
            notifications.append(contentsOf: data.notifications)
            totalPages = data.totalPages
            currentPage = nextPage
        } catch {
            self.error = error.localizedDescription
        }

        isLoadingMore = false
    }

    func markAsRead(_ notification: AppNotification) async {
        guard !notification.isRead else { return }

        do {
            _ = try await notificationService.markAsRead(notificationId: notification.id)

            // Update local state
            if let index = notifications.firstIndex(where: { $0.id == notification.id }) {
                let updatedNotification = notifications[index]
                // Create a new notification with updated readAt
                notifications[index] = AppNotification(
                    id: updatedNotification.id,
                    userId: updatedNotification.userId,
                    type: updatedNotification.type,
                    title: updatedNotification.title,
                    message: updatedNotification.message,
                    data: updatedNotification.data,
                    status: .read,
                    readAt: Date(),
                    createdAt: updatedNotification.createdAt,
                    updatedAt: Date()
                )
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func markAllAsRead() async {
        do {
            _ = try await notificationService.markAllAsRead()

            // Update local state
            notifications = notifications.map { notification in
                if !notification.isRead {
                    return AppNotification(
                        id: notification.id,
                        userId: notification.userId,
                        type: notification.type,
                        title: notification.title,
                        message: notification.message,
                        data: notification.data,
                        status: .read,
                        readAt: Date(),
                        createdAt: notification.createdAt,
                        updatedAt: Date()
                    )
                }
                return notification
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteNotification(_ notification: AppNotification) async {
        do {
            try await notificationService.deleteNotification(notificationId: notification.id)

            // Update local state
            notifications.removeAll { $0.id == notification.id }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func refreshUnreadCount() async {
        do {
            _ = try await notificationService.getUnreadCount()
        } catch {
            // Silently fail for unread count refresh
        }
    }
}
