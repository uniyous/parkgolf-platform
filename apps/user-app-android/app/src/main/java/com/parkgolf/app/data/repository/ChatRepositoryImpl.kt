package com.parkgolf.app.data.repository

import com.parkgolf.app.data.mapper.toDomain
import com.parkgolf.app.data.remote.api.ChatApi
import com.parkgolf.app.data.remote.dto.chat.CreateChatRoomRequest
import com.parkgolf.app.data.remote.dto.chat.SendMessageRequest
import com.parkgolf.app.data.remote.socket.ChatSocketManager
import com.parkgolf.app.domain.model.ChatMessage
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.model.ChatRoomType
import com.parkgolf.app.domain.repository.ChatRepository
import com.parkgolf.app.domain.repository.MessagesResult
import com.parkgolf.app.util.safeApiCall
import com.parkgolf.app.util.toResult
import com.parkgolf.app.util.toUnitResult
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepositoryImpl @Inject constructor(
    private val chatApi: ChatApi,
    private val chatSocketManager: ChatSocketManager
) : ChatRepository {

    override val messageFlow: Flow<ChatMessage> = chatSocketManager.messageReceived

    override val connectionState: Flow<Boolean> = chatSocketManager.connectionState

    // API returns simple array response, not paginated
    override suspend fun getChatRooms(page: Int, limit: Int): Result<List<ChatRoom>> = safeApiCall {
        val response = chatApi.getChatRooms(page, limit)
        if (response.success && response.data != null) {
            Result.success(response.data.map { it.toDomain() })
        } else {
            Result.failure(Exception("채팅방 목록 조회에 실패했습니다"))
        }
    }

    override suspend fun getChatRoom(roomId: String): Result<ChatRoom> = safeApiCall {
        chatApi.getChatRoom(roomId).toResult("채팅방 조회에 실패했습니다") { it.toDomain() }
    }

    override suspend fun createChatRoom(
        name: String,
        type: ChatRoomType,
        participantIds: List<String>
    ): Result<ChatRoom> = safeApiCall {
        val request = CreateChatRoomRequest(
            name = name,
            type = type.value,
            participantIds = participantIds
        )
        chatApi.createChatRoom(request).toResult("채팅방 생성에 실패했습니다") { it.toDomain() }
    }

    override suspend fun getMessages(
        roomId: String,
        cursor: String?,
        limit: Int
    ): Result<MessagesResult> = safeApiCall {
        val response = chatApi.getMessages(roomId, cursor, limit)
        if (response.success && response.data != null) {
            Result.success(
                MessagesResult(
                    messages = response.data.messages.map { it.toDomain() },
                    nextCursor = response.data.nextCursor,
                    hasMore = response.data.hasMore
                )
            )
        } else {
            Result.failure(Exception("메시지 조회에 실패했습니다"))
        }
    }

    override suspend fun sendMessage(
        roomId: String,
        content: String,
        messageType: String
    ): Result<ChatMessage> = safeApiCall {
        val request = SendMessageRequest(content, messageType)
        chatApi.sendMessage(roomId, request).toResult("메시지 전송에 실패했습니다") { it.toDomain() }
    }

    override suspend fun leaveChatRoom(roomId: String): Result<Unit> = safeApiCall {
        chatApi.leaveChatRoom(roomId).toUnitResult("채팅방 나가기에 실패했습니다")
    }

    override suspend fun markAsRead(roomId: String): Result<Unit> = safeApiCall {
        chatApi.markAsRead(roomId).toUnitResult("읽음 처리에 실패했습니다")
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

    // Connection management (like iOS)
    override val isConnected: Boolean
        get() = chatSocketManager.isConnected

    override val canReconnect: Boolean
        get() = chatSocketManager.canReconnect

    override fun ensureConnected(token: String) {
        chatSocketManager.ensureConnected(token)
    }

    override fun forceReconnect(token: String) {
        chatSocketManager.forceReconnect(token)
    }

    override fun startConnectionCheck(token: String) {
        chatSocketManager.startConnectionCheck(token)
    }

    override fun stopConnectionCheck() {
        chatSocketManager.stopConnectionCheck()
    }
}
