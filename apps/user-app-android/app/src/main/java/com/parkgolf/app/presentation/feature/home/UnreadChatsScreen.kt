package com.parkgolf.app.presentation.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.model.ChatRoomType
import com.parkgolf.app.presentation.components.EmptyStateView
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.theme.*
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * 읽지 않은 채팅 화면 (iOS 스타일)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UnreadChatsScreen(
    onNavigateBack: () -> Unit,
    onChatRoomClick: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    GradientBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            // Top App Bar
            TopAppBar(
                title = {
                    Text(
                        text = "새 메시지",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = TextOnGradient
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "뒤로 가기",
                            tint = TextOnGradient
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = androidx.compose.ui.graphics.Color.Transparent
                )
            )

            // Content
            if (uiState.unreadChatRooms.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    EmptyStateView(
                        icon = Icons.AutoMirrored.Filled.Chat,
                        title = "새 메시지가 없습니다",
                        description = "읽지 않은 메시지가 없습니다"
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(
                        items = uiState.unreadChatRooms,
                        key = { it.id }
                    ) { room ->
                        UnreadChatRow(
                            room = room,
                            onClick = { onChatRoomClick(room.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun UnreadChatRow(
    room: ChatRoom,
    onClick: () -> Unit
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                // Avatar
                Box(
                    modifier = Modifier
                        .size(50.dp)
                        .clip(CircleShape)
                        .background(ParkInfo.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (room.type == ChatRoomType.GROUP) Icons.Default.Groups else Icons.Default.Person,
                        contentDescription = null,
                        tint = ParkInfo,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = room.name.ifEmpty { "채팅" },
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = TextOnGradient,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )

                        // Unread Badge
                        Badge(containerColor = ParkInfo) {
                            Text(room.unreadCount.toString())
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    room.lastMessage?.let { message ->
                        Text(
                            text = message.content,
                            style = MaterialTheme.typography.bodySmall,
                            color = TextOnGradientSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Text(
                        text = formatChatTime(room.updatedAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = TextOnGradientTertiary
                    )
                }
            }

            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = TextOnGradientTertiary,
                modifier = Modifier.padding(start = 8.dp)
            )
        }
    }
}

private fun formatChatTime(dateTime: LocalDateTime): String {
    val now = java.time.LocalDate.now()
    val messageDate = dateTime.toLocalDate()

    return when {
        messageDate == now -> dateTime.format(DateTimeFormatter.ofPattern("a h:mm"))
        messageDate == now.minusDays(1) -> "어제"
        else -> dateTime.format(DateTimeFormatter.ofPattern("M/d"))
    }
}
