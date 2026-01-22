package com.parkgolf.app.data.remote.dto.chat

import kotlinx.serialization.Serializable

@Serializable
data class ChatRoomDto(
    val id: String,
    val name: String,
    val type: String, // DIRECT, GROUP, BOOKING
    val participants: List<ChatParticipantDto> = emptyList(),
    val lastMessage: ChatMessageDto? = null,
    val unreadCount: Int = 0,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class ChatParticipantDto(
    val id: String,
    val oduserId: String,
    val userName: String,
    val profileImageUrl: String? = null,
    val joinedAt: String
)

@Serializable
data class ChatMessageDto(
    val id: String,
    val roomId: String,
    val senderId: String,
    val senderName: String,
    val content: String,
    val messageType: String = "TEXT", // TEXT, IMAGE, SYSTEM, BOOKING_INVITE
    val createdAt: String,
    val readBy: List<String>? = null
)

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

@Serializable
data class MessagesResponse(
    val success: Boolean,
    val data: List<ChatMessageDto>,
    val nextCursor: String? = null,
    val hasMore: Boolean = false
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
