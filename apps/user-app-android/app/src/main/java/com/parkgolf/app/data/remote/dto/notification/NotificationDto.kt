package com.parkgolf.app.data.remote.dto.notification

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Notification DTO
 */
@Serializable
data class NotificationDto(
    @SerialName("id") val id: Int,
    @SerialName("userId") val userId: String,
    @SerialName("type") val type: String,
    @SerialName("title") val title: String,
    @SerialName("message") val message: String,
    @SerialName("data") val data: NotificationDataDto? = null,
    @SerialName("status") val status: String,
    @SerialName("readAt") val readAt: String? = null,
    @SerialName("createdAt") val createdAt: String,
    @SerialName("updatedAt") val updatedAt: String
)

/**
 * Notification Data DTO
 */
@Serializable
data class NotificationDataDto(
    @SerialName("bookingId") val bookingId: String? = null,
    @SerialName("courseId") val courseId: String? = null,
    @SerialName("courseName") val courseName: String? = null,
    @SerialName("bookingDate") val bookingDate: String? = null,
    @SerialName("bookingTime") val bookingTime: String? = null,
    @SerialName("paymentId") val paymentId: String? = null,
    @SerialName("amount") val amount: Int? = null,
    @SerialName("failureReason") val failureReason: String? = null,
    @SerialName("friendId") val friendId: String? = null,
    @SerialName("friendName") val friendName: String? = null,
    @SerialName("chatRoomId") val chatRoomId: String? = null
)

/**
 * Notifications Response
 */
@Serializable
data class NotificationsResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("data") val data: NotificationsData
)

@Serializable
data class NotificationsData(
    @SerialName("notifications") val notifications: List<NotificationDto>,
    @SerialName("total") val total: Int,
    @SerialName("page") val page: Int,
    @SerialName("totalPages") val totalPages: Int
)

/**
 * Unread Count Response
 */
@Serializable
data class UnreadCountResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("count") val count: Int
)

/**
 * Mark As Read Response
 */
@Serializable
data class MarkAsReadResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("data") val data: NotificationDto? = null
)

/**
 * Mark All As Read Response
 */
@Serializable
data class MarkAllAsReadResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("data") val data: MarkAllAsReadData? = null
)

@Serializable
data class MarkAllAsReadData(
    @SerialName("count") val count: Int
)

/**
 * Delete Notification Response
 */
@Serializable
data class DeleteNotificationResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("message") val message: String? = null
)
