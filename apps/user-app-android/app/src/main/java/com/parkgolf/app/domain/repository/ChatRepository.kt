package com.parkgolf.app.domain.repository

import com.parkgolf.app.data.remote.socket.TypingEvent
import com.parkgolf.app.domain.model.AiChatResponse
import com.parkgolf.app.domain.model.ChatMessage
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.model.ChatRoomType
import kotlinx.coroutines.flow.Flow

interface ChatRepository {
    val messageFlow: Flow<ChatMessage>
    val connectionState: Flow<Boolean>
    val natsConnectionState: Flow<Boolean>
    val tokenRefreshNeeded: Flow<Unit>
    val typingFlow: Flow<TypingEvent>

    // API returns simple array, not paginated
    suspend fun getChatRooms(page: Int = 1, limit: Int = 50): Result<List<ChatRoom>>

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

    suspend fun inviteMembers(roomId: String, userIds: List<String>): Result<Unit>

    suspend fun markAsRead(roomId: String): Result<Unit>

    suspend fun sendAiMessage(
        roomId: String,
        message: String,
        conversationId: String? = null,
        latitude: Double? = null,
        longitude: Double? = null
    ): Result<AiChatResponse>

    // Socket operations
    fun connect(token: String)
    fun disconnect()
    fun joinRoom(roomId: String)
    fun leaveRoom(roomId: String)
    fun sendMessageViaSocket(roomId: String, content: String)
    fun sendTyping(roomId: String, isTyping: Boolean)

    // Connection management (like iOS)
    val isConnected: Boolean
    val canReconnect: Boolean
    fun ensureConnected(token: String)
    fun forceReconnect(token: String)
    fun startConnectionCheck(token: String)
    fun stopConnectionCheck()
    fun handleAppForeground()
}

data class MessagesResult(
    val messages: List<ChatMessage>,
    val nextCursor: String?,
    val hasMore: Boolean
)
