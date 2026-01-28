package com.parkgolf.app.domain.model

import java.time.LocalDateTime

/**
 * Notification Type
 */
enum class NotificationType {
    BOOKING_CONFIRMED,
    BOOKING_CANCELLED,
    PAYMENT_SUCCESS,
    PAYMENT_FAILED,
    FRIEND_REQUEST,
    FRIEND_ACCEPTED,
    CHAT_MESSAGE,
    SYSTEM_ALERT;

    val displayName: String
        get() = when (this) {
            BOOKING_CONFIRMED -> "예약 확정"
            BOOKING_CANCELLED -> "예약 취소"
            PAYMENT_SUCCESS -> "결제 완료"
            PAYMENT_FAILED -> "결제 실패"
            FRIEND_REQUEST -> "친구 요청"
            FRIEND_ACCEPTED -> "친구 수락"
            CHAT_MESSAGE -> "새 메시지"
            SYSTEM_ALERT -> "시스템 알림"
        }

    val iconName: String
        get() = when (this) {
            BOOKING_CONFIRMED -> "check_circle"
            BOOKING_CANCELLED -> "cancel"
            PAYMENT_SUCCESS -> "credit_card"
            PAYMENT_FAILED -> "error"
            FRIEND_REQUEST -> "person_add"
            FRIEND_ACCEPTED -> "people"
            CHAT_MESSAGE -> "chat"
            SYSTEM_ALERT -> "notifications"
        }
}

/**
 * Notification Status
 */
enum class NotificationStatus {
    PENDING,
    SENT,
    FAILED,
    READ
}

/**
 * Notification Data
 */
data class NotificationData(
    val bookingId: String? = null,
    val courseId: String? = null,
    val courseName: String? = null,
    val bookingDate: String? = null,
    val bookingTime: String? = null,
    val paymentId: String? = null,
    val amount: Int? = null,
    val failureReason: String? = null,
    val friendId: String? = null,
    val friendName: String? = null,
    val chatRoomId: String? = null
)

/**
 * App Notification
 */
data class AppNotification(
    val id: Int,
    val userId: String,
    val type: NotificationType,
    val title: String,
    val message: String,
    val data: NotificationData? = null,
    val status: NotificationStatus,
    val readAt: LocalDateTime? = null,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
) {
    val isRead: Boolean
        get() = readAt != null || status == NotificationStatus.READ
}
