package com.parkgolf.app.data.remote.dto.chat

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ChatRoomDto(
    val id: String,
    val name: String? = null,
    val type: String, // DIRECT, GROUP, BOOKING
    // API returns 'members', but we also support 'participants' for compatibility
    val members: List<ChatRoomMemberDto>? = null,
    val participants: List<ChatParticipantDto>? = null,
    val lastMessage: ChatMessageDto? = null,
    val unreadCount: Int = 0,
    val createdAt: String,
    val updatedAt: String
)

// API returns 'members' with this structure
@Serializable
data class ChatRoomMemberDto(
    val id: String,
    val roomId: String? = null,
    val userId: Int,
    val userName: String,
    val userEmail: String? = null,
    val joinedAt: String,
    val leftAt: String? = null,
    val isAdmin: Boolean = false,
    val lastReadMessageId: String? = null,
    val lastReadAt: String? = null
)

@Serializable
data class ChatParticipantDto(
    val id: String,
    @SerialName("userId")
    val oduserId: String? = null,
    val userName: String,
    val userEmail: String? = null,
    val profileImageUrl: String? = null,
    val joinedAt: String
)

@Serializable
data class ChatMessageDto(
    val id: String,
    val roomId: String,
    val senderId: Int, // API returns Int
    val senderName: String,
    val content: String,
    // API may return 'type' or 'messageType'
    val messageType: String? = null,
    val type: String? = null, // Fallback field for API compatibility
    val metadata: String? = null,
    val createdAt: String,
    val readBy: List<String>? = null
) {
    // Get the actual message type from either field
    fun getMessageTypeValue(): String = messageType ?: type ?: "TEXT"
}

@Serializable
data class CreateChatRoomRequest(
    val name: String,
    val type: String,
    @SerialName("participant_ids")
    val participantIds: List<String>
)

@Serializable
data class SendMessageRequest(
    val content: String,
    @SerialName("message_type")
    val messageType: String = "TEXT"
)

@Serializable
data class InviteMembersRequest(
    @SerialName("user_ids")
    val userIds: List<String>
)

// API response wrapper for messages endpoint
@Serializable
data class MessagesApiResponse(
    val success: Boolean,
    val data: MessagesData? = null
)

@Serializable
data class MessagesData(
    val messages: List<ChatMessageDto>,
    val hasMore: Boolean = false,
    val nextCursor: String? = null
)

enum class ChatRoomType(val value: String) {
    DIRECT("DIRECT"),
    GROUP("GROUP"),
    BOOKING("BOOKING")
}

enum class MessageType(val value: String) {
    TEXT("TEXT"),
    IMAGE("IMAGE"),
    SYSTEM("SYSTEM"),
    BOOKING_INVITE("BOOKING_INVITE"),
    AI_USER("AI_USER"),
    AI_ASSISTANT("AI_ASSISTANT")
}

// AI Chat DTOs

@Serializable
data class AiChatRequest(
    val message: String,
    val conversationId: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val selectedClubId: String? = null,
    val selectedClubName: String? = null,
    val selectedSlotId: String? = null,
    val selectedSlotTime: String? = null,
    val selectedSlotPrice: Int? = null,
    val selectedCourseName: String? = null,
    val confirmBooking: Boolean? = null,
    val cancelBooking: Boolean? = null,
    val paymentMethod: String? = null,
    val paymentComplete: Boolean? = null,
    val paymentSuccess: Boolean? = null,
    // 그룹 예약
    val selectedSlots: List<SelectedSlotDto>? = null,
    val teams: List<TeamDto>? = null,
    val confirmGroupBooking: Boolean? = null,
    // 분할결제 완료
    val splitPaymentComplete: Boolean? = null,
    val splitOrderId: String? = null,
    // 그룹 예약 후속 액션
    val chatRoomId: String? = null,
    val teamMembers: List<TeamMemberDto>? = null,
    val nextTeam: Boolean? = null,
    val finishGroup: Boolean? = null,
    val sendReminder: Boolean? = null
)

@Serializable
data class SelectedSlotDto(
    val slotId: String,
    val slotTime: String,
    val courseName: String,
    val price: Int
)

@Serializable
data class TeamDto(
    val teamNumber: Int,
    val slotId: String,
    val members: List<TeamMemberDto>
)

@Serializable
data class TeamMemberDto(
    val userId: Int,
    val userName: String,
    val userEmail: String
)

@Serializable
data class AiChatActionDto(
    val type: String,
    val data: kotlinx.serialization.json.JsonObject? = null
)

@Serializable
data class AiChatResponseDto(
    val conversationId: String,
    val message: String,
    val state: String,
    val actions: List<AiChatActionDto> = emptyList()
)
