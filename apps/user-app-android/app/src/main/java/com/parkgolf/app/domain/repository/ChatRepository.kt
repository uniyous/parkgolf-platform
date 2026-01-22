package com.parkgolf.app.domain.repository

import com.parkgolf.app.domain.model.ChatMessage
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.model.ChatRoomType
import com.parkgolf.app.util.PaginatedData
import kotlinx.coroutines.flow.Flow

interface ChatRepository {
    val messageFlow: Flow<ChatMessage>
    val connectionState: Flow<Boolean>

    suspend fun getChatRooms(page: Int = 1, limit: Int = 20): Result<PaginatedData<ChatRoom>>

    suspend fun getChatRoom(roomId: String): Result<ChatRoom>

    suspend fun createChatRoom(
        name: String,
        type: ChatRoomType,
        participantIds: List<String>
    ): Result<ChatRoom>

    suspend fun getMessages(
        roomId: String,
        cursor: String? = null,
        limit: Int = 50
    ): Result<MessagesResult>

    suspend fun sendMessage(
        roomId: String,
        content: String,
        messageType: String = "TEXT"
    ): Result<ChatMessage>

    suspend fun leaveChatRoom(roomId: String): Result<Unit>

    suspend fun markAsRead(roomId: String): Result<Unit>

    // Socket operations
    fun connect(token: String)
    fun disconnect()
    fun joinRoom(roomId: String)
    fun leaveRoom(roomId: String)
    fun sendMessageViaSocket(roomId: String, content: String)
    fun sendTyping(roomId: String, isTyping: Boolean)
}

data class MessagesResult(
    val messages: List<ChatMessage>,
    val nextCursor: String?,
    val hasMore: Boolean
)
