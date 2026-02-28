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
    fun displayName(currentUserId: String): String {
        val others = participants.filter { it.userId != currentUserId }

        // DIRECT: 상대방 이름
        if (type == ChatRoomType.DIRECT) {
            return others.firstOrNull()?.userName ?: name.ifEmpty { "채팅" }
        }

        // GROUP/BOOKING: 방 이름이 있으면 우선 사용
        if (name.isNotEmpty()) {
            return name
        }

        // 방 이름이 없을 때 참여자 이름 폴백 (생성자 우선)
        if (others.isEmpty()) return "채팅방"
        val sorted = others.sortedByDescending { it.isAdmin }
        if (sorted.size <= 2) return sorted.joinToString(", ") { it.userName }
        val first = sorted.take(2).joinToString(", ") { it.userName }
        return "$first 외 ${sorted.size - 2}명"
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
    val userEmail: String? = null,
    val profileImageUrl: String? = null,
    val isAdmin: Boolean = false,
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
    BOOKING_INVITE("BOOKING_INVITE"),
    AI_USER("AI_USER"),
    AI_ASSISTANT("AI_ASSISTANT");

    companion object {
        fun fromValue(value: String): MessageType =
            entries.find { it.value == value } ?: TEXT
    }
}

// AI Chat Models

enum class ConversationState(val value: String) {
    IDLE("idle"),
    COLLECTING("collecting"),
    CONFIRMING("confirming"),
    BOOKING("booking"),
    SELECTING_PARTICIPANTS("selecting_participants"),
    SETTLING("settling"),
    TEAM_COMPLETE("team_complete"),
    COMPLETED("completed"),
    CANCELLED("cancelled");

    companion object {
        fun fromValue(value: String): ConversationState =
            entries.find { it.value == value } ?: IDLE
    }
}

enum class ActionType(val value: String) {
    SHOW_CLUBS("SHOW_CLUBS"),
    SHOW_SLOTS("SHOW_SLOTS"),
    SHOW_WEATHER("SHOW_WEATHER"),
    CONFIRM_BOOKING("CONFIRM_BOOKING"),
    SHOW_PAYMENT("SHOW_PAYMENT"),
    BOOKING_COMPLETE("BOOKING_COMPLETE"),
    CONFIRM_GROUP("CONFIRM_GROUP"),
    SELECT_PARTICIPANTS("SELECT_PARTICIPANTS"),
    SPLIT_PAYMENT("SPLIT_PAYMENT"),
    SETTLEMENT_STATUS("SETTLEMENT_STATUS"),
    TEAM_COMPLETE("TEAM_COMPLETE");

    companion object {
        fun fromValue(value: String): ActionType? =
            entries.find { it.value == value }
    }
}

data class ChatAction(
    val type: ActionType,
    val data: Map<String, Any?>
)

data class AiChatResponse(
    val conversationId: String,
    val message: String,
    val state: ConversationState,
    val actions: List<ChatAction>
)
