package com.parkgolf.app.data.remote.socket

import android.util.Log
import com.parkgolf.app.BuildConfig
import com.parkgolf.app.domain.model.AppNotification
import com.parkgolf.app.domain.model.NotificationData
import com.parkgolf.app.domain.model.NotificationStatus
import com.parkgolf.app.domain.model.NotificationType
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

private const val TAG = "NotificationSocketMgr"

@Singleton
class NotificationSocketManager @Inject constructor() {

    private val socketLock = ReentrantLock()
    private var socket: Socket? = null
    private val isConnecting = AtomicBoolean(false)

    private val _connectionState = MutableStateFlow(false)
    val connectionState: StateFlow<Boolean> = _connectionState.asStateFlow()

    private val _notificationReceived = MutableSharedFlow<AppNotification>(extraBufferCapacity = 100)
    val notificationReceived: SharedFlow<AppNotification> = _notificationReceived.asSharedFlow()

    val isConnected: Boolean
        get() = socketLock.withLock { socket?.connected() == true }

    fun connect(token: String) {
        if (isConnecting.get() || isConnected) return

        if (!isConnecting.compareAndSet(false, true)) return

        socketLock.withLock {
            try {
                cleanupSocketUnsafe()

                val socketUrl = "${BuildConfig.CHAT_SOCKET_URL}/notification"
                Log.d(TAG, "Connecting to: $socketUrl")

                val options = IO.Options().apply {
                    query = "token=$token"
                    forceNew = true
                    reconnection = true
                    reconnectionAttempts = Int.MAX_VALUE
                    reconnectionDelay = 1000
                    timeout = 20000
                    transports = arrayOf("websocket", "polling")
                }

                socket = IO.socket(URI.create(socketUrl), options).apply {
                    setupEventListeners()
                }

                socket?.connect()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize socket", e)
                _connectionState.value = false
                isConnecting.set(false)
            }
        }
    }

    fun disconnect() {
        socketLock.withLock {
            cleanupSocketUnsafe()
            _connectionState.value = false
        }
    }

    fun forceReconnect(token: String) {
        socketLock.withLock {
            cleanupSocketUnsafe()
        }
        connect(token)
    }

    private fun Socket.setupEventListeners() {
        on(Socket.EVENT_CONNECT) {
            isConnecting.set(false)
            _connectionState.value = true
            Log.d(TAG, "Connected")
        }

        on(Socket.EVENT_DISCONNECT) {
            _connectionState.value = false
            Log.d(TAG, "Disconnected")
        }

        on(Socket.EVENT_CONNECT_ERROR) { args ->
            isConnecting.set(false)
            _connectionState.value = false
            val errorMsg = args.firstOrNull()?.toString() ?: "Unknown"
            Log.e(TAG, "Connection error: $errorMsg")
        }

        on("connected") { args ->
            Log.d(TAG, "Authenticated: ${args.firstOrNull()}")
        }

        on("notification") { args ->
            handleNotification(args)
        }

        on("error") { args ->
            val errorMsg = args.firstOrNull()?.toString() ?: "Unknown"
            Log.e(TAG, "Error: $errorMsg")
        }
    }

    private fun handleNotification(args: Array<Any>) {
        if (args.isEmpty()) return
        val data = args[0] as? JSONObject ?: return

        try {
            val typeStr = data.optString("type")
            val type = try {
                NotificationType.valueOf(typeStr)
            } catch (e: Exception) {
                Log.w(TAG, "Unknown notification type: $typeStr")
                return
            }

            val createdAtStr = data.optString("createdAt")
            val createdAt = try {
                LocalDateTime.parse(createdAtStr, DateTimeFormatter.ISO_DATE_TIME)
            } catch (e: Exception) {
                LocalDateTime.now()
            }

            var notificationData: NotificationData? = null
            val dataObj = data.optJSONObject("data")
            if (dataObj != null) {
                notificationData = NotificationData(
                    bookingId = dataObj.optString("bookingId").takeIf { it.isNotEmpty() },
                    courseId = dataObj.optString("courseId").takeIf { it.isNotEmpty() },
                    courseName = dataObj.optString("courseName").takeIf { it.isNotEmpty() },
                    bookingDate = dataObj.optString("bookingDate").takeIf { it.isNotEmpty() },
                    bookingTime = dataObj.optString("bookingTime").takeIf { it.isNotEmpty() },
                    paymentId = dataObj.optString("paymentId").takeIf { it.isNotEmpty() },
                    amount = if (dataObj.has("amount")) dataObj.optInt("amount") else null,
                    failureReason = dataObj.optString("failureReason").takeIf { it.isNotEmpty() },
                    friendId = dataObj.optString("friendId").takeIf { it.isNotEmpty() },
                    friendName = dataObj.optString("friendName").takeIf { it.isNotEmpty() },
                    chatRoomId = dataObj.optString("chatRoomId").takeIf { it.isNotEmpty() }
                )
            }

            val notification = AppNotification(
                id = data.optInt("id"),
                userId = data.optString("userId"),
                type = type,
                title = data.optString("title"),
                message = data.optString("message"),
                data = notificationData,
                status = if (data.optBoolean("isRead")) NotificationStatus.READ else NotificationStatus.SENT,
                readAt = null,
                createdAt = createdAt,
                updatedAt = createdAt
            )

            _notificationReceived.tryEmit(notification)
            Log.d(TAG, "Notification received: ${notification.title}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse notification", e)
        }
    }

    private fun cleanupSocketUnsafe() {
        socket?.let { s ->
            try {
                s.off()
                if (s.connected()) s.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Error during cleanup", e)
            }
        }
        socket = null
    }
}
