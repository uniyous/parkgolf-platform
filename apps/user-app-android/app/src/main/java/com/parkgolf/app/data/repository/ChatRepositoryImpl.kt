package com.parkgolf.app.data.repository

import com.parkgolf.app.data.remote.api.ChatApi
import com.parkgolf.app.data.remote.dto.chat.ChatMessageDto
import com.parkgolf.app.data.remote.dto.chat.ChatParticipantDto
import com.parkgolf.app.data.remote.dto.chat.ChatRoomDto
import com.parkgolf.app.data.remote.dto.chat.CreateChatRoomRequest
import com.parkgolf.app.data.remote.dto.chat.SendMessageRequest
import com.parkgolf.app.data.remote.socket.ChatSocketManager
import com.parkgolf.app.domain.model.ChatMessage
import com.parkgolf.app.domain.model.ChatParticipant
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.model.ChatRoomType
import com.parkgolf.app.domain.model.MessageType
import com.parkgolf.app.domain.repository.ChatRepository
import com.parkgolf.app.domain.repository.MessagesResult
import com.parkgolf.app.util.PaginatedData
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepositoryImpl @Inject constructor(
    private val chatApi: ChatApi,
    private val chatSocketManager: ChatSocketManager
) : ChatRepository {

    override val messageFlow: Flow<ChatMessage> = chatSocketManager.messageReceived

    override val connectionState: Flow<Boolean> = chatSocketManager.connectionState

    override suspend fun getChatRooms(page: Int, limit: Int): Result<PaginatedData<ChatRoom>> {
        return try {
            val response = chatApi.getChatRooms(page, limit)
            if (response.success) {
                Result.success(
                    PaginatedData(
                        data = response.data.map { it.toDomain() },
                        total = response.total,
                        page = response.page,
                        limit = response.limit,
                        totalPages = response.totalPages
                    )
                )
            } else {
                Result.failure(Exception("Failed to get chat rooms"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getChatRoom(roomId: String): Result<ChatRoom> {
        return try {
            val response = chatApi.getChatRoom(roomId)
            if (response.success && response.data != null) {
                Result.success(response.data.toDomain())
            } else {
                Result.failure(Exception("Failed to get chat room"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun createChatRoom(
        name: String,
        type: ChatRoomType,
        participantIds: List<String>
    ): Result<ChatRoom> {
        return try {
            val request = CreateChatRoomRequest(
                name = name,
                type = type.value,
                participantIds = participantIds
            )
            val response = chatApi.createChatRoom(request)
            if (response.success && response.data != null) {
                Result.success(response.data.toDomain())
            } else {
                Result.failure(Exception("Failed to create chat room"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getMessages(
        roomId: String,
        cursor: String?,
        limit: Int
    ): Result<MessagesResult> {
        return try {
            val response = chatApi.getMessages(roomId, cursor, limit)
            if (response.success) {
                Result.success(
                    MessagesResult(
                        messages = response.data.map { it.toDomain() },
                        nextCursor = response.nextCursor,
                        hasMore = response.hasMore
                    )
                )
            } else {
                Result.failure(Exception("Failed to get messages"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun sendMessage(
        roomId: String,
        content: String,
        messageType: String
    ): Result<ChatMessage> {
        return try {
            val request = SendMessageRequest(content, messageType)
            val response = chatApi.sendMessage(roomId, request)
            if (response.success && response.data != null) {
                Result.success(response.data.toDomain())
            } else {
                Result.failure(Exception("Failed to send message"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun leaveChatRoom(roomId: String): Result<Unit> {
        return try {
            val response = chatApi.leaveChatRoom(roomId)
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to leave chat room"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun markAsRead(roomId: String): Result<Unit> {
        return try {
            val response = chatApi.markAsRead(roomId)
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to mark as read"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Socket operations
    override fun connect(token: String) {
        chatSocketManager.connect(token)
    }

    override fun disconnect() {
        chatSocketManager.disconnect()
    }

    override fun joinRoom(roomId: String) {
        chatSocketManager.joinRoom(roomId)
    }

    override fun leaveRoom(roomId: String) {
        chatSocketManager.leaveRoom(roomId)
    }

    override fun sendMessageViaSocket(roomId: String, content: String) {
        chatSocketManager.sendMessage(roomId, content)
    }

    override fun sendTyping(roomId: String, isTyping: Boolean) {
        chatSocketManager.sendTyping(roomId, isTyping)
    }
}

private fun ChatRoomDto.toDomain(): ChatRoom {
    return ChatRoom(
        id = id,
        name = name,
        type = ChatRoomType.fromValue(type),
        participants = participants.map { it.toDomain() },
        lastMessage = lastMessage?.toDomain(),
        unreadCount = unreadCount,
        createdAt = parseDateTime(createdAt),
        updatedAt = parseDateTime(updatedAt)
    )
}

private fun ChatParticipantDto.toDomain(): ChatParticipant {
    return ChatParticipant(
        id = id,
        userId = oduserId,
        userName = userName,
        profileImageUrl = profileImageUrl,
        joinedAt = parseDateTime(joinedAt)
    )
}

private fun ChatMessageDto.toDomain(): ChatMessage {
    return ChatMessage(
        id = id,
        roomId = roomId,
        senderId = senderId,
        senderName = senderName,
        content = content,
        messageType = MessageType.fromValue(messageType),
        createdAt = parseDateTime(createdAt),
        readBy = readBy
    )
}

private fun parseDateTime(dateStr: String): LocalDateTime {
    return try {
        LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_DATE_TIME)
    } catch (e: Exception) {
        LocalDateTime.now()
    }
}
