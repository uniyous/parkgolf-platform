package com.parkgolf.app.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.StatusCancelled
import com.parkgolf.app.presentation.theme.StatusCompleted
import com.parkgolf.app.presentation.theme.StatusConfirmed
import com.parkgolf.app.presentation.theme.StatusPending

enum class BadgeStatus {
    CONFIRMED,
    PENDING,
    CANCELLED,
    COMPLETED
}

@Composable
fun StatusBadge(
    status: BadgeStatus,
    modifier: Modifier = Modifier
) {
    val (backgroundColor, text) = when (status) {
        BadgeStatus.CONFIRMED -> StatusConfirmed to "예약확정"
        BadgeStatus.PENDING -> StatusPending to "대기중"
        BadgeStatus.CANCELLED -> StatusCancelled to "취소됨"
        BadgeStatus.COMPLETED -> StatusCompleted to "완료"
    }

    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall,
        color = Color.White,
        modifier = modifier
            .background(
                color = backgroundColor,
                shape = RoundedCornerShape(4.dp)
            )
            .padding(horizontal = 8.dp, vertical = 4.dp)
    )
}

@Composable
fun StatusBadge(
    text: String,
    backgroundColor: Color,
    modifier: Modifier = Modifier
) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall,
        color = Color.White,
        modifier = modifier
            .background(
                color = backgroundColor,
                shape = RoundedCornerShape(4.dp)
            )
            .padding(horizontal = 8.dp, vertical = 4.dp)
    )
}
