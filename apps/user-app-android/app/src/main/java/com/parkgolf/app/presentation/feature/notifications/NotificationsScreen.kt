package com.parkgolf.app.presentation.feature.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsOff
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.domain.model.AppNotification
import com.parkgolf.app.domain.model.NotificationType
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.theme.ParkAccent
import com.parkgolf.app.presentation.theme.ParkError
import com.parkgolf.app.presentation.theme.ParkInfo
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.ParkWarning
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary
import com.parkgolf.app.presentation.theme.TextOnGradientTertiary
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    onNavigateBack: () -> Unit,
    onNavigate: (String) -> Unit,
    viewModel: NotificationsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()

    // Load more when reaching end of list
    val shouldLoadMore by remember {
        derivedStateOf {
            val lastVisibleItem = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            lastVisibleItem >= uiState.notifications.size - 3 && uiState.hasMorePages && !uiState.isLoadingMore
        }
    }

    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore) {
            viewModel.loadMoreNotifications()
        }
    }

    GradientBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            // Top App Bar
            TopAppBar(
                title = {
                    Text(
                        text = "알림",
                        color = TextOnGradient,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "뒤로가기",
                            tint = TextOnGradient
                        )
                    }
                },
                actions = {
                    if (uiState.unreadCount > 0) {
                        TextButton(onClick = { viewModel.markAllAsRead() }) {
                            Text(
                                text = "모두 읽음",
                                color = ParkPrimary,
                                style = MaterialTheme.typography.labelMedium
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent
                )
            )

            // Content
            when {
                uiState.isLoading && uiState.notifications.isEmpty() -> {
                    LoadingView()
                }
                uiState.notifications.isEmpty() -> {
                    EmptyView()
                }
                else -> {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(
                            items = uiState.notifications,
                            key = { it.id }
                        ) { notification ->
                            SwipeableNotificationRow(
                                notification = notification,
                                onTap = {
                                    viewModel.markAsRead(notification)
                                    handleNotificationTap(notification, onNavigate)
                                },
                                onDelete = { viewModel.deleteNotification(notification) }
                            )
                        }

                        // Load more indicator
                        if (uiState.isLoadingMore) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(24.dp),
                                        color = ParkPrimary
                                    )
                                }
                            }
                        }

                        // Bottom spacing
                        item {
                            Spacer(modifier = Modifier.height(32.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LoadingView() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            CircularProgressIndicator(color = ParkPrimary)
            Text(
                text = "알림을 불러오는 중...",
                style = MaterialTheme.typography.bodyMedium,
                color = TextOnGradientSecondary
            )
        }
    }
}

@Composable
private fun EmptyView() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.NotificationsOff,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = TextOnGradientTertiary
            )
            Text(
                text = "알림이 없습니다",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = TextOnGradient
            )
            Text(
                text = "새로운 알림이 도착하면 여기에 표시됩니다",
                style = MaterialTheme.typography.bodySmall,
                color = TextOnGradientSecondary
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwipeableNotificationRow(
    notification: AppNotification,
    onTap: () -> Unit,
    onDelete: () -> Unit
) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { dismissValue ->
            if (dismissValue == SwipeToDismissBoxValue.EndToStart) {
                onDelete()
                true
            } else {
                false
            }
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        backgroundContent = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(ParkError, MaterialTheme.shapes.medium)
                    .padding(end = 16.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "삭제",
                    tint = Color.White
                )
            }
        },
        enableDismissFromStartToEnd = false
    ) {
        NotificationRow(
            notification = notification,
            onClick = onTap
        )
    }
}

@Composable
private fun NotificationRow(
    notification: AppNotification,
    onClick: () -> Unit
) {
    val iconColor = notification.type.iconColor
    val icon = notification.type.icon

    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .alpha(if (notification.isRead) 0.7f else 1f),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            // Icon
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(iconColor.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(22.dp),
                    tint = iconColor
                )
            }

            // Content
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = notification.title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = TextOnGradient,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    Text(
                        text = formatRelativeTime(notification.createdAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = TextOnGradientTertiary
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = notification.message,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextOnGradientSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Type badge
                    Box(
                        modifier = Modifier
                            .clip(MaterialTheme.shapes.small)
                            .background(iconColor.copy(alpha = 0.2f))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = notification.type.displayName,
                            style = MaterialTheme.typography.labelSmall,
                            color = iconColor
                        )
                    }

                    // Unread indicator
                    if (!notification.isRead) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(ParkPrimary)
                        )
                    }
                }
            }
        }
    }
}

// Extension properties for NotificationType
private val NotificationType.icon: ImageVector
    get() = when (this) {
        NotificationType.BOOKING_CONFIRMED -> Icons.Default.CheckCircle
        NotificationType.BOOKING_CANCELLED -> Icons.Default.Cancel
        NotificationType.PAYMENT_SUCCESS -> Icons.Default.CreditCard
        NotificationType.PAYMENT_FAILED -> Icons.Default.Error
        NotificationType.FRIEND_REQUEST -> Icons.Default.PersonAdd
        NotificationType.FRIEND_ACCEPTED -> Icons.Default.People
        NotificationType.CHAT_MESSAGE -> Icons.Default.Chat
        NotificationType.SYSTEM_ALERT -> Icons.Default.Notifications
    }

private val NotificationType.iconColor: Color
    get() = when (this) {
        NotificationType.BOOKING_CONFIRMED, NotificationType.PAYMENT_SUCCESS, NotificationType.FRIEND_ACCEPTED -> ParkPrimary
        NotificationType.BOOKING_CANCELLED, NotificationType.PAYMENT_FAILED -> ParkError
        NotificationType.FRIEND_REQUEST -> ParkAccent
        NotificationType.CHAT_MESSAGE -> ParkInfo
        NotificationType.SYSTEM_ALERT -> ParkWarning
    }

private fun formatRelativeTime(dateTime: LocalDateTime): String {
    val now = LocalDateTime.now()
    val minutes = ChronoUnit.MINUTES.between(dateTime, now)
    val hours = ChronoUnit.HOURS.between(dateTime, now)
    val days = ChronoUnit.DAYS.between(dateTime, now)

    return when {
        minutes < 1 -> "방금"
        minutes < 60 -> "${minutes}분 전"
        hours < 24 -> "${hours}시간 전"
        days < 7 -> "${days}일 전"
        else -> dateTime.format(DateTimeFormatter.ofPattern("M/d"))
    }
}

private fun handleNotificationTap(notification: AppNotification, onNavigate: (String) -> Unit) {
    when (notification.type) {
        NotificationType.BOOKING_CONFIRMED, NotificationType.BOOKING_CANCELLED -> {
            notification.data?.bookingId?.let { onNavigate("booking/detail/$it") }
        }
        NotificationType.PAYMENT_SUCCESS, NotificationType.PAYMENT_FAILED -> {
            notification.data?.bookingId?.let { onNavigate("booking/detail/$it") }
        }
        NotificationType.FRIEND_REQUEST, NotificationType.FRIEND_ACCEPTED -> {
            onNavigate("social")
        }
        NotificationType.CHAT_MESSAGE -> {
            notification.data?.chatRoomId?.let { onNavigate("chat/$it") }
        }
        NotificationType.SYSTEM_ALERT -> {
            // Stay on notifications screen
        }
    }
}
