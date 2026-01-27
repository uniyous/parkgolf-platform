package com.parkgolf.app.data.remote.dto.notification

import com.google.gson.annotations.SerializedName

/**
 * Notification DTO
 */
data class NotificationDto(
    @SerializedName("id") val id: Int,
    @SerializedName("userId") val userId: String,
    @SerializedName("type") val type: String,
    @SerializedName("title") val title: String,
    @SerializedName("message") val message: String,
    @SerializedName("data") val data: NotificationDataDto? = null,
    @SerializedName("status") val status: String,
    @SerializedName("readAt") val readAt: String? = null,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

/**
 * Notification Data DTO
 */
data class NotificationDataDto(
    @SerializedName("bookingId") val bookingId: String? = null,
    @SerializedName("courseId") val courseId: String? = null,
    @SerializedName("courseName") val courseName: String? = null,
    @SerializedName("bookingDate") val bookingDate: String? = null,
    @SerializedName("bookingTime") val bookingTime: String? = null,
    @SerializedName("paymentId") val paymentId: String? = null,
    @SerializedName("amount") val amount: Int? = null,
    @SerializedName("failureReason") val failureReason: String? = null,
    @SerializedName("friendId") val friendId: String? = null,
    @SerializedName("friendName") val friendName: String? = null,
    @SerializedName("chatRoomId") val chatRoomId: String? = null
)

/**
 * Notifications Response
 */
data class NotificationsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: NotificationsData
)

data class NotificationsData(
    @SerializedName("notifications") val notifications: List<NotificationDto>,
    @SerializedName("total") val total: Int,
    @SerializedName("page") val page: Int,
    @SerializedName("totalPages") val totalPages: Int
)

/**
 * Unread Count Response
 */
data class UnreadCountResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("count") val count: Int
)

/**
 * Mark As Read Response
 */
data class MarkAsReadResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: NotificationDto? = null
)

/**
 * Mark All As Read Response
 */
data class MarkAllAsReadResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: MarkAllAsReadData? = null
)

data class MarkAllAsReadData(
    @SerializedName("count") val count: Int
)

/**
 * Delete Notification Response
 */
data class DeleteNotificationResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String? = null
)
