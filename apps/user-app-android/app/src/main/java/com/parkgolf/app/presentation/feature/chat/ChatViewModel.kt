package com.parkgolf.app.presentation.feature.chat

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.AiChatResponse
import com.parkgolf.app.domain.model.ChatAction
import com.parkgolf.app.domain.model.ChatMessage
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.model.MessageType
import com.parkgolf.app.domain.repository.AuthRepository
import com.parkgolf.app.domain.repository.ChatRepository
import java.time.LocalDateTime
import java.util.UUID
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val TAG = "ChatViewModel"
private const val TYPING_CLEAR_DELAY_MS = 3000L
private const val SOCKET_CONNECT_RETRIES = 50
private const val SOCKET_RETRY_DELAY_MS = 100L
private const val MESSAGES_PAGE_LIMIT = 30

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
    val canReconnect: Boolean = true,
    val typingUserName: String? = null,
    val isAiMode: Boolean = false,
    val isAiLoading: Boolean = false,
    val aiConversationId: String? = null,
    val aiMessageActions: Map<String, List<ChatAction>> = emptyMap()
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

    private var typingClearJob: kotlinx.coroutines.Job? = null

    init {
        observeConnectionState()
        observeMessages()
        observeTyping()
        observeTokenRefresh()
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

    private fun observeTokenRefresh() {
        viewModelScope.launch {
            chatRepository.tokenRefreshNeeded.collect {
                // Server session stays alive — just refresh REST API token in background
                Log.d(TAG, "Token refresh needed, refreshing REST API token...")
                authRepository.refreshToken()
            }
        }
    }

    private fun observeTyping() {
        viewModelScope.launch {
            chatRepository.typingFlow.collect { event ->
                if (event.roomId == currentRoomId && event.userId != _uiState.value.currentUserId) {
                    if (event.isTyping) {
                        _uiState.value = _uiState.value.copy(typingUserName = event.userName)
                        // Auto-clear after 3 seconds
                        typingClearJob?.cancel()
                        typingClearJob = viewModelScope.launch {
                            delay(TYPING_CLEAR_DELAY_MS)
                            _uiState.value = _uiState.value.copy(typingUserName = null)
                        }
                    } else {
                        _uiState.value = _uiState.value.copy(typingUserName = null)
                        typingClearJob?.cancel()
                    }
                }
            }
        }
    }

    private fun observeMessages() {
        viewModelScope.launch {
            chatRepository.messageFlow.collect { message ->
                if (message.roomId == currentRoomId) {
                    val currentMessages = _uiState.value.messages
                    // Avoid duplicates (like iOS)
                    if (!currentMessages.any { it.id == message.id }) {
                        val updatedMessages = currentMessages.toMutableList()
                        updatedMessages.add(message)
                        _uiState.value = _uiState.value.copy(messages = updatedMessages)
                    }
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
            repeat(SOCKET_CONNECT_RETRIES) {
                if (chatRepository.isConnected) {
                    Log.d(TAG, "Reconnected successfully")
                    // Rejoin room after reconnection
                    currentRoomId?.let { roomId ->
                        chatRepository.joinRoom(roomId)
                        Log.d(TAG, "Rejoined room: $roomId")
                    }
                    return@launch
                }
                delay(SOCKET_RETRY_DELAY_MS)
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
                repeat(SOCKET_CONNECT_RETRIES) {
                    if (chatRepository.isConnected) {
                        Log.d(TAG, "Socket connected")
                        return@repeat
                    }
                    delay(SOCKET_RETRY_DELAY_MS)
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
            chatRepository.getMessages(roomId, cursor, limit = MESSAGES_PAGE_LIMIT)
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

    fun inviteMembers(userIds: List<String>) {
        val roomId = currentRoomId ?: return

        viewModelScope.launch {
            chatRepository.inviteMembers(roomId, userIds)
                .onSuccess {
                    // Reload room to get updated participants
                    chatRepository.getChatRoom(roomId)
                        .onSuccess { room ->
                            _uiState.value = _uiState.value.copy(room = room)
                        }
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        error = exception.message ?: "멤버 초대 실패"
                    )
                }
        }
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

    // AI Mode

    fun toggleAiMode() {
        _uiState.value = _uiState.value.copy(
            isAiMode = !_uiState.value.isAiMode
        )
    }

    fun sendAiMessage(message: String? = null) {
        val content = (message ?: _uiState.value.messageInput).trim()
        val roomId = currentRoomId

        if (content.isBlank() || roomId == null) return

        // Clear input if using message input
        if (message == null) {
            _uiState.value = _uiState.value.copy(messageInput = "")
        }

        // Add user message locally
        val userMsg = ChatMessage(
            id = UUID.randomUUID().toString(),
            roomId = roomId,
            senderId = _uiState.value.currentUserId ?: "",
            senderName = "나",
            content = content,
            messageType = MessageType.TEXT,
            createdAt = LocalDateTime.now()
        )
        _uiState.value = _uiState.value.copy(
            messages = _uiState.value.messages + userMsg,
            isAiLoading = true
        )

        viewModelScope.launch {
            chatRepository.sendAiMessage(
                roomId = roomId,
                message = content,
                conversationId = _uiState.value.aiConversationId
            ).onSuccess { response ->
                val aiMsg = ChatMessage(
                    id = UUID.randomUUID().toString(),
                    roomId = roomId,
                    senderId = "ai-assistant",
                    senderName = "AI 예약 도우미",
                    content = response.message,
                    messageType = MessageType.AI_ASSISTANT,
                    createdAt = LocalDateTime.now()
                )
                val updatedActions = _uiState.value.aiMessageActions.toMutableMap()
                if (response.actions.isNotEmpty()) {
                    updatedActions[aiMsg.id] = response.actions
                }
                _uiState.value = _uiState.value.copy(
                    messages = _uiState.value.messages + aiMsg,
                    isAiLoading = false,
                    aiConversationId = response.conversationId,
                    aiMessageActions = updatedActions
                )
            }.onFailure { exception ->
                _uiState.value = _uiState.value.copy(
                    isAiLoading = false,
                    messageInput = content, // 입력 복원 (Web 패턴)
                    error = "AI 응답에 실패했습니다."
                )
            }
        }
    }

    fun getActionsForMessage(messageId: String): List<ChatAction> {
        return _uiState.value.aiMessageActions[messageId] ?: emptyList()
    }

    override fun onCleared() {
        super.onCleared()
        chatRepository.stopConnectionCheck()
        leaveRoom()
    }
}
