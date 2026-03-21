package com.parkgolf.app.presentation.feature.chat

import android.util.Log
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.data.remote.dto.chat.AiChatRequest
import com.parkgolf.app.domain.model.AiChatResponse
import com.parkgolf.app.domain.model.ActionType
import com.parkgolf.app.domain.model.ChatAction
import com.parkgolf.app.domain.model.ChatMessage
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.model.ConversationState
import com.parkgolf.app.domain.model.MessageType
import com.parkgolf.app.data.local.datastore.AuthPreferences
import com.parkgolf.app.domain.repository.AuthRepository
import com.parkgolf.app.domain.repository.ChatRepository
import com.parkgolf.app.domain.repository.PaymentRepository
import com.parkgolf.app.util.LocationManager
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

data class PendingPayment(
    val orderId: String,
    val orderName: String,
    val amount: Int,
    val type: String  // "single" | "split"
)

data class ChatUiState(
    val isLoading: Boolean = false,
    val room: ChatRoom? = null,
    val messages: List<ChatMessage> = emptyList(),
    val messageInput: String = "",
    val isConnected: Boolean = false,
    val isNatsConnected: Boolean = true,
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
    val aiConversationState: ConversationState = ConversationState.IDLE,
    val showWelcome: Boolean = false,
    val selectedClubId: String? = null,
    val selectedSlotId: String? = null,
    val aiMessageActions: Map<String, List<ChatAction>> = emptyMap(),
    val pendingPayment: PendingPayment? = null
) {
    val aiLoadingText: String
        get() = when (aiConversationState) {
            ConversationState.COLLECTING -> "검색 중..."
            ConversationState.CONFIRMING -> "예약 확인 중..."
            ConversationState.BOOKING -> "예약 처리 중..."
            ConversationState.SELECTING_MEMBERS -> "팀 편성 중..."
            ConversationState.SETTLING -> "정산 처리 중..."
            ConversationState.TEAM_COMPLETE -> "팀 예약 완료..."
            else -> "생각 중..."
        }
}

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val authRepository: AuthRepository,
    private val paymentRepository: PaymentRepository,
    private val locationManager: LocationManager,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private var currentRoomId: String? = null
    private var savedToken: String? = null

    private var typingClearJob: kotlinx.coroutines.Job? = null

    // Lifecycle observer for foreground/background detection
    private var lifecycleObserver: DefaultLifecycleObserver? = null

    init {
        observeConnectionState()
        observeNatsStatus()
        observeMessages()
        observeTyping()
        observeTokenRefresh()
        observeReconnectSignal()
        loadCurrentUser()
        recoverPendingPayment()
    }

    private fun recoverPendingPayment() {
        viewModelScope.launch {
            val saved = authPreferences.getPendingPayment()
            if (saved != null && _uiState.value.pendingPayment == null) {
                _uiState.value = _uiState.value.copy(
                    pendingPayment = PendingPayment(
                        orderId = saved.orderId,
                        orderName = saved.orderName,
                        amount = saved.amount,
                        type = saved.type
                    )
                )
            }
        }
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
                val wasDisconnected = !_uiState.value.isConnected
                _uiState.value = _uiState.value.copy(isConnected = isConnected)
                // 연결 성공 시 방 참여 (Web의 onConnect 콜백과 동일 패턴)
                if (isConnected && wasDisconnected) {
                    currentRoomId?.let { roomId ->
                        chatRepository.joinRoom(roomId)
                        Log.d(TAG, "Joined room on socket connected: $roomId")
                    }
                }
            }
        }
    }

    private fun observeNatsStatus() {
        viewModelScope.launch {
            chatRepository.natsConnectionState.collect { isNatsConnected ->
                val wasDisconnected = !_uiState.value.isNatsConnected
                _uiState.value = _uiState.value.copy(isNatsConnected = isNatsConnected)
                // NATS 복구 시 방 재참여 + 메시지 갱신
                if (isNatsConnected && wasDisconnected) {
                    currentRoomId?.let { roomId ->
                        chatRepository.joinRoom(roomId)
                        Log.d(TAG, "Rejoined room after NATS recovery: $roomId")
                        loadMessages(roomId)
                    }
                }
            }
        }
    }

    private fun observeTokenRefresh() {
        viewModelScope.launch {
            chatRepository.tokenRefreshNeeded.collect {
                Log.d(TAG, "Refreshing REST API token (socket stays connected)")
                authRepository.refreshToken()
                    .onSuccess {
                        val newToken = authRepository.getAccessToken()
                        if (newToken != null) {
                            savedToken = newToken
                        }
                    }
                    .onFailure { error ->
                        Log.e(TAG, "Token refresh failed: ${error.message}")
                    }
            }
        }
    }

    private fun observeReconnectSignal() {
        viewModelScope.launch {
            chatRepository.reconnectWithNewToken.collect {
                Log.d(TAG, "Reconnect signal received, refreshing token then reconnecting")
                // 1. 토큰 갱신 (만료된 토큰으로 재연결 방지)
                authRepository.refreshToken()
                    .onFailure { Log.w(TAG, "Token refresh failed, using cached token") }

                // 2. 최신 토큰으로 재연결
                // joinRoom은 observeConnectionState()에서 처리 (중복 호출 방지)
                val freshToken = authRepository.getAccessToken()
                if (freshToken != null) {
                    savedToken = freshToken
                    chatRepository.forceReconnect(freshToken)
                } else {
                    Log.e(TAG, "No token available for reconnect")
                }
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
                    // metadata에서 actions 파싱 → aiMessageActions 맵에 등록
                    if (!message.metadata.isNullOrEmpty()) {
                        try {
                            val meta = org.json.JSONObject(message.metadata)
                            val actionsArray = meta.optJSONArray("actions")
                            if (actionsArray != null) {
                                val actions = parseActionsFromJson(actionsArray)
                                if (actions.isNotEmpty()) {
                                    val updated = _uiState.value.aiMessageActions.toMutableMap()
                                    updated[message.id] = actions
                                    _uiState.value = _uiState.value.copy(aiMessageActions = updated)
                                }
                            }
                        } catch (_: Exception) { /* metadata 파싱 실패 시 그냥 표시 */ }
                    }

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

    /** metadata JSON의 actions 배열을 ChatAction 리스트로 변환 */
    private fun parseActionsFromJson(actionsArray: org.json.JSONArray): List<ChatAction> {
        val result = mutableListOf<ChatAction>()
        for (i in 0 until actionsArray.length()) {
            val actionObj = actionsArray.optJSONObject(i) ?: continue
            val typeStr = actionObj.optString("type") ?: continue
            val actionType = ActionType.fromValue(typeStr) ?: continue
            val dataObj = actionObj.optJSONObject("data")
            val dataMap = if (dataObj != null) jsonObjectToMap(dataObj) else emptyMap()
            result.add(ChatAction(type = actionType, data = dataMap))
        }
        return result
    }

    /** org.json.JSONObject → Map<String, Any?> 재귀 변환 */
    private fun jsonObjectToMap(obj: org.json.JSONObject): Map<String, Any?> {
        val map = mutableMapOf<String, Any?>()
        for (key in obj.keys()) {
            map[key] = jsonValueToAny(obj.get(key))
        }
        return map
    }

    private fun jsonValueToAny(value: Any?): Any? {
        return when (value) {
            is org.json.JSONObject -> jsonObjectToMap(value)
            is org.json.JSONArray -> (0 until value.length()).map { jsonValueToAny(value.get(it)) }
            org.json.JSONObject.NULL -> null
            else -> value
        }
    }

    fun connectSocket(token: String) {
        savedToken = token
        chatRepository.connect(token)
        // Start periodic connection check (like iOS)
        chatRepository.startConnectionCheck()
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
            // 토큰 갱신 후 재연결 (만료된 토큰으로 연결 시도 방지)
            authRepository.refreshToken()
                .onFailure { Log.w(TAG, "Token refresh failed on force reconnect: ${it.message}") }

            val token = authRepository.getAccessToken()
            if (token == null) {
                Log.w(TAG, "No token available for force reconnect")
                return@launch
            }

            savedToken = token
            Log.d(TAG, "Force reconnect initiated with fresh token")
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
            // 1. 토큰 갱신 후 소켓 연결 (만료 토큰으로 연결 시도 방지)
            authRepository.refreshToken()
                .onFailure { Log.w(TAG, "Token pre-refresh failed, using cached token") }
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
                chatRepository.startConnectionCheck()
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

            // 4. joinRoom은 observeConnectionState()에서 연결 성공 시 자동 호출 (중복 방지)

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
        val wasOff = !_uiState.value.isAiMode
        if (wasOff) {
            _uiState.value = _uiState.value.copy(
                isAiMode = true,
                showWelcome = true,
                selectedClubId = null,
                selectedSlotId = null
            )
        } else {
            _uiState.value = _uiState.value.copy(
                isAiMode = false,
                showWelcome = false,
                aiConversationId = null,
                aiConversationState = ConversationState.IDLE,
                selectedClubId = null,
                selectedSlotId = null
            )
        }
    }

    fun selectClub(clubId: String) {
        _uiState.value = _uiState.value.copy(selectedClubId = clubId)
    }

    fun selectSlot(slotId: String) {
        _uiState.value = _uiState.value.copy(selectedSlotId = slotId)
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
        addUserMessage(roomId, content)

        viewModelScope.launch {
            val location = locationManager.getCurrentLocation()
            chatRepository.sendAiMessage(
                roomId = roomId,
                message = content,
                conversationId = _uiState.value.aiConversationId,
                latitude = location?.latitude,
                longitude = location?.longitude
            ).onSuccess { response ->
                handleAiResponse(roomId, response)
            }.onFailure {
                _uiState.value = _uiState.value.copy(
                    isAiLoading = false,
                    messageInput = content,
                    error = "AI 응답에 실패했습니다."
                )
            }
        }
    }

    /**
     * 구조화된 AI 요청 전송 (카드 인터랙션용)
     * Web의 handleAiFollowUp 패턴과 동일
     */
    fun sendAiFollowUp(request: AiChatRequest) {
        val roomId = currentRoomId ?: return

        addUserMessage(roomId, request.message)

        viewModelScope.launch {
            val location = locationManager.getCurrentLocation()
            val fullRequest = request.copy(
                conversationId = request.conversationId ?: _uiState.value.aiConversationId,
                chatRoomId = request.chatRoomId ?: currentRoomId,
                latitude = request.latitude ?: location?.latitude,
                longitude = request.longitude ?: location?.longitude
            )
            chatRepository.sendAiRequest(roomId, fullRequest)
                .onSuccess { response ->
                    handleAiResponse(roomId, response)
                }
                .onFailure {
                    _uiState.value = _uiState.value.copy(
                        isAiLoading = false,
                        error = "AI 응답에 실패했습니다."
                    )
                }
        }
    }

    private fun addUserMessage(roomId: String, content: String) {
        val userMsg = ChatMessage(
            id = UUID.randomUUID().toString(),
            roomId = roomId,
            senderId = _uiState.value.currentUserId ?: "",
            senderName = "나",
            content = content,
            messageType = MessageType.AI_USER,
            createdAt = LocalDateTime.now()
        )
        _uiState.value = _uiState.value.copy(
            messages = _uiState.value.messages + userMsg,
            isAiLoading = true,
            showWelcome = false
        )
    }

    private fun handleAiResponse(roomId: String, response: AiChatResponse) {
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
            aiConversationState = response.state,
            aiMessageActions = updatedActions
        )
    }

    fun getActionsForMessage(messageId: String): List<ChatAction> {
        // 1. AI 응답 캐시에서 조회
        _uiState.value.aiMessageActions[messageId]?.let { return it }

        // 2. 캐시에 없으면 메시지 metadata에서 파싱 (브로드캐스트/DB 메시지용)
        val message = _uiState.value.messages.find { it.id == messageId }
        if (!message?.metadata.isNullOrEmpty()) {
            try {
                val meta = org.json.JSONObject(message!!.metadata!!)
                val actionsArray = meta.optJSONArray("actions")
                if (actionsArray != null) {
                    val actions = parseActionsFromJson(actionsArray)
                    if (actions.isNotEmpty()) {
                        // 캐시에 등록하여 재파싱 방지
                        val updated = _uiState.value.aiMessageActions.toMutableMap()
                        updated[messageId] = actions
                        _uiState.value = _uiState.value.copy(aiMessageActions = updated)
                        return actions
                    }
                }
            } catch (_: Exception) { /* 파싱 실패 시 빈 리스트 */ }
        }
        return emptyList()
    }

    // Payment

    fun requestPayment(orderId: String, orderName: String, amount: Int, type: String = "single") {
        _uiState.value = _uiState.value.copy(
            pendingPayment = PendingPayment(orderId, orderName, amount, type)
        )
        // DataStore에 영속화 (프로세스 kill 대비)
        viewModelScope.launch {
            authPreferences.savePendingPayment(orderId, orderName, amount, type)
        }
    }

    fun handlePaymentResult(paymentKey: String, orderId: String, amount: Int) {
        val type = _uiState.value.pendingPayment?.type ?: "single"
        _uiState.value = _uiState.value.copy(pendingPayment = null)
        viewModelScope.launch { authPreferences.clearPendingPayment() }

        viewModelScope.launch {
            val confirmResult = if (type == "split") {
                paymentRepository.confirmSplitPayment(paymentKey, orderId, amount)
            } else {
                paymentRepository.confirmPayment(paymentKey, orderId, amount)
            }

            confirmResult
                .onSuccess {
                    if (type == "split") {
                        sendAiFollowUp(AiChatRequest(
                            message = "결제 완료",
                            splitPaymentComplete = true,
                            splitOrderId = orderId
                        ))
                    } else {
                        sendAiFollowUp(AiChatRequest(
                            message = "결제 완료",
                            paymentComplete = true,
                            paymentSuccess = true
                        ))
                    }
                }
                .onFailure { error ->
                    Log.e(TAG, "Payment confirm failed: ${error.message}, checking status...")
                    // Fallback: 서버 상태 확인
                    paymentRepository.getPaymentByOrderId(orderId)
                        .onSuccess { status ->
                            if (status.status == "DONE" || status.status == "PAID") {
                                if (type == "split") {
                                    sendAiFollowUp(AiChatRequest(
                                        message = "결제 완료",
                                        splitPaymentComplete = true,
                                        splitOrderId = orderId
                                    ))
                                } else {
                                    sendAiFollowUp(AiChatRequest(
                                        message = "결제 완료",
                                        paymentComplete = true,
                                        paymentSuccess = true
                                    ))
                                }
                            } else {
                                notifyPaymentFailed(type, orderId)
                            }
                        }
                        .onFailure {
                            notifyPaymentFailed(type, orderId)
                        }
                }
        }
    }

    fun handlePaymentCancelled() {
        val type = _uiState.value.pendingPayment?.type ?: "single"
        val orderId = _uiState.value.pendingPayment?.orderId ?: ""
        _uiState.value = _uiState.value.copy(pendingPayment = null)
        viewModelScope.launch { authPreferences.clearPendingPayment() }
        notifyPaymentFailed(type, orderId)
    }

    private fun notifyPaymentFailed(type: String, orderId: String) {
        if (type == "split") {
            sendAiFollowUp(AiChatRequest(
                message = "결제 실패",
                splitPaymentComplete = true,
                splitOrderId = orderId
            ))
        } else {
            sendAiFollowUp(AiChatRequest(
                message = "결제 취소",
                paymentComplete = true,
                paymentSuccess = false
            ))
        }
    }

    /**
     * 라이프사이클 옵저버 등록 — 포그라운드 복귀 시 재연결 처리
     */
    fun observeAppLifecycle(lifecycleOwner: LifecycleOwner) {
        // 이미 등록된 옵저버가 있으면 제거
        lifecycleObserver?.let { lifecycleOwner.lifecycle.removeObserver(it) }

        val observer = object : DefaultLifecycleObserver {
            override fun onResume(owner: LifecycleOwner) {
                Log.d(TAG, "App resumed, checking connection")
                chatRepository.handleAppForeground()
                // 메시지 갭 복구
                currentRoomId?.let { loadMessages(it) }
            }
        }
        lifecycleObserver = observer
        lifecycleOwner.lifecycle.addObserver(observer)
    }

    override fun onCleared() {
        super.onCleared()
        disconnectSocket()  // 소켓 완전 정리 (isConnecting 리셋 포함)
    }
}
