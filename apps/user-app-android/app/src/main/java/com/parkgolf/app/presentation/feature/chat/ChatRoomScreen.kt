package com.parkgolf.app.presentation.feature.chat

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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.domain.model.ChatMessage
import com.parkgolf.app.domain.model.Friend
import com.parkgolf.app.domain.model.MessageType
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GlassTextField
import com.parkgolf.app.presentation.feature.chat.components.AiButton
import com.parkgolf.app.presentation.feature.chat.components.AiMessageBubble
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

    LaunchedEffect(roomId) {
        viewModel.loadRoom(roomId)
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
                    Column {
                        Text(
                            text = uiState.room?.displayName(uiState.currentUserId ?: "") ?: "채팅",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (uiState.isConnected) Color(0xFF10B981) else Color(0xFFEF4444)
                                    )
                            )
                            Text(
                                text = if (uiState.isConnected) "연결됨" else "연결 끊김",
                                style = MaterialTheme.typography.bodySmall,
                                color = ParkOnPrimary.copy(alpha = 0.7f)
                            )
                        }
                    }
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
                                    viewModel.leaveChatRoom()
                                    onNavigateBack()
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

            // Message list
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                if (uiState.isLoading && uiState.messages.isEmpty()) {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = ParkOnPrimary
                    )
                } else {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Load more button at top (older messages)
                        if (uiState.hasMore) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (uiState.isLoading) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(24.dp),
                                            color = ParkOnPrimary
                                        )
                                    } else {
                                        TextButton(onClick = { viewModel.loadMoreMessages() }) {
                                            Text("이전 메시지 보기", color = ParkOnPrimary)
                                        }
                                    }
                                }
                            }
                        }

                        // Messages (oldest first, newest at bottom)
                        items(uiState.messages) { message ->
                            if (message.messageType == MessageType.AI_ASSISTANT) {
                                AiMessageBubble(
                                    content = message.content,
                                    actions = viewModel.getActionsForMessage(message.id),
                                    createdAt = message.createdAt,
                                    onClubSelect = { _, clubName ->
                                        viewModel.sendAiMessage("${clubName}(으)로 선택할게요")
                                    },
                                    onSlotSelect = { _, time ->
                                        viewModel.sendAiMessage("$time 시간으로 예약해주세요")
                                    }
                                )
                            } else {
                                val isOwnMessage = message.senderId == uiState.currentUserId
                                ChatMessageBubble(
                                    message = message,
                                    isOwnMessage = isOwnMessage
                                )
                            }
                        }

                        // AI loading indicator
                        if (uiState.isAiLoading) {
                            item {
                                AiTypingIndicator()
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
 * 연결 상태 배너 (iOS와 동일한 UI)
 */
@Composable
private fun ConnectionStatusBanner(
    canReconnect: Boolean,
    onReconnect: () -> Unit
) {
    Surface(
        color = Color(0xFFEF4444).copy(alpha = 0.9f),
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
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = "연결 끊김",
                    style = MaterialTheme.typography.bodyMedium,
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
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("재연결")
                }
            } else {
                Text(
                    text = "재연결 불가",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.7f)
                )
            }
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
    Surface(
        color = GradientStart.copy(alpha = 0.95f),
        shadowElevation = 8.dp,
        modifier = Modifier.navigationBarsPadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
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
                            isAiMode -> "AI에게 질문하기..."
                            enabled -> "메시지를 입력하세요"
                            else -> "연결 중..."
                        },
                        color = ParkOnPrimary.copy(alpha = 0.5f)
                    )
                },
                enabled = enabled,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = if (isAiMode) ParkPrimary.copy(alpha = 0.15f) else GlassCard,
                    unfocusedContainerColor = if (isAiMode) ParkPrimary.copy(alpha = 0.15f) else GlassCard,
                    disabledContainerColor = GlassCard.copy(alpha = 0.5f),
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
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(
                        if (enabled && value.isNotBlank()) ParkPrimary else ParkPrimary.copy(alpha = 0.3f)
                    )
            ) {
                if (isSending || isAiLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = ParkOnPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = "보내기",
                        tint = ParkOnPrimary
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
private fun AiTypingIndicator() {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.padding(start = 8.dp)
    ) {
        Icon(
            Icons.Default.AutoAwesome,
            contentDescription = null,
            modifier = Modifier.size(14.dp),
            tint = ParkPrimary
        )
        Text(
            text = "AI가 답변 중...",
            style = MaterialTheme.typography.bodySmall,
            color = ParkOnPrimary.copy(alpha = 0.6f)
        )
        CircularProgressIndicator(
            modifier = Modifier.size(12.dp),
            color = ParkPrimary,
            strokeWidth = 1.5.dp
        )
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
