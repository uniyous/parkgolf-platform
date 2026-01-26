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
import com.parkgolf.app.presentation.theme.*
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatRoomScreen(
    roomId: String,
    onNavigateBack: () -> Unit,
    viewModel: ChatViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()

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
                            text = uiState.room?.name ?: "채팅",
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
                    IconButton(onClick = { /* TODO: Show room info */ }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "더보기")
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
                onSend = { viewModel.sendMessage() },
                isSending = uiState.isSending,
                enabled = uiState.isConnected
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
                            val isOwnMessage = message.senderId == uiState.currentUserId
                            ChatMessageBubble(
                                message = message,
                                isOwnMessage = isOwnMessage
                            )
                        }
                    }
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
        if (!isOwnMessage) {
            // Avatar placeholder
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(ParkPrimary.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = message.senderName.take(1),
                    style = MaterialTheme.typography.bodyMedium,
                    color = ParkOnPrimary,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
        }

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

            Text(
                text = message.createdAt.format(timeFormatter),
                style = MaterialTheme.typography.labelSmall,
                color = ParkOnPrimary.copy(alpha = 0.5f),
                modifier = Modifier.padding(
                    start = if (isOwnMessage) 0.dp else 8.dp,
                    end = if (isOwnMessage) 8.dp else 0.dp,
                    top = 2.dp
                )
            )
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
    enabled: Boolean
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
                        text = if (enabled) "메시지를 입력하세요" else "연결 중...",
                        color = ParkOnPrimary.copy(alpha = 0.5f)
                    )
                },
                enabled = enabled,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = GlassCard,
                    unfocusedContainerColor = GlassCard,
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

            IconButton(
                onClick = onSend,
                enabled = enabled && value.isNotBlank() && !isSending,
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(
                        if (enabled && value.isNotBlank()) ParkPrimary else ParkPrimary.copy(alpha = 0.3f)
                    )
            ) {
                if (isSending) {
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
