package com.parkgolf.app.presentation.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.domain.model.FriendRequest
import com.parkgolf.app.presentation.components.EmptyStateView
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.theme.*
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/**
 * 친구 요청 처리 화면 (iOS 스타일)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendRequestsScreen(
    onNavigateBack: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    GradientBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            // Top App Bar
            TopAppBar(
                title = {
                    Text(
                        text = "친구 요청",
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
            if (uiState.friendRequests.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    EmptyStateView(
                        icon = Icons.Default.PersonAdd,
                        title = "친구 요청이 없습니다",
                        description = "새로운 친구 요청이 오면 여기에 표시됩니다"
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(
                        items = uiState.friendRequests,
                        key = { it.id }
                    ) { request ->
                        FriendRequestRow(
                            request = request,
                            onAccept = { viewModel.acceptFriendRequest(request.id) },
                            onReject = { viewModel.rejectFriendRequest(request.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FriendRequestRow(
    request: FriendRequest,
    onAccept: () -> Unit,
    onReject: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
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
                        .background(ParkPrimary.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = request.fromUserName.take(1),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = ParkPrimary
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = request.fromUserName,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = TextOnGradient
                    )
                    Text(
                        text = request.fromUserEmail,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnGradientSecondary
                    )
                    request.createdAt?.let { createdAt ->
                        Text(
                            text = formatRelativeTime(createdAt),
                            style = MaterialTheme.typography.labelSmall,
                            color = TextOnGradientTertiary
                        )
                    }
                }
            }

            // Action Buttons
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(
                    onClick = onReject,
                    modifier = Modifier
                        .size(40.dp)
                        .background(GlassCard, CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "거절",
                        tint = TextOnGradientSecondary,
                        modifier = Modifier.size(20.dp)
                    )
                }

                IconButton(
                    onClick = onAccept,
                    modifier = Modifier
                        .size(40.dp)
                        .background(ParkPrimary, CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "수락",
                        tint = TextOnGradient,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

private fun formatRelativeTime(dateTime: String): String {
    return try {
        val parsed = LocalDateTime.parse(dateTime.replace("Z", ""))
        val now = LocalDateTime.now()
        val minutes = ChronoUnit.MINUTES.between(parsed, now)
        val hours = ChronoUnit.HOURS.between(parsed, now)
        val days = ChronoUnit.DAYS.between(parsed, now)

        when {
            minutes < 1 -> "방금 전"
            minutes < 60 -> "${minutes}분 전"
            hours < 24 -> "${hours}시간 전"
            days < 7 -> "${days}일 전"
            else -> parsed.format(DateTimeFormatter.ofPattern("M월 d일"))
        }
    } catch (e: Exception) {
        ""
    }
}
