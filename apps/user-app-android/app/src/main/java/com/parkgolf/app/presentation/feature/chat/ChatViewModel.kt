package com.parkgolf.app.presentation.feature.chat

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.ChatMessage
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.repository.AuthRepository
import com.parkgolf.app.domain.repository.ChatRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val TAG = "ChatViewModel"

data class ChatUiState(
    val isLoading: Boolean = false,
    val room: ChatRoom? = null,
    val messages: List<ChatMessage> = emptyList(),
    val messageInput: String = "",
    val isConnected: Boolean = false,
    val isSending: Boolean = false,
    val hasMore: Boolean = false,
    val nextCursor: String? = null,
    val currentUserId: String? = null,
    val error: String? = null,
    val canReconnect: Boolean = true
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private var currentRoomId: String? = null
    private var savedToken: String? = null

    init {
        observeConnectionState()
        observeMessages()
        loadCurrentUser()
    }

    private fun loadCurrentUser() {
        viewModelScope.launch {
            authRepository.currentUser.collect { user ->
                _uiState.value = _uiState.value.copy(
                    currentUserId = user?.id?.toString()
                )
            }
        }
    }

    private fun observeConnectionState() {
        viewModelScope.launch {
            chatRepository.connectionState.collect { isConnected ->
                _uiState.value = _uiState.value.copy(isConnected = isConnected)
            }
        }
    }

    private fun observeMessages() {
        viewModelScope.launch {
            chatRepository.messageFlow.collect { message ->
                if (message.roomId == currentRoomId) {
                    val currentMessages = _uiState.value.messages.toMutableList()
                    // Add to end (oldest first, newest last - like iOS)
                    currentMessages.add(message)
                    _uiState.value = _uiState.value.copy(messages = currentMessages)
                }
            }
        }
    }

    fun connectSocket(token: String) {
        savedToken = token
        chatRepository.connect(token)
        // Start periodic connection check (like iOS)
        chatRepository.startConnectionCheck(token)
    }

    fun disconnectSocket() {
        chatRepository.stopConnectionCheck()
        currentRoomId?.let { chatRepository.leaveRoom(it) }
        chatRepository.disconnect()
    }

    /**
     * 강제 재연결 (iOS forceReconnect와 동일)
     * 연결 시도 횟수를 리셋하고 다시 연결 시도
     */
    fun forceReconnect() {
        viewModelScope.launch {
            // Get token from cache or fetch new one (like iOS)
            val token = savedToken ?: authRepository.getAccessToken()
            if (token == null) {
                Log.w(TAG, "No token available for force reconnect")
                return@launch
            }

            savedToken = token
            Log.d(TAG, "Force reconnect initiated")
            chatRepository.forceReconnect(token)

            // Wait for connection (max 5 seconds, like iOS)
            repeat(50) {
                if (chatRepository.isConnected) {
                    Log.d(TAG, "Reconnected successfully")
                    // Rejoin room after reconnection
                    currentRoomId?.let { roomId ->
                        chatRepository.joinRoom(roomId)
                        Log.d(TAG, "Rejoined room: $roomId")
                    }
                    return@launch
                }
                delay(100)
            }
            Log.w(TAG, "Force reconnect timeout")
            _uiState.value = _uiState.value.copy(canReconnect = chatRepository.canReconnect)
        }
    }

    fun loadRoom(roomId: String) {
        currentRoomId = roomId
        _uiState.value = _uiState.value.copy(isLoading = true, messages = emptyList())

        viewModelScope.launch {
            // 1. Get token and connect socket first (like iOS)
            val token = authRepository.getAccessToken()
            if (token != null) {
                savedToken = token
                Log.d(TAG, "Connecting socket for room: $roomId")
                chatRepository.connect(token)

                // Wait for connection (max 5 seconds, like iOS)
                repeat(50) {
                    if (chatRepository.isConnected) {
                        Log.d(TAG, "Socket connected")
                        return@repeat
                    }
                    delay(100)
                }

                if (!chatRepository.isConnected) {
                    Log.w(TAG, "Socket connection timeout")
                }

                // Start periodic connection check
                chatRepository.startConnectionCheck(token)
            } else {
                Log.w(TAG, "No access token available for socket connection")
            }

            // 2. Load room details
            chatRepository.getChatRoom(roomId)
                .onSuccess { room ->
                    _uiState.value = _uiState.value.copy(room = room)
                }

            // 3. Load messages
            loadMessages(roomId)

            // 4. Join room via socket (if connected)
            if (chatRepository.isConnected) {
                chatRepository.joinRoom(roomId)
                Log.d(TAG, "Joined room: $roomId")
            }

            // 5. Mark as read
            chatRepository.markAsRead(roomId)
        }
    }

    private fun loadMessages(roomId: String, cursor: String? = null) {
        viewModelScope.launch {
            chatRepository.getMessages(roomId, cursor, limit = 30)
                .onSuccess { result ->
                    // Sort messages by createdAt ascending (oldest first, like iOS)
                    val sortedMessages = result.messages.sortedBy { it.createdAt }

                    val currentMessages = if (cursor == null) {
                        // Initial load: just use sorted messages
                        sortedMessages
                    } else {
                        // Pagination: older messages go at the beginning
                        sortedMessages + _uiState.value.messages
                    }

                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        messages = currentMessages,
                        hasMore = result.hasMore,
                        nextCursor = result.nextCursor,
                        error = null
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }

    fun loadMoreMessages() {
        val roomId = currentRoomId ?: return
        val cursor = _uiState.value.nextCursor ?: return

        if (_uiState.value.isLoading || !_uiState.value.hasMore) return

        _uiState.value = _uiState.value.copy(isLoading = true)
        loadMessages(roomId, cursor)
    }

    fun updateMessageInput(text: String) {
        _uiState.value = _uiState.value.copy(messageInput = text)

        // Send typing indicator
        currentRoomId?.let { roomId ->
            chatRepository.sendTyping(roomId, text.isNotEmpty())
        }
    }

    fun sendMessage() {
        val content = _uiState.value.messageInput.trim()
        val roomId = currentRoomId

        if (content.isBlank() || roomId == null) return

        _uiState.value = _uiState.value.copy(isSending = true, messageInput = "")

        viewModelScope.launch {
            // iOS와 동일: 소켓 연결 시 소켓으로만, 아니면 HTTP로만 전송
            if (chatRepository.isConnected) {
                // Send via socket for real-time (server will persist)
                chatRepository.sendMessageViaSocket(roomId, content)
                _uiState.value = _uiState.value.copy(isSending = false)
            } else {
                // Socket not connected, use REST API
                chatRepository.sendMessage(roomId, content, "TEXT")
                    .onSuccess {
                        _uiState.value = _uiState.value.copy(isSending = false)
                    }
                    .onFailure { exception ->
                        _uiState.value = _uiState.value.copy(
                            isSending = false,
                            error = exception.message
                        )
                    }
            }
        }
    }

    fun leaveRoom() {
        currentRoomId?.let { roomId ->
            chatRepository.leaveRoom(roomId)
        }
        currentRoomId = null
    }

    fun leaveChatRoom() {
        val roomId = currentRoomId ?: return

        viewModelScope.launch {
            chatRepository.leaveChatRoom(roomId)
                .onSuccess {
                    leaveRoom()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        error = exception.message
                    )
                }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    override fun onCleared() {
        super.onCleared()
        chatRepository.stopConnectionCheck()
        leaveRoom()
    }
}
