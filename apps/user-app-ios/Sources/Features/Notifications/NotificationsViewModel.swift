import Foundation

// MARK: - Notifications ViewModel

@MainActor
final class NotificationsViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var notifications: [AppNotification] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var error: String?
    @Published var unreadCount = 0

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
            let data = try await notificationService.getNotifications(page: 1)
            notifications = data.notifications
            totalPages = data.totalPages
            currentPage = 1

            // Update unread count
            unreadCount = notifications.filter { !$0.isRead }.count
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
                var updatedNotification = notifications[index]
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
                unreadCount = max(0, unreadCount - 1)
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
            unreadCount = 0
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteNotification(_ notification: AppNotification) async {
        do {
            try await notificationService.deleteNotification(notificationId: notification.id)

            // Update local state
            if !notification.isRead {
                unreadCount = max(0, unreadCount - 1)
            }
            notifications.removeAll { $0.id == notification.id }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func refreshUnreadCount() async {
        do {
            unreadCount = try await notificationService.getUnreadCount()
        } catch {
            // Silently fail for unread count refresh
        }
    }
}
