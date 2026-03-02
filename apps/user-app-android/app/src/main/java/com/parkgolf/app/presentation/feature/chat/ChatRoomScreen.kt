package com.parkgolf.app.presentation.feature.chat

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.LifecycleOwner
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.presentation.feature.payment.PaymentActivity
import com.parkgolf.app.data.remote.dto.chat.AiChatRequest
import com.parkgolf.app.data.remote.dto.chat.TeamDto
import com.parkgolf.app.presentation.feature.chat.components.cards.TeamConfirmData
import com.parkgolf.app.domain.model.ChatMessage
import com.parkgolf.app.domain.model.Friend
import com.parkgolf.app.domain.model.MessageType
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GlassTextField
import com.parkgolf.app.presentation.feature.chat.components.AiButton
import com.parkgolf.app.presentation.feature.chat.components.AiMessageBubble
import com.parkgolf.app.presentation.feature.chat.components.AiUserMessageBubble
import com.parkgolf.app.presentation.feature.chat.components.AiWelcomeCard
import com.parkgolf.app.presentation.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.format.DateTimeFormatter
import javax.inject.Inject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatRoomScreen(
    roomId: String,
    onNavigateBack: () -> Unit,
    viewModel: ChatViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    var showMenu by remember { mutableStateOf(false) }
    var showInviteDialog by remember { mutableStateOf(false) }
    var showParticipantsDialog by remember { mutableStateOf(false) }
    var showLeaveDialog by remember { mutableStateOf(false) }

    val context = LocalContext.current
    val lifecycleOwner = context as LifecycleOwner

    // Toss Payment Activity Result launcher
    val paymentLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        when (result.resultCode) {
            Activity.RESULT_OK -> {
                val data = result.data
                val paymentKey = data?.getStringExtra(PaymentActivity.EXTRA_PAYMENT_KEY) ?: ""
                val resultOrderId = data?.getStringExtra(PaymentActivity.EXTRA_ORDER_ID) ?: ""
                val resultAmount = data?.getIntExtra(PaymentActivity.EXTRA_AMOUNT, 0) ?: 0
                viewModel.handlePaymentResult(paymentKey, resultOrderId, resultAmount)
            }
            else -> {
                viewModel.handlePaymentCancelled()
            }
        }
    }

    // pendingPayment 감시 → PaymentActivity 실행
    LaunchedEffect(uiState.pendingPayment) {
        val pending = uiState.pendingPayment ?: return@LaunchedEffect
        val intent = PaymentActivity.createIntent(
            context = context,
            orderId = pending.orderId,
            orderName = pending.orderName,
            amount = pending.amount
        )
        paymentLauncher.launch(intent)
    }

    LaunchedEffect(roomId) {
        viewModel.loadRoom(roomId)
        viewModel.observeAppLifecycle(lifecycleOwner)
    }

    // Scroll to bottom when new message arrives (newest at bottom)
    LaunchedEffect(uiState.messages.size) {
        if (uiState.messages.isNotEmpty()) {
            listState.animateScrollToItem(uiState.messages.lastIndex)
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            viewModel.leaveRoom()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = uiState.room?.displayName(uiState.currentUserId ?: "") ?: "채팅",
                        style = MaterialTheme.typography.titleMedium
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "뒤로")
                    }
                },
                actions = {
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "더보기")
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("참여자 목록") },
                                onClick = {
                                    showParticipantsDialog = true
                                    showMenu = false
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Group, contentDescription = null)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("친구 초대") },
                                onClick = {
                                    showInviteDialog = true
                                    showMenu = false
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.PersonAdd, contentDescription = null)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("나가기", color = ParkError) },
                                onClick = {
                                    showLeaveDialog = true
                                    showMenu = false
                                },
                                leadingIcon = {
                                    Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, tint = ParkError)
                                }
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = ParkPrimary,
                    titleContentColor = ParkOnPrimary,
                    navigationIconContentColor = ParkOnPrimary,
                    actionIconContentColor = ParkOnPrimary
                )
            )
        },
        bottomBar = {
            ChatInputBar(
                value = uiState.messageInput,
                onValueChange = { viewModel.updateMessageInput(it) },
                onSend = {
                    if (uiState.isAiMode) {
                        viewModel.sendAiMessage()
                    } else {
                        viewModel.sendMessage()
                    }
                },
                isSending = uiState.isSending,
                isAiMode = uiState.isAiMode,
                isAiLoading = uiState.isAiLoading,
                enabled = uiState.isConnected || uiState.isAiMode,
                onToggleAi = { viewModel.toggleAiMode() }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(GradientStart, GradientEnd)
                    )
                )
                .padding(paddingValues)
        ) {
            // Connection status banner (like iOS)
            if (!uiState.isConnected) {
                ConnectionStatusBanner(
                    canReconnect = uiState.canReconnect,
                    onReconnect = { viewModel.forceReconnect() }
                )
            }

            // NATS disconnected warning banner
            if (uiState.isConnected && !uiState.isNatsConnected) {
                NatsWarningBanner()
            }

            // Message list
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                // Deduplicate messages by ID
                val dedupedMessages = remember(uiState.messages) {
                    uiState.messages
                        .distinctBy { it.id }
                        .sortedBy { it.createdAt }
                }

                if (uiState.isLoading && uiState.messages.isEmpty()) {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = ParkOnPrimary
                    )
                } else {
                    // 스크롤 상단 도달 시 이전 메시지 자동 로드
                    val shouldLoadMore by remember {
                        derivedStateOf {
                            val firstVisibleItem = listState.firstVisibleItemIndex
                            firstVisibleItem <= 1 && uiState.hasMore && !uiState.isLoading
                        }
                    }
                    LaunchedEffect(shouldLoadMore) {
                        if (shouldLoadMore) {
                            viewModel.loadMoreMessages()
                        }
                    }

                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Loading indicator at top
                        if (uiState.hasMore && uiState.isLoading) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(24.dp),
                                        color = ParkOnPrimary
                                    )
                                }
                            }
                        }

                        // AI 웰컴 카드
                        if (uiState.showWelcome && uiState.isAiMode) {
                            item {
                                AiWelcomeCard(
                                    onQuickAction = { message ->
                                        viewModel.sendAiMessage(message)
                                    }
                                )
                            }
                        }

                        // Empty state (non-AI mode)
                        if (uiState.messages.isEmpty() && !uiState.isAiMode && !uiState.isLoading) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 48.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "대화를 시작해보세요!",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = ParkOnPrimary.copy(alpha = 0.5f)
                                    )
                                }
                            }
                        }

                        // Messages (oldest first, newest at bottom) — deduplicated by ID
                        items(dedupedMessages.size) { index ->
                            val message = dedupedMessages[index]
                            when (message.messageType) {
                                MessageType.AI_ASSISTANT -> {
                                    // 브로드캐스트 AI 메시지: targetUserIds 필터링
                                    if (!message.metadata.isNullOrEmpty()) {
                                        try {
                                            val meta = org.json.JSONObject(message.metadata)
                                            val targetIds = meta.optJSONArray("targetUserIds")
                                            if (targetIds != null) {
                                                val myId = uiState.currentUserId?.toIntOrNull() ?: -1
                                                var isTarget = false
                                                for (i in 0 until targetIds.length()) {
                                                    if (targetIds.optInt(i) == myId) { isTarget = true; break }
                                                }
                                                if (!isTarget) return@items // 내가 대상이 아니면 렌더링하지 않음
                                            }
                                        } catch (_: Exception) { /* metadata 파싱 실패 시 그냥 표시 */ }
                                    }

                                    // 연속 AI 메시지 그룹핑: 이전 메시지도 AI면 라벨 숨김
                                    val prevIsAi = index > 0 && dedupedMessages[index - 1].messageType == MessageType.AI_ASSISTANT

                                    AiMessageBubble(
                                        content = message.content,
                                        actions = viewModel.getActionsForMessage(message.id),
                                        createdAt = message.createdAt,
                                        showLabel = !prevIsAi,
                                        currentUserId = uiState.currentUserId?.toIntOrNull(),
                                        onClubSelect = { clubId, clubName ->
                                            viewModel.selectClub(clubId)
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = "$clubName 선택",
                                                selectedClubId = clubId,
                                                selectedClubName = clubName
                                            ))
                                        },
                                        onSlotSelect = { slotId, time, price, clubId, clubName, courseName ->
                                            viewModel.selectSlot(slotId)
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = "$time 선택",
                                                selectedSlotId = slotId,
                                                selectedSlotTime = time,
                                                selectedSlotPrice = price,
                                                selectedClubId = clubId,
                                                selectedClubName = clubName,
                                                selectedCourseName = courseName
                                            ))
                                        },
                                        onConfirmBooking = { paymentMethod ->
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = if (paymentMethod == "card") "카드결제로 예약 확인" else "예약 확인",
                                                confirmBooking = true,
                                                paymentMethod = paymentMethod
                                            ))
                                        },
                                        onCancelBooking = {
                                            viewModel.selectSlot("")
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = "취소",
                                                cancelBooking = true
                                            ))
                                        },
                                        onPaymentComplete = { success ->
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = if (success) "결제 완료" else "결제 취소",
                                                paymentComplete = true,
                                                paymentSuccess = success
                                            ))
                                        },
                                        onRequestPayment = { orderId, orderName, amount ->
                                            viewModel.requestPayment(orderId, orderName, amount, "single")
                                        },
                                        onConfirmGroup = { paymentMethod ->
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = if (paymentMethod == "dutchpay") "더치페이로 예약" else "현장결제로 예약",
                                                confirmGroupBooking = true,
                                                paymentMethod = paymentMethod
                                            ))
                                        },
                                        onCancelGroup = {
                                            viewModel.selectSlot("")
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = "그룹 예약 취소",
                                                cancelBooking = true
                                            ))
                                        },
                                        onTeamConfirm = { teamConfirmData: List<TeamConfirmData> ->
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = "팀 편성 확정",
                                                teams = teamConfirmData.map { t ->
                                                    TeamDto(
                                                        teamNumber = t.teamNumber,
                                                        slotId = t.slotId,
                                                        members = t.members
                                                    )
                                                },
                                                confirmGroupBooking = true
                                            ))
                                        },
                                        onSplitPaymentComplete = { success, orderId ->
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = if (success) "결제 완료" else "결제 실패",
                                                splitPaymentComplete = true,
                                                splitOrderId = orderId
                                            ))
                                        },
                                        onRequestSplitPayment = { orderId, amount ->
                                            viewModel.requestPayment(orderId, "더치페이 결제", amount, "split")
                                        },
                                        onNextTeam = {
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = "다음 팀 예약",
                                                nextTeam = true
                                            ))
                                        },
                                        onFinish = {
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = "예약 종료",
                                                finishGroup = true
                                            ))
                                        },
                                        onSendReminder = {
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = "리마인더 전송",
                                                sendReminder = true
                                            ))
                                        },
                                        onRefresh = {
                                            viewModel.sendAiFollowUp(AiChatRequest(
                                                message = "정산 현황 확인"
                                            ))
                                        },
                                        selectedClubId = uiState.selectedClubId,
                                        selectedSlotId = uiState.selectedSlotId
                                    )
                                }
                                MessageType.AI_USER -> {
                                    AiUserMessageBubble(
                                        content = message.content,
                                        createdAt = message.createdAt
                                    )
                                }
                                else -> {
                                    val isOwnMessage = message.senderId == uiState.currentUserId
                                    ChatMessageBubble(
                                        message = message,
                                        isOwnMessage = isOwnMessage
                                    )
                                }
                            }
                        }

                        // AI loading indicator
                        if (uiState.isAiLoading) {
                            item {
                                AiTypingIndicator(loadingText = uiState.aiLoadingText)
                            }
                        }
                    }
                }

                // Typing indicator
                uiState.typingUserName?.let { name ->
                    TypingIndicator(
                        userName = name,
                        modifier = Modifier.align(Alignment.BottomStart)
                    )
                }

                // Error Snackbar
                uiState.error?.let { error ->
                    Snackbar(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(16.dp),
                        action = {
                            TextButton(onClick = { viewModel.clearError() }) {
                                Text("확인")
                            }
                        }
                    ) {
                        Text(error)
                    }
                }
            }
        }
    }

    // Participants Dialog
    if (showParticipantsDialog) {
        ParticipantsDialog(
            participants = uiState.room?.participants ?: emptyList(),
            currentUserId = uiState.currentUserId ?: "",
            onDismiss = { showParticipantsDialog = false }
        )
    }

    // Leave confirmation dialog
    if (showLeaveDialog) {
        AlertDialog(
            onDismissRequest = { showLeaveDialog = false },
            containerColor = GradientStart,
            title = {
                Text("채팅방 나가기", color = ParkOnPrimary, fontWeight = FontWeight.Bold)
            },
            text = {
                Text(
                    "채팅방을 나가시겠습니까?",
                    color = ParkOnPrimary.copy(alpha = 0.7f)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showLeaveDialog = false
                        viewModel.leaveChatRoom()
                        onNavigateBack()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ParkError)
                ) {
                    Text("나가기")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLeaveDialog = false }) {
                    Text("취소", color = ParkOnPrimary.copy(alpha = 0.7f))
                }
            }
        )
    }

    // Invite Friends Dialog
    if (showInviteDialog) {
        InviteFriendsDialog(
            existingParticipantUserIds = uiState.room?.participants?.map { it.userId } ?: emptyList(),
            onDismiss = { showInviteDialog = false },
            onInvite = { userIds ->
                viewModel.inviteMembers(userIds)
                showInviteDialog = false
            }
        )
    }
}

