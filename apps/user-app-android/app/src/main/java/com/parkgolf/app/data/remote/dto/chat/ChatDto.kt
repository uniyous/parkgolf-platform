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
    val participantIds: List<String>
)

@Serializable
data class SendMessageRequest(
    val content: String,
    val messageType: String = "TEXT"
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
    BOOKING_INVITE("BOOKING_INVITE")
}
