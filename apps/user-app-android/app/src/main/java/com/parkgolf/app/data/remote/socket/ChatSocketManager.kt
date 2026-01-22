package com.parkgolf.app.data.remote.socket

import com.parkgolf.app.BuildConfig
import com.parkgolf.app.domain.model.ChatMessage
import com.parkgolf.app.domain.model.MessageType
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject
import java.net.URI
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatSocketManager @Inject constructor() {

    private var socket: Socket? = null

    private val _connectionState = MutableStateFlow(false)
    val connectionState: StateFlow<Boolean> = _connectionState.asStateFlow()

    private val _messageReceived = MutableSharedFlow<ChatMessage>(extraBufferCapacity = 100)
    val messageReceived: SharedFlow<ChatMessage> = _messageReceived.asSharedFlow()

    private val _typingEvent = MutableSharedFlow<TypingEvent>(extraBufferCapacity = 100)
    val typingEvent: SharedFlow<TypingEvent> = _typingEvent.asSharedFlow()

    private val _userJoined = MutableSharedFlow<UserJoinedEvent>(extraBufferCapacity = 100)
    val userJoined: SharedFlow<UserJoinedEvent> = _userJoined.asSharedFlow()

    private val _userLeft = MutableSharedFlow<UserLeftEvent>(extraBufferCapacity = 100)
    val userLeft: SharedFlow<UserLeftEvent> = _userLeft.asSharedFlow()

    fun connect(token: String) {
        if (socket?.connected() == true) return

        try {
            val options = IO.Options().apply {
                query = "token=$token"
                forceNew = true
                reconnection = true
                reconnectionAttempts = 10
                reconnectionDelay = 3000
                timeout = 20000
            }

            socket = IO.socket(URI.create("${BuildConfig.CHAT_SOCKET_URL}/chat"), options).apply {
                on(Socket.EVENT_CONNECT) {
                    _connectionState.value = true
                }

                on(Socket.EVENT_DISCONNECT) {
                    _connectionState.value = false
                }

                on(Socket.EVENT_CONNECT_ERROR) { args ->
                    _connectionState.value = false
                }

                on("new_message") { args ->
                    if (args.isNotEmpty()) {
                        val data = args[0] as? JSONObject ?: return@on
                        val message = parseMessage(data)
                        _messageReceived.tryEmit(message)
                    }
                }

                on("typing") { args ->
                    if (args.isNotEmpty()) {
                        val data = args[0] as? JSONObject ?: return@on
                        val event = TypingEvent(
                            roomId = data.optString("roomId"),
                            userId = data.optString("userId"),
                            userName = data.optString("userName"),
                            isTyping = data.optBoolean("isTyping", false)
                        )
                        _typingEvent.tryEmit(event)
                    }
                }

                on("user_joined") { args ->
                    if (args.isNotEmpty()) {
                        val data = args[0] as? JSONObject ?: return@on
                        val event = UserJoinedEvent(
                            roomId = data.optString("roomId"),
                            userId = data.optString("userId"),
                            userName = data.optString("userName")
                        )
                        _userJoined.tryEmit(event)
                    }
                }

                on("user_left") { args ->
                    if (args.isNotEmpty()) {
                        val data = args[0] as? JSONObject ?: return@on
                        val event = UserLeftEvent(
                            roomId = data.optString("roomId"),
                            userId = data.optString("userId"),
                            userName = data.optString("userName")
                        )
                        _userLeft.tryEmit(event)
                    }
                }
            }

            socket?.connect()
        } catch (e: Exception) {
            _connectionState.value = false
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        _connectionState.value = false
    }

    fun joinRoom(roomId: String) {
        socket?.emit("join_room", JSONObject().apply {
            put("roomId", roomId)
        })
    }

    fun leaveRoom(roomId: String) {
        socket?.emit("leave_room", JSONObject().apply {
            put("roomId", roomId)
        })
    }

    fun sendMessage(roomId: String, content: String, type: String = "TEXT") {
        socket?.emit("send_message", JSONObject().apply {
            put("roomId", roomId)
            put("content", content)
            put("type", type)
        })
    }

    fun sendTyping(roomId: String, isTyping: Boolean) {
        socket?.emit("typing", JSONObject().apply {
            put("roomId", roomId)
            put("isTyping", isTyping)
        })
    }

    val isConnected: Boolean
        get() = socket?.connected() == true

    private fun parseMessage(data: JSONObject): ChatMessage {
        val createdAtStr = data.optString("createdAt")
        val createdAt = try {
            LocalDateTime.parse(createdAtStr, DateTimeFormatter.ISO_DATE_TIME)
        } catch (e: Exception) {
            LocalDateTime.now()
        }

        return ChatMessage(
            id = data.optString("id"),
            roomId = data.optString("roomId"),
            senderId = data.optString("senderId"),
            senderName = data.optString("senderName"),
            content = data.optString("content"),
            messageType = MessageType.fromValue(data.optString("messageType", "TEXT")),
            createdAt = createdAt,
            readBy = null
        )
    }
}

data class TypingEvent(
    val roomId: String,
    val userId: String,
    val userName: String,
    val isTyping: Boolean
)

data class UserJoinedEvent(
    val roomId: String,
    val userId: String,
    val userName: String
)

data class UserLeftEvent(
    val roomId: String,
    val userId: String,
    val userName: String
)