/**
 * 연결 상태 배너 (크로스 플랫폼 통일 디자인)
 */
@Composable
private fun ConnectionStatusBanner(
    canReconnect: Boolean,
    onReconnect: () -> Unit
) {
    Surface(
        color = Color(0xFFF59E0B).copy(alpha = 0.9f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.WifiOff,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "연결 끊김",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White
                )
            }

            if (canReconnect) {
                TextButton(
                    onClick = onReconnect,
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = Color.White
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "재연결",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}

/**
 * NATS 연결 불안정 경고 배너
 */
@Composable
private fun NatsWarningBanner() {
    Surface(
        color = Color(0xFFEAB308).copy(alpha = 0.9f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "서버 내부 연결 불안정 — 메시지 전송이 지연될 수 있습니다",
                style = MaterialTheme.typography.bodySmall,
                color = Color.White
            )
        }
    }
}

/**
 * 타이핑 인디케이터
 */
@Composable
private fun TypingIndicator(
    userName: String,
    modifier: Modifier = Modifier
) {
    Text(
        text = "${userName}님이 입력 중...",
        style = MaterialTheme.typography.bodySmall,
        color = ParkOnPrimary.copy(alpha = 0.6f),
        modifier = modifier
            .padding(horizontal = 16.dp, vertical = 4.dp)
    )
}

@Composable
private fun ChatMessageBubble(
    message: ChatMessage,
    isOwnMessage: Boolean
) {
    val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isOwnMessage) Arrangement.End else Arrangement.Start
    ) {
        Column(
            horizontalAlignment = if (isOwnMessage) Alignment.End else Alignment.Start
        ) {
            if (!isOwnMessage) {
                Text(
                    text = message.senderName,
                    style = MaterialTheme.typography.labelSmall,
                    color = ParkOnPrimary.copy(alpha = 0.7f),
                    modifier = Modifier.padding(start = 8.dp, bottom = 2.dp)
                )
            }

            Surface(
                shape = RoundedCornerShape(
                    topStart = 16.dp,
                    topEnd = 16.dp,
                    bottomStart = if (isOwnMessage) 16.dp else 4.dp,
                    bottomEnd = if (isOwnMessage) 4.dp else 16.dp
                ),
                color = if (isOwnMessage) ParkPrimary else GlassCard
            ) {
                Column(
                    modifier = Modifier.padding(12.dp)
                ) {
                    Text(
                        text = message.content,
                        style = MaterialTheme.typography.bodyMedium,
                        color = ParkOnPrimary
                    )
                }
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.padding(
                    start = if (isOwnMessage) 0.dp else 8.dp,
                    end = if (isOwnMessage) 8.dp else 0.dp,
                    top = 2.dp
                )
            ) {
                if (isOwnMessage && !message.readBy.isNullOrEmpty() && message.readBy.size > 1) {
                    Text(
                        text = "읽음",
                        style = MaterialTheme.typography.labelSmall,
                        color = ParkPrimary.copy(alpha = 0.8f)
                    )
                }
                Text(
                    text = message.createdAt.format(timeFormatter),
                    style = MaterialTheme.typography.labelSmall,
                    color = ParkOnPrimary.copy(alpha = 0.5f)
                )
            }
        }

        if (isOwnMessage) {
            Spacer(modifier = Modifier.width(8.dp))
        }
    }
}

