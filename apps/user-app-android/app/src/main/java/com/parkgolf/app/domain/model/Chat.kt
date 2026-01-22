package com.parkgolf.app.domain.model

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

data class ChatRoom(
    val id: String,
    val name: String,
    val type: ChatRoomType,
    val participants: List<ChatParticipant> = emptyList(),
    val lastMessage: ChatMessage? = null,
    val unreadCount: Int = 0,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
) {
    val displayName: String
        get() = if (type == ChatRoomType.DIRECT && participants.size == 2) {
            participants.firstOrNull()?.userName ?: name
        } else {
            name
        }

    val lastMessagePreview: String
        get() = lastMessage?.content ?: "대화를 시작해보세요"

    val lastMessageTime: String
        get() = lastMessage?.relativeTime ?: ""
}

data class ChatParticipant(
    val id: String,
    val userId: String,
    val userName: String,
    val profileImageUrl: String? = null,
    val joinedAt: LocalDateTime
) {
    val initials: String
        get() = userName.take(1)
}

data class ChatMessage(
    val id: String,
    val roomId: String,
    val senderId: String,
    val senderName: String,
    val content: String,
    val messageType: MessageType = MessageType.TEXT,
    val createdAt: LocalDateTime,
    val readBy: List<String>? = null
) {
    val timeText: String
        get() {
            val formatter = DateTimeFormatter.ofPattern("a h:mm")
            return createdAt.format(formatter)
        }

    val relativeTime: String
        get() {
            val now = LocalDateTime.now()
            val minutes = ChronoUnit.MINUTES.between(createdAt, now)
            val hours = ChronoUnit.HOURS.between(createdAt, now)
            val days = ChronoUnit.DAYS.between(createdAt, now)

            return when {
                minutes < 1 -> "방금 전"
                minutes < 60 -> "${minutes}분 전"
                hours < 24 -> "${hours}시간 전"
                days < 7 -> "${days}일 전"
                else -> {
                    val formatter = DateTimeFormatter.ofPattern("M/d")
                    createdAt.format(formatter)
                }
            }
        }

    fun isFromMe(myUserId: String): Boolean = senderId == myUserId
}

enum class ChatRoomType(val value: String) {
    DIRECT("DIRECT"),
    GROUP("GROUP"),
    BOOKING("BOOKING");

    companion object {
        fun fromValue(value: String): ChatRoomType =
            entries.find { it.value == value } ?: DIRECT
    }
}

enum class MessageType(val value: String) {
    TEXT("TEXT"),
    IMAGE("IMAGE"),
    SYSTEM("SYSTEM"),
    BOOKING_INVITE("BOOKING_INVITE");

    companion object {
        fun fromValue(value: String): MessageType =
            entries.find { it.value == value } ?: TEXT
    }
}
