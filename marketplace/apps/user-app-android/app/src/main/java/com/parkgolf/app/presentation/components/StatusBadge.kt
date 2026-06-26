package com.parkgolf.app.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.StatusCancelled
import com.parkgolf.app.presentation.theme.StatusCancelledContainer
import com.parkgolf.app.presentation.theme.StatusCompleted
import com.parkgolf.app.presentation.theme.StatusCompletedContainer
import com.parkgolf.app.presentation.theme.StatusConfirmed
import com.parkgolf.app.presentation.theme.StatusConfirmedContainer
import com.parkgolf.app.presentation.theme.StatusPending
import com.parkgolf.app.presentation.theme.StatusPendingContainer

/**
 * Park Golf Status Badge Component
 *
 * Material Design 3 스타일 상태 뱃지
 * - 아이콘 + 텍스트
 * - Tonal 색상 사용
 */

enum class BadgeStatus {
    CONFIRMED,
    PENDING,
    CANCELLED,
    COMPLETED
}

enum class BadgeSize {
    SMALL,
    MEDIUM,
    LARGE
}

data class StatusBadgeStyle(
    val icon: ImageVector,
    val text: String,
    val containerColor: Color,
    val contentColor: Color
)

private fun getStatusStyle(status: BadgeStatus): StatusBadgeStyle {
    return when (status) {
        BadgeStatus.CONFIRMED -> StatusBadgeStyle(
            icon = Icons.Filled.CheckCircle,
            text = "예약확정",
            containerColor = StatusConfirmedContainer,
            contentColor = StatusConfirmed
        )
        BadgeStatus.PENDING -> StatusBadgeStyle(
            icon = Icons.Filled.AccessTime,
            text = "대기중",
            containerColor = StatusPendingContainer,
            contentColor = StatusPending
        )
        BadgeStatus.CANCELLED -> StatusBadgeStyle(
            icon = Icons.Filled.Cancel,
            text = "취소됨",
            containerColor = StatusCancelledContainer,
            contentColor = StatusCancelled
        )
        BadgeStatus.COMPLETED -> StatusBadgeStyle(
            icon = Icons.Filled.Flag,
            text = "완료",
            containerColor = StatusCompletedContainer,
            contentColor = StatusCompleted
        )
    }
}

private fun getBadgePadding(size: BadgeSize): Pair<Dp, Dp> {
    return when (size) {
        BadgeSize.SMALL -> 6.dp to 2.dp
        BadgeSize.MEDIUM -> 10.dp to 4.dp
        BadgeSize.LARGE -> 14.dp to 6.dp
    }
}

private fun getIconSize(size: BadgeSize): Dp {
    return when (size) {
        BadgeSize.SMALL -> 12.dp
        BadgeSize.MEDIUM -> 14.dp
        BadgeSize.LARGE -> 16.dp
    }
}

// ============================================
// Status Badge (Enum 기반)
// ============================================
@Composable
fun StatusBadge(
    status: BadgeStatus,
    modifier: Modifier = Modifier,
    size: BadgeSize = BadgeSize.MEDIUM,
    showIcon: Boolean = true
) {
    val style = getStatusStyle(status)
    val (horizontalPadding, verticalPadding) = getBadgePadding(size)
    val iconSize = getIconSize(size)

    Row(
        modifier = modifier
            .background(
                color = style.containerColor,
                shape = RoundedCornerShape(50) // Pill shape
            )
            .padding(horizontal = horizontalPadding, vertical = verticalPadding),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (showIcon) {
            Icon(
                imageVector = style.icon,
                contentDescription = null,
                tint = style.contentColor,
                modifier = Modifier.size(iconSize)
            )
        }
        Text(
            text = style.text,
            style = when (size) {
                BadgeSize.SMALL -> MaterialTheme.typography.labelSmall
                BadgeSize.MEDIUM -> MaterialTheme.typography.labelMedium
                BadgeSize.LARGE -> MaterialTheme.typography.labelLarge
            },
            color = style.contentColor
        )
    }
}

// ============================================
// Status Badge (문자열 기반 - 하위 호환성)
// ============================================
@Composable
fun StatusBadge(
    statusString: String,
    modifier: Modifier = Modifier,
    size: BadgeSize = BadgeSize.MEDIUM,
    showIcon: Boolean = true
) {
    val status = when (statusString.uppercase()) {
        "CONFIRMED" -> BadgeStatus.CONFIRMED
        "PENDING" -> BadgeStatus.PENDING
        "CANCELLED", "CANCELED" -> BadgeStatus.CANCELLED
        "COMPLETED" -> BadgeStatus.COMPLETED
        else -> BadgeStatus.PENDING
    }
    StatusBadge(status = status, modifier = modifier, size = size, showIcon = showIcon)
}

// ============================================
// Custom Badge (커스텀 색상)
// ============================================
@Composable
fun CustomBadge(
    text: String,
    modifier: Modifier = Modifier,
    containerColor: Color = MaterialTheme.colorScheme.primaryContainer,
    contentColor: Color = MaterialTheme.colorScheme.onPrimaryContainer,
    icon: ImageVector? = null,
    size: BadgeSize = BadgeSize.MEDIUM
) {
    val (horizontalPadding, verticalPadding) = getBadgePadding(size)
    val iconSize = getIconSize(size)

    Row(
        modifier = modifier
            .background(
                color = containerColor,
                shape = RoundedCornerShape(50)
            )
            .padding(horizontal = horizontalPadding, vertical = verticalPadding),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = contentColor,
                modifier = Modifier.size(iconSize)
            )
        }
        Text(
            text = text,
            style = when (size) {
                BadgeSize.SMALL -> MaterialTheme.typography.labelSmall
                BadgeSize.MEDIUM -> MaterialTheme.typography.labelMedium
                BadgeSize.LARGE -> MaterialTheme.typography.labelLarge
            },
            color = contentColor
        )
    }
}

// ============================================
// Premium Badge (프리미엄 표시)
// ============================================
@Composable
fun PremiumBadge(
    modifier: Modifier = Modifier,
    size: BadgeSize = BadgeSize.SMALL
) {
    val (horizontalPadding, verticalPadding) = getBadgePadding(size)

    Row(
        modifier = modifier
            .background(
                color = Color(0xFFFEF3C7), // Amber 100
                shape = RoundedCornerShape(50)
            )
            .padding(horizontal = horizontalPadding, vertical = verticalPadding),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "💎",
            style = when (size) {
                BadgeSize.SMALL -> MaterialTheme.typography.labelSmall
                BadgeSize.MEDIUM -> MaterialTheme.typography.labelMedium
                BadgeSize.LARGE -> MaterialTheme.typography.labelLarge
            }
        )
        Text(
            text = "프리미엄",
            style = when (size) {
                BadgeSize.SMALL -> MaterialTheme.typography.labelSmall
                BadgeSize.MEDIUM -> MaterialTheme.typography.labelMedium
                BadgeSize.LARGE -> MaterialTheme.typography.labelLarge
            },
            color = Color(0xFFB45309) // Amber 700
        )
    }
}