@Composable
private fun ChatInputBar(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit,
    isSending: Boolean,
    isAiMode: Boolean = false,
    isAiLoading: Boolean = false,
    enabled: Boolean,
    onToggleAi: () -> Unit = {}
) {
    Column(modifier = Modifier.navigationBarsPadding()) {
        HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .imePadding(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier.weight(1f),
                placeholder = {
                    Text(
                        text = when {
                            isAiMode -> "AI에게 예약 요청하기..."
                            enabled -> "메시지 입력..."
                            else -> "연결 중..."
                        },
                        color = ParkOnPrimary.copy(alpha = 0.4f)
                    )
                },
                enabled = enabled,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = if (isAiMode) ParkPrimary.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.1f),
                    unfocusedContainerColor = if (isAiMode) ParkPrimary.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.1f),
                    disabledContainerColor = Color.White.copy(alpha = 0.05f),
                    focusedTextColor = ParkOnPrimary,
                    unfocusedTextColor = ParkOnPrimary,
                    cursorColor = ParkPrimary,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                shape = RoundedCornerShape(24.dp),
                maxLines = 4
            )

            AiButton(
                isActive = isAiMode,
                onClick = onToggleAi
            )

            IconButton(
                onClick = onSend,
                enabled = enabled && value.isNotBlank() && !isSending && !isAiLoading,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(
                        if (enabled && value.isNotBlank()) ParkPrimary else Color.White.copy(alpha = 0.1f)
                    )
            ) {
                if (isSending || isAiLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = ParkOnPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = "보내기",
                        tint = ParkOnPrimary,
                        modifier = Modifier
                            .size(20.dp)
                            .rotate(-45f)
                    )
                }
            }
        }
    }
}

