package com.parkgolf.app.presentation.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.domain.model.Booking
import com.parkgolf.app.domain.model.BookingStatus
import com.parkgolf.app.domain.model.ChatRoom
import com.parkgolf.app.domain.model.FriendRequest
import com.parkgolf.app.presentation.components.BadgeStatus
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.components.StatusBadge
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.GlassCard as GlassCardColor
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.ParkAccent
import com.parkgolf.app.presentation.theme.ParkError
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary
import com.parkgolf.app.presentation.theme.TextOnGradientTertiary
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/**
 * Home Screen - iOS Style
 *
 * 에메랄드 그라데이션 배경 + 글래스 모피즘 스타일
 */

@Composable
fun HomeScreen(
    onNavigate: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    GradientBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            // Brand Header (항상 표시)
            BrandHeader(
                notificationCount = uiState.notificationCount,
                onNotificationClick = { onNavigate("notifications") }
            )

            // Welcome Section (항상 표시)
            WelcomeSection(userName = uiState.user?.name ?: "회원")

            Spacer(modifier = Modifier.height(24.dp))

            // Content
            Column(
                modifier = Modifier.padding(horizontal = 16.dp)
            ) {
                // Notifications Section (친구 요청 + 읽지 않은 메시지) - iOS 스타일 요약 카드
                if (uiState.hasNotifications) {
                    NotificationsSection(
                        pendingFriendRequestsCount = uiState.pendingFriendRequestsCount,
                        latestFriendRequestName = uiState.friendRequests.firstOrNull()?.fromUserName,
                        totalUnreadMessagesCount = uiState.totalUnreadMessagesCount,
                        latestChatMessage = uiState.unreadChatRooms.firstOrNull()?.lastMessage?.content,
                        onFriendRequestsClick = { onNavigate("friends/requests") },
                        onUnreadChatsClick = { onNavigate("chats/unread") }
                    )

                    Spacer(modifier = Modifier.height(24.dp))
                }

                // Search CTA Section (항상 표시)
                SearchCtaSection(
                    onClick = { onNavigate("search") }
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Upcoming Bookings Section
                SectionHeader(
                    title = "다가오는 라운드",
                    actionText = if (uiState.upcomingBookings.isNotEmpty()) "전체보기" else null,
                    onAction = { onNavigate("my_bookings") }
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Local Loading for Bookings
                if (uiState.isLoading) {
                    BookingSectionLoading()
                } else if (uiState.upcomingBookings.isEmpty()) {
                    EmptyBookingCard(
                        onSearchClick = { onNavigate("search") }
                    )
                } else {
                    uiState.upcomingBookings.forEach { booking ->
                        UpcomingBookingCard(
                            booking = booking,
                            onClick = { onNavigate("booking/detail/${booking.id}") }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Popular Clubs Section
                SectionHeader(title = "이번 주 인기 골프장")

                Spacer(modifier = Modifier.height(12.dp))
            }

            // Popular Clubs Horizontal Scroll
            if (uiState.isLoading && uiState.popularClubs.isEmpty()) {
                PopularClubsLoading()
            } else {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(uiState.popularClubs) { club ->
                        PopularClubCard(
                            club = club,
                            onClick = { onNavigate("club/${club.id}") }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

// ============================================
// Local Loading Components
// ============================================
@Composable
private fun BookingSectionLoading() {
    GlassCard(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.6f)
                        .height(20.dp)
                        .background(GlassCardColor, MaterialTheme.shapes.small)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.8f)
                        .height(16.dp)
                        .background(GlassCardColor, MaterialTheme.shapes.small)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.4f)
                        .height(14.dp)
                        .background(GlassCardColor, MaterialTheme.shapes.small)
                )
            }
            Box(
                modifier = Modifier
                    .size(60.dp, 40.dp)
                    .background(GlassCardColor, MaterialTheme.shapes.medium)
            )
        }
    }
}

@Composable
private fun PopularClubsLoading() {
    Row(
        modifier = Modifier.padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        repeat(2) {
            GlassCard(
                modifier = Modifier.width(200.dp),
                contentPadding = 0.dp
            ) {
                Column {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(100.dp)
                            .background(GlassCardColor)
                    )
                    Column(modifier = Modifier.padding(12.dp)) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.7f)
                                .height(16.dp)
                                .background(GlassCardColor, MaterialTheme.shapes.small)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.5f)
                                .height(12.dp)
                                .background(GlassCardColor, MaterialTheme.shapes.small)
                        )
                    }
                }
            }
        }
    }
}

