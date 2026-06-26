package com.parkgolf.app.data.remote.dto.notification

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull

/**
 * Int 또는 String을 String?으로 변환하는 Serializer
 * 백엔드에서 ID 필드가 Int 또는 String으로 올 수 있어 유연하게 처리
 */
object FlexibleStringSerializer : KSerializer<String?> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleString", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: String?) {
        if (value != null) {
            encoder.encodeString(value)
        }
    }

    override fun deserialize(decoder: Decoder): String? {
        return try {
            val jsonDecoder = decoder as? JsonDecoder
            val element = jsonDecoder?.decodeJsonElement()
            when (element) {
                is JsonPrimitive -> {
                    element.intOrNull?.toString() ?: element.content.takeIf { it != "null" }
                }
                else -> null
            }
        } catch (e: Exception) {
            null
        }
    }
}

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
 * ID 필드들은 백엔드에서 Int 또는 String으로 올 수 있어 FlexibleStringSerializer 사용
 */
@Serializable
data class NotificationDataDto(
    @SerialName("bookingId")
    @Serializable(with = FlexibleStringSerializer::class)
    val bookingId: String? = null,

    @SerialName("courseId")
    @Serializable(with = FlexibleStringSerializer::class)
    val courseId: String? = null,

    @SerialName("courseName") val courseName: String? = null,
    @SerialName("bookingDate") val bookingDate: String? = null,
    @SerialName("bookingTime") val bookingTime: String? = null,

    @SerialName("paymentId")
    @Serializable(with = FlexibleStringSerializer::class)
    val paymentId: String? = null,

    @SerialName("amount") val amount: Int? = null,
    @SerialName("failureReason") val failureReason: String? = null,

    @SerialName("friendId")
    @Serializable(with = FlexibleStringSerializer::class)
    val friendId: String? = null,

    @SerialName("friendName") val friendName: String? = null,

    @SerialName("chatRoomId")
    @Serializable(with = FlexibleStringSerializer::class)
    val chatRoomId: String? = null
)

/**
 * Notifications Response
 * 백엔드 응답: { success, data: [...], total, page, limit, totalPages }
 */
@Serializable
data class NotificationsResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("data") val data: List<NotificationDto>,
    @SerialName("total") val total: Int,
    @SerialName("page") val page: Int,
    @SerialName("limit") val limit: Int,
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