/**
 * AI 타이핑 인디케이터
 */
@Composable
private fun AiTypingIndicator(loadingText: String = "생각 중...") {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.Start
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.padding(start = 8.dp, bottom = 4.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            colors = listOf(ParkPrimary, ParkPrimary.copy(alpha = 0.7f))
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.AutoAwesome,
                    contentDescription = null,
                    modifier = Modifier.size(12.dp),
                    tint = Color.White
                )
            }
            Text(
                text = "AI 예약 도우미",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = ParkPrimary
            )
        }

        Surface(
            shape = RoundedCornerShape(16.dp),
            color = ParkPrimary.copy(alpha = 0.05f)
        ) {
            Row {
                Box(
                    modifier = Modifier
                        .width(3.dp)
                        .height(40.dp)
                        .background(ParkPrimary.copy(alpha = 0.4f))
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(12.dp),
                        color = ParkPrimary.copy(alpha = 0.6f),
                        strokeWidth = 1.5.dp
                    )
                    Text(
                        text = loadingText,
                        style = MaterialTheme.typography.bodySmall,
                        color = ParkOnPrimary.copy(alpha = 0.5f)
                    )
                }
            }
        }
    }
}

/**
 * 참여자 목록 다이얼로그
 */
@Composable
private fun ParticipantsDialog(
    participants: List<com.parkgolf.app.domain.model.ChatParticipant>,
    currentUserId: String,
    onDismiss: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    val showSearch = participants.size >= 5

    val filtered = if (searchQuery.isBlank()) participants else {
        participants.filter {
            it.userName.contains(searchQuery, ignoreCase = true) ||
            (it.userEmail ?: "").contains(searchQuery, ignoreCase = true)
        }
    }
    // 본인을 맨 위로 정렬
    val sorted = filtered.sortedWith(compareBy<com.parkgolf.app.domain.model.ChatParticipant> {
        if (it.userId == currentUserId) 0 else 1
    }.thenBy { it.userName })

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = GradientStart,
        title = {
            Text(
                "참여자 (${participants.size}명)",
                color = ParkOnPrimary,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.heightIn(max = 400.dp)
            ) {
                if (showSearch) {
                    GlassTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        label = "참여자 검색",
                        leadingIcon = Icons.Default.Search
                    )
                }

                if (sorted.isEmpty()) {
                    Text(
                        text = "검색 결과가 없습니다",
                        color = ParkOnPrimary.copy(alpha = 0.6f),
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(vertical = 16.dp)
                    )
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(sorted, key = { it.id }) { participant ->
                            val isMe = participant.userId == currentUserId
                            GlassCard(
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(CircleShape)
                                            .background(ParkPrimary.copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = participant.userName.take(1),
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = ParkPrimary
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Text(
                                                text = participant.userName,
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = ParkOnPrimary
                                            )
                                            if (isMe) {
                                                Text(
                                                    text = "(나)",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = ParkPrimary
                                                )
                                            }
                                        }
                                        if (!participant.userEmail.isNullOrBlank()) {
                                            Text(
                                                text = participant.userEmail,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = ParkOnPrimary.copy(alpha = 0.5f)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("닫기", color = ParkOnPrimary.copy(alpha = 0.7f))
            }
        }
    )
}

/**
 * 친구 초대 다이얼로그
 */
@Composable
private fun InviteFriendsDialog(
    existingParticipantUserIds: List<String>,
    onDismiss: () -> Unit,
    onInvite: (List<String>) -> Unit
) {
    val friendsRepository: com.parkgolf.app.domain.repository.FriendsRepository =
        hiltViewModel<InviteFriendsViewModel>().friendsRepository
    var friends by remember { mutableStateOf<List<Friend>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    val selectedIds = remember { mutableStateListOf<String>() }
    var searchQuery by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        friendsRepository.getFriends()
            .onSuccess { result -> friends = result }
        isLoading = false
    }

    val availableFriends = friends.filter { friend ->
        !existingParticipantUserIds.contains(friend.friendId.toString())
    }
    val filteredFriends = if (searchQuery.isBlank()) availableFriends else {
        availableFriends.filter {
            it.friendName.contains(searchQuery, ignoreCase = true) ||
            it.friendEmail.contains(searchQuery, ignoreCase = true)
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = GradientStart,
        title = {
            Text("친구 초대", color = ParkOnPrimary, fontWeight = FontWeight.Bold)
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.heightIn(max = 400.dp)
            ) {
                GlassTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    label = "친구 검색",
                    leadingIcon = Icons.Default.Search
                )

                if (isLoading) {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = ParkPrimary)
                    }
                } else if (filteredFriends.isEmpty()) {
                    Text(
                        text = "초대할 수 있는 친구가 없습니다",
                        color = ParkOnPrimary.copy(alpha = 0.6f),
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(vertical = 16.dp)
                    )
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filteredFriends, key = { it.id }) { friend ->
                            val friendIdStr = friend.friendId.toString()
                            val isSelected = selectedIds.contains(friendIdStr)
                            GlassCard(
                                modifier = Modifier.fillMaxWidth(),
                                onClick = {
                                    if (isSelected) selectedIds.remove(friendIdStr)
                                    else selectedIds.add(friendIdStr)
                                }
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(CircleShape)
                                            .background(ParkPrimary.copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = friend.friendName.take(1),
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = ParkPrimary
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = friend.friendName,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = ParkOnPrimary
                                        )
                                        Text(
                                            text = friend.friendEmail,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = ParkOnPrimary.copy(alpha = 0.6f)
                                        )
                                    }
                                    Icon(
                                        imageVector = if (isSelected) Icons.Default.CheckCircle
                                                      else Icons.Default.RadioButtonUnchecked,
                                        contentDescription = null,
                                        tint = if (isSelected) ParkPrimary else ParkOnPrimary.copy(alpha = 0.3f)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onInvite(selectedIds.toList()) },
                enabled = selectedIds.isNotEmpty(),
                colors = ButtonDefaults.buttonColors(containerColor = ParkPrimary)
            ) {
                Text(if (selectedIds.isEmpty()) "초대" else "초대 (${selectedIds.size}명)")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("취소", color = ParkOnPrimary.copy(alpha = 0.7f))
            }
        }
    )
}

/**
 * InviteFriendsDialog용 ViewModel (FriendsRepository 주입)
 */
@HiltViewModel
class InviteFriendsViewModel @Inject constructor(
    val friendsRepository: com.parkgolf.app.domain.repository.FriendsRepository
) : androidx.lifecycle.ViewModel()