// ============================================
// Brand Header
// ============================================
@Composable
private fun BrandHeader(
    notificationCount: Int,
    onNotificationClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Brand Logo + Name
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Eco,
                contentDescription = null,
                modifier = Modifier.size(28.dp),
                tint = TextOnGradient
            )
            Text(
                text = "ParkMate",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = TextOnGradient
            )
        }

        // Notification Button
        Box(
            modifier = Modifier
                .clickable { onNotificationClick() }
                .padding(4.dp)
        ) {
            Icon(
                imageVector = Icons.Outlined.Notifications,
                contentDescription = "알림",
                modifier = Modifier.size(28.dp),
                tint = TextOnGradient
            )
            if (notificationCount > 0) {
                Badge(
                    containerColor = ParkError,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 6.dp, y = (-6).dp)
                ) {
                    Text(if (notificationCount > 99) "99+" else notificationCount.toString())
                }
            }
        }
    }
}

// ============================================
// Welcome Section
// ============================================
@Composable
private fun WelcomeSection(userName: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
    ) {
        Text(
            text = getGreetingMessage(userName),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = TextOnGradient
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "오늘도 즐거운 파크골프 되세요!",
            style = MaterialTheme.typography.bodyMedium,
            color = TextOnGradientSecondary
        )
    }
}

private fun getGreetingMessage(name: String): String {
    val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
    return when {
        hour < 12 -> "좋은 아침이에요, ${name}님!"
        hour < 18 -> "좋은 오후에요, ${name}님!"
        else -> "좋은 저녁이에요, ${name}님!"
    }
}

// ============================================
// Notifications Section (iOS 스타일 요약 카드)
// ============================================
@Composable
private fun NotificationsSection(
    pendingFriendRequestsCount: Int,
    latestFriendRequestName: String?,
    totalUnreadMessagesCount: Int,
    latestChatMessage: String?,
    onFriendRequestsClick: () -> Unit,
    onUnreadChatsClick: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 친구 요청 카드
        if (pendingFriendRequestsCount > 0) {
            NotificationSummaryCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.Person,
                iconColor = ParkAccent,
                title = "친구 요청",
                count = pendingFriendRequestsCount,
                subtitle = latestFriendRequestName?.let { "${it}님이 요청" },
                onClick = onFriendRequestsClick
            )
        }

        // 읽지 않은 메시지 카드
        if (totalUnreadMessagesCount > 0) {
            NotificationSummaryCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.Message,
                iconColor = ParkPrimary,
                title = "새 메시지",
                count = totalUnreadMessagesCount,
                subtitle = latestChatMessage,
                onClick = onUnreadChatsClick
            )
        }
    }
}

@Composable
private fun NotificationSummaryCard(
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconColor: Color,
    title: String,
    count: Int,
    subtitle: String?,
    onClick: () -> Unit
) {
    GlassCard(
        modifier = modifier,
        onClick = onClick
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Header: Icon + Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(24.dp)
                )

                Badge(containerColor = iconColor) {
                    Text(count.toString())
                }
            }

            // Title
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = TextOnGradient
            )

            // Subtitle
            subtitle?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextOnGradientSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

