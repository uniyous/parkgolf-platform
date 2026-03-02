import Foundation

// MARK: - Notification Type

enum NotificationType: String, Codable, Sendable {
    case bookingConfirmed = "BOOKING_CONFIRMED"
    case bookingCancelled = "BOOKING_CANCELLED"
    case refundCompleted = "REFUND_COMPLETED"
    case paymentSuccess = "PAYMENT_SUCCESS"
    case paymentFailed = "PAYMENT_FAILED"
    case friendRequest = "FRIEND_REQUEST"
    case friendAccepted = "FRIEND_ACCEPTED"
    case chatMessage = "CHAT_MESSAGE"
    case systemAlert = "SYSTEM_ALERT"
    case splitPaymentRequest = "SPLIT_PAYMENT_REQUEST"

    var icon: String {
        switch self {
        case .bookingConfirmed:
            return "checkmark.circle.fill"
        case .bookingCancelled:
            return "xmark.circle.fill"
        case .refundCompleted:
            return "arrow.uturn.backward.circle.fill"
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
        case .splitPaymentRequest:
            return "arrow.triangle.branch"
        }
    }

    var displayName: String {
        switch self {
        case .bookingConfirmed:
            return "예약 확정"
        case .bookingCancelled:
            return "예약 취소"
        case .refundCompleted:
            return "환불 완료"
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
        case .splitPaymentRequest:
            return "정산 요청"
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

    // Memberwise 이니셜라이저 (직접 생성 시 사용)
    init(
        bookingId: String? = nil,
        courseId: String? = nil,
        courseName: String? = nil,
        bookingDate: String? = nil,
        bookingTime: String? = nil,
        paymentId: String? = nil,
        amount: Int? = nil,
        failureReason: String? = nil,
        friendId: String? = nil,
        friendName: String? = nil,
        chatRoomId: String? = nil
    ) {
        self.bookingId = bookingId
        self.courseId = courseId
        self.courseName = courseName
        self.bookingDate = bookingDate
        self.bookingTime = bookingTime
        self.paymentId = paymentId
        self.amount = amount
        self.failureReason = failureReason
        self.friendId = friendId
        self.friendName = friendName
        self.chatRoomId = chatRoomId
    }

    // 백엔드에서 ID 필드가 Int 또는 String으로 올 수 있어 유연하게 처리
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // String 또는 Int를 String?으로 변환하는 헬퍼
        func decodeFlexibleString(forKey key: CodingKeys) -> String? {
            if let stringValue = try? container.decodeIfPresent(String.self, forKey: key) {
                return stringValue
            }
            if let intValue = try? container.decodeIfPresent(Int.self, forKey: key) {
                return String(intValue)
            }
            return nil
        }

        bookingId = decodeFlexibleString(forKey: .bookingId)
        courseId = decodeFlexibleString(forKey: .courseId)
        courseName = try container.decodeIfPresent(String.self, forKey: .courseName)
        bookingDate = try container.decodeIfPresent(String.self, forKey: .bookingDate)
        bookingTime = try container.decodeIfPresent(String.self, forKey: .bookingTime)
        paymentId = decodeFlexibleString(forKey: .paymentId)
        amount = try container.decodeIfPresent(Int.self, forKey: .amount)
        failureReason = try container.decodeIfPresent(String.self, forKey: .failureReason)
        friendId = decodeFlexibleString(forKey: .friendId)
        friendName = try container.decodeIfPresent(String.self, forKey: .friendName)
        chatRoomId = decodeFlexibleString(forKey: .chatRoomId)
    }
}

// MARK: - Unread Count Response

struct UnreadCountResponse: Codable, Sendable {
    let success: Bool
    let count: Int
}

// MARK: - Notifications Response
// 백엔드 응답: { success, data: [...], total, page, limit, totalPages }

struct NotificationsResponse: Codable, Sendable {
    let success: Bool
    let data: [AppNotification]
    let total: Int
    let page: Int
    let limit: Int
    let totalPages: Int
}

// Legacy wrapper for backward compatibility
struct NotificationsData: Sendable {
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
