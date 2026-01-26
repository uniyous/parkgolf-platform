package com.parkgolf.app.data.remote.socket

import android.util.Log
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
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.locks.ReentrantLock
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.concurrent.withLock

private const val TAG = "ChatSocketManager"
private const val MAX_RECONNECT_ATTEMPTS = 10
private const val MIN_RECONNECT_INTERVAL_MS = 3000L
private const val CONNECTION_CHECK_INTERVAL_MS = 30000L

/**
 * Socket.IO 기반 채팅 소켓 매니저
 *
 * 스레드 안전성과 라이프사이클 관리가 개선된 버전:
 * - ReentrantLock으로 소켓 접근 동기화
 * - AtomicBoolean으로 연결 상태 관리
 * - 명시적 리스너 정리
 * - 재연결 로직 개선
 * - 주기적 연결 체크 (iOS와 동일)
 */
@Singleton
class ChatSocketManager @Inject constructor() {

    private val socketLock = ReentrantLock()
    private var socket: Socket? = null
    private val isConnecting = AtomicBoolean(false)
    private var currentRoomId: String? = null

    // Reconnection tracking (like iOS)
    private var reconnectAttempts = 0
    private var lastConnectAttempt: Long = 0
    private var savedToken: String? = null

    // Periodic connection check
    private var connectionCheckJob: java.util.Timer? = null

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

    private val _error = MutableSharedFlow<SocketError>(extraBufferCapacity = 10)
    val error: SharedFlow<SocketError> = _error.asSharedFlow()

    /**
     * 소켓 연결
     * @param token JWT 인증 토큰
     */
    fun connect(token: String) {
        // 이미 연결 중이거나 연결된 상태면 무시
        if (isConnecting.get() || isConnected) {
            Log.d(TAG, "Already connected or connecting, skipping connect request")
            return
        }

        // Rate limiting check (like iOS)
        val now = System.currentTimeMillis()
        if (now - lastConnectAttempt < MIN_RECONNECT_INTERVAL_MS) {
            Log.d(TAG, "Reconnect attempt too soon, waiting...")
            return
        }

        if (!isConnecting.compareAndSet(false, true)) {
            Log.d(TAG, "Another connect attempt in progress")
            return
        }

        lastConnectAttempt = now
        savedToken = token

        socketLock.withLock {
            try {
                // 기존 소켓이 있으면 정리
                cleanupSocketUnsafe()

                val options = IO.Options().apply {
                    query = "token=$token"
                    forceNew = true
                    reconnection = true
                    reconnectionAttempts = MAX_RECONNECT_ATTEMPTS
                    reconnectionDelay = MIN_RECONNECT_INTERVAL_MS
                    timeout = 20000
                }

                socket = IO.socket(URI.create("${BuildConfig.CHAT_SOCKET_URL}/chat"), options).apply {
                    setupEventListeners()
                }

                socket?.connect()
                Log.d(TAG, "Socket connection initiated")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize socket", e)
                _connectionState.value = false
                _error.tryEmit(SocketError.ConnectionFailed(e.message ?: "Unknown error"))
            } finally {
                isConnecting.set(false)
            }
        }
    }

    /**
     * 소켓 연결 해제 및 리소스 정리
     */
    fun disconnect() {
        stopConnectionCheck()
        socketLock.withLock {
            currentRoomId = null
            cleanupSocketUnsafe()
            _connectionState.value = false
            Log.d(TAG, "Socket disconnected and cleaned up")
        }
    }

    /**
     * 재연결 가능 여부 (iOS와 동일)
     */
    val canReconnect: Boolean
        get() = reconnectAttempts < MAX_RECONNECT_ATTEMPTS

    /**
     * 연결 확인 및 필요시 재연결 (iOS checkAndReconnectIfNeeded와 동일)
     */
    fun ensureConnected(token: String) {
        if (!isConnected && canReconnect) {
            reconnectAttempts++
            Log.d(TAG, "Attempting reconnect ($reconnectAttempts/$MAX_RECONNECT_ATTEMPTS)")
            connect(token)
        }
    }

    /**
     * 강제 재연결 - 시도 횟수 리셋 (iOS forceReconnect와 동일)
     */
    fun forceReconnect(token: String) {
        Log.d(TAG, "Force reconnect requested, resetting attempts")
        reconnectAttempts = 0
        lastConnectAttempt = 0
        socketLock.withLock {
            cleanupSocketUnsafe()
        }
        connect(token)
    }

    /**
     * 주기적 연결 체크 시작 (30초마다, iOS와 동일)
     */
    fun startConnectionCheck(token: String) {
        stopConnectionCheck()
        connectionCheckJob = java.util.Timer().apply {
            scheduleAtFixedRate(object : java.util.TimerTask() {
                override fun run() {
                    if (!isConnected && canReconnect) {
                        Log.d(TAG, "Periodic check: connection lost, attempting reconnect")
                        ensureConnected(token)
                        // Rejoin room if we have one
                        currentRoomId?.let { roomId ->
                            joinRoom(roomId)
                        }
                    }
                }
            }, CONNECTION_CHECK_INTERVAL_MS, CONNECTION_CHECK_INTERVAL_MS)
        }
        Log.d(TAG, "Connection check started (interval: ${CONNECTION_CHECK_INTERVAL_MS}ms)")
    }

    /**
     * 주기적 연결 체크 중지
     */
    fun stopConnectionCheck() {
        connectionCheckJob?.cancel()
        connectionCheckJob = null
        Log.d(TAG, "Connection check stopped")
    }

