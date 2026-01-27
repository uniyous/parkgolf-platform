import Foundation

// MARK: - Notification Type

enum NotificationType: String, Codable, Sendable {
    case bookingConfirmed = "BOOKING_CONFIRMED"
    case bookingCancelled = "BOOKING_CANCELLED"
    case paymentSuccess = "PAYMENT_SUCCESS"
    case paymentFailed = "PAYMENT_FAILED"
    case friendRequest = "FRIEND_REQUEST"
    case friendAccepted = "FRIEND_ACCEPTED"
    case chatMessage = "CHAT_MESSAGE"
    case systemAlert = "SYSTEM_ALERT"

    var icon: String {
        switch self {
        case .bookingConfirmed:
            return "checkmark.circle.fill"
        case .bookingCancelled:
            return "xmark.circle.fill"
        case .paymentSuccess:
            return "creditcard.fill"
        case .paymentFailed:
            return "exclamationmark.triangle.fill"
        case .friendRequest:
            return "person.badge.plus.fill"
        case .friendAccepted:
            return "person.2.fill"
        case .chatMessage:
            return "bubble.left.fill"
        case .systemAlert:
            return "bell.badge.fill"
        }
    }

    var displayName: String {
        switch self {
        case .bookingConfirmed:
            return "예약 확정"
        case .bookingCancelled:
            return "예약 취소"
        case .paymentSuccess:
            return "결제 완료"
        case .paymentFailed:
            return "결제 실패"
        case .friendRequest:
            return "친구 요청"
        case .friendAccepted:
            return "친구 수락"
        case .chatMessage:
            return "새 메시지"
        case .systemAlert:
            return "시스템 알림"
        }
    }
}

// MARK: - Notification Status

enum NotificationStatus: String, Codable, Sendable {
    case pending = "PENDING"
    case sent = "SENT"
    case failed = "FAILED"
    case read = "READ"
}

// MARK: - Notification Model

struct AppNotification: Identifiable, Codable, Sendable {
    let id: Int
    let userId: String
    let type: NotificationType
    let title: String
    let message: String
    let data: NotificationData?
    let status: NotificationStatus
    let readAt: Date?
    let createdAt: Date
    let updatedAt: Date

    var isRead: Bool {
        readAt != nil || status == .read
    }
}

// MARK: - Notification Data

struct NotificationData: Codable, Sendable {
    let bookingId: String?
    let courseId: String?
    let courseName: String?
    let bookingDate: String?
    let bookingTime: String?
    let paymentId: String?
    let amount: Int?
    let failureReason: String?
    let friendId: String?
    let friendName: String?
    let chatRoomId: String?

    enum CodingKeys: String, CodingKey {
        case bookingId
        case courseId
        case courseName
        case bookingDate
        case bookingTime
        case paymentId
        case amount
        case failureReason
        case friendId
        case friendName
        case chatRoomId
    }
}

// MARK: - Unread Count Response

struct UnreadCountResponse: Codable, Sendable {
    let success: Bool
    let count: Int
}

// MARK: - Notifications Response

struct NotificationsResponse: Codable, Sendable {
    let success: Bool
    let data: NotificationsData
}

struct NotificationsData: Codable, Sendable {
    let notifications: [AppNotification]
    let total: Int
    let page: Int
    let totalPages: Int
}

// MARK: - Mark As Read Response

struct MarkAsReadResponse: Codable, Sendable {
    let success: Bool
    let data: AppNotification?
}

// MARK: - Mark All As Read Response

struct MarkAllAsReadResponse: Codable, Sendable {
    let success: Bool
    let data: MarkAllAsReadData?
}

struct MarkAllAsReadData: Codable, Sendable {
    let count: Int
}