// ============================================
// Search CTA Section
// ============================================
@Composable
private fun SearchCtaSection(onClick: () -> Unit) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(
                            color = ParkPrimary.copy(alpha = 0.2f),
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = null,
                        tint = ParkPrimary,
                        modifier = Modifier.size(24.dp)
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(
                        text = "라운드 검색하기",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = TextOnGradient
                    )
                    Text(
                        text = "주변 파크골프장을 찾아보세요",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnGradientSecondary
                    )
                }
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = TextOnGradientSecondary
            )
        }
    }
}

// ============================================
// Section Header
// ============================================
@Composable
private fun SectionHeader(
    title: String,
    actionText: String? = null,
    onAction: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = TextOnGradient
        )
        if (actionText != null && onAction != null) {
            Row(
                modifier = Modifier.clickable { onAction() },
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = actionText,
                    style = MaterialTheme.typography.labelMedium,
                    color = TextOnGradientSecondary
                )
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = TextOnGradientSecondary
                )
            }
        } else if (actionText != null) {
            Text(
                text = actionText,
                style = MaterialTheme.typography.labelMedium,
                color = TextOnGradientTertiary
            )
        }
    }
}

// ============================================
// Empty Booking Card
// ============================================
@Composable
private fun EmptyBookingCard(onSearchClick: () -> Unit) {
    GlassCard(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.CalendarMonth,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = TextOnGradientTertiary
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "예정된 라운드가 없습니다",
                style = MaterialTheme.typography.bodyMedium,
                color = TextOnGradientSecondary
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onSearchClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = ParkPrimary
                )
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("라운드 찾기")
            }
        }
    }
}

// ============================================
// Upcoming Booking Card
// ============================================
@Composable
private fun UpcomingBookingCard(
    booking: Booking,
    onClick: () -> Unit
) {
    val dDay = calculateDDay(booking.bookingDate)
    val badgeStatus = when (booking.status) {
        BookingStatus.CONFIRMED -> BadgeStatus.CONFIRMED
        BookingStatus.PENDING, BookingStatus.SLOT_RESERVED -> BadgeStatus.PENDING
        BookingStatus.CANCELLED -> BadgeStatus.CANCELLED
        else -> BadgeStatus.COMPLETED
    }

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = booking.clubName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = TextOnGradient
                    )
                    StatusBadge(status = badgeStatus)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = formatBookingDate(booking.bookingDate),
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextOnGradientSecondary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Groups,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = ParkPrimary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${booking.playerCount}명 예약",
                        style = MaterialTheme.typography.bodySmall,
                        color = ParkPrimary
                    )
                }
            }

            // D-Day Badge
            Box(
                modifier = Modifier
                    .background(
                        color = ParkPrimary.copy(alpha = 0.2f),
                        shape = MaterialTheme.shapes.medium
                    )
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Text(
                    text = if (dDay == 0L) "D-Day" else "D-$dDay",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = ParkPrimary
                )
            }
        }
    }
}

private fun calculateDDay(bookingDate: LocalDate): Long {
    return ChronoUnit.DAYS.between(LocalDate.now(), bookingDate)
}

private fun formatBookingDate(date: LocalDate): String {
    val formatter = DateTimeFormatter.ofPattern("yyyy년 M월 d일 (E)")
    return date.format(formatter)
}

// ============================================
// Popular Club Card
// ============================================
@Composable
private fun PopularClubCard(
    club: PopularClub,
    onClick: () -> Unit
) {
    GlassCard(
        modifier = Modifier.width(200.dp),
        onClick = onClick,
        contentPadding = 0.dp
    ) {
        Column {
            // Club Image Placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp)
                    .background(GlassCardColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Eco,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = TextOnGradientTertiary
                )
            }

            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = club.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = TextOnGradient,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = TextOnGradientSecondary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = club.location,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnGradientSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = ParkAccent
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = String.format("%.1f", club.rating),
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = TextOnGradient
                    )
                }
            }
        }
    }
}