    /**
     * 채팅방 입장
     */
    fun joinRoom(roomId: String) {
        socketLock.withLock {
            socket?.let { s ->
                if (s.connected()) {
                    currentRoomId = roomId
                    s.emit("join_room", JSONObject().apply {
                        put("roomId", roomId)
                    })
                    Log.d(TAG, "Joined room: $roomId")
                } else {
                    Log.w(TAG, "Cannot join room - socket not connected")
                }
            }
        }
    }

    /**
     * 채팅방 퇴장
     */
    fun leaveRoom(roomId: String) {
        socketLock.withLock {
            socket?.let { s ->
                if (s.connected()) {
                    s.emit("leave_room", JSONObject().apply {
                        put("roomId", roomId)
                    })
                    if (currentRoomId == roomId) {
                        currentRoomId = null
                    }
                    Log.d(TAG, "Left room: $roomId")
                }
            }
        }
    }

    /**
     * 메시지 전송
     */
    fun sendMessage(roomId: String, content: String, type: String = "TEXT") {
        socketLock.withLock {
            socket?.let { s ->
                if (s.connected()) {
                    s.emit("send_message", JSONObject().apply {
                        put("roomId", roomId)
                        put("content", content)
                        put("type", type)
                    })
                    Log.d(TAG, "Message sent to room: $roomId")
                } else {
                    Log.w(TAG, "Cannot send message - socket not connected")
                    _error.tryEmit(SocketError.NotConnected)
                }
            } ?: run {
                Log.w(TAG, "Cannot send message - socket is null")
                _error.tryEmit(SocketError.NotConnected)
            }
        }
    }

    /**
     * 타이핑 상태 전송
     */
    fun sendTyping(roomId: String, isTyping: Boolean) {
        socketLock.withLock {
            socket?.let { s ->
                if (s.connected()) {
                    s.emit("typing", JSONObject().apply {
                        put("roomId", roomId)
                        put("isTyping", isTyping)
                    })
                }
            }
        }
    }

    val isConnected: Boolean
        get() = socketLock.withLock { socket?.connected() == true }

    /**
     * 현재 입장한 채팅방 ID
     */
    val currentRoom: String?
        get() = socketLock.withLock { currentRoomId }

    // Private helper methods

    private fun Socket.setupEventListeners() {
        on(Socket.EVENT_CONNECT) {
            _connectionState.value = true
            // Reset reconnect counter on successful connection (like iOS)
            reconnectAttempts = 0
            Log.d(TAG, "Socket connected, reconnect attempts reset")
        }

        on(Socket.EVENT_DISCONNECT) { args ->
            _connectionState.value = false
            val reason = args.firstOrNull()?.toString() ?: "unknown"
            Log.d(TAG, "Socket disconnected: $reason")
        }

        on(Socket.EVENT_CONNECT_ERROR) { args ->
            _connectionState.value = false
            reconnectAttempts++
            val errorMsg = args.firstOrNull()?.toString() ?: "Unknown connection error"
            Log.e(TAG, "Socket connection error ($reconnectAttempts/$MAX_RECONNECT_ATTEMPTS): $errorMsg")
            _error.tryEmit(SocketError.ConnectionFailed(errorMsg))
        }

        on("new_message") { args ->
            handleNewMessage(args)
        }

        on("typing") { args ->
            handleTypingEvent(args)
        }

        on("user_joined") { args ->
            handleUserJoined(args)
        }

        on("user_left") { args ->
            handleUserLeft(args)
        }

        on("error") { args ->
            val errorMsg = args.firstOrNull()?.toString() ?: "Unknown error"
            Log.e(TAG, "Socket error: $errorMsg")
            _error.tryEmit(SocketError.ServerError(errorMsg))
        }
    }

    private fun handleNewMessage(args: Array<Any>) {
        if (args.isEmpty()) return
        val data = args[0] as? JSONObject ?: return

        try {
            val message = parseMessage(data)
            _messageReceived.tryEmit(message)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse message", e)
        }
    }

    private fun handleTypingEvent(args: Array<Any>) {
        if (args.isEmpty()) return
        val data = args[0] as? JSONObject ?: return

        try {
            val event = TypingEvent(
                roomId = data.optString("roomId"),
                userId = data.optString("userId"),
                userName = data.optString("userName"),
                isTyping = data.optBoolean("isTyping", false)
            )
            _typingEvent.tryEmit(event)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse typing event", e)
        }
    }

    private fun handleUserJoined(args: Array<Any>) {
        if (args.isEmpty()) return
        val data = args[0] as? JSONObject ?: return

        try {
            val event = UserJoinedEvent(
                roomId = data.optString("roomId"),
                userId = data.optString("userId"),
                userName = data.optString("userName")
            )
            _userJoined.tryEmit(event)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse user joined event", e)
        }
    }

    private fun handleUserLeft(args: Array<Any>) {
        if (args.isEmpty()) return
        val data = args[0] as? JSONObject ?: return

        try {
            val event = UserLeftEvent(
                roomId = data.optString("roomId"),
                userId = data.optString("userId"),
                userName = data.optString("userName")
            )
            _userLeft.tryEmit(event)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse user left event", e)
        }
    }

    /**
     * 소켓 정리 (락 없이 - 호출자가 락을 보유해야 함)
     */
    private fun cleanupSocketUnsafe() {
        socket?.let { s ->
            try {
                // 모든 리스너 제거
                s.off()
                // 연결 해제
                if (s.connected()) {
                    s.disconnect()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error during socket cleanup", e)
            }
        }
        socket = null
    }

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

// Event data classes
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

// Error sealed class for type-safe error handling
sealed class SocketError {
    data class ConnectionFailed(val message: String) : SocketError()
    data class ServerError(val message: String) : SocketError()
    data object NotConnected : SocketError()
}
