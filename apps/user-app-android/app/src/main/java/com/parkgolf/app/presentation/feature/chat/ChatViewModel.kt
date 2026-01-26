package com.parkgolf.app.presentation.feature.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.ChatMessage
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.repository.AuthRepository
import com.parkgolf.app.domain.repository.ChatRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

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
        val token = savedToken ?: return
        chatRepository.forceReconnect(token)
        // Rejoin room after reconnection
        currentRoomId?.let { roomId ->
            chatRepository.joinRoom(roomId)
        }
        _uiState.value = _uiState.value.copy(canReconnect = true)
    }

    fun loadRoom(roomId: String) {
        currentRoomId = roomId
        _uiState.value = _uiState.value.copy(isLoading = true, messages = emptyList())

        viewModelScope.launch {
            // Load room details
            chatRepository.getChatRoom(roomId)
                .onSuccess { room ->
                    _uiState.value = _uiState.value.copy(room = room)
                }

            // Load messages
            loadMessages(roomId)

            // Join room via socket
            chatRepository.joinRoom(roomId)

            // Mark as read
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

        // Send via socket for real-time
        chatRepository.sendMessageViaSocket(roomId, content)

        // Also send via HTTP for persistence
        viewModelScope.launch {
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
