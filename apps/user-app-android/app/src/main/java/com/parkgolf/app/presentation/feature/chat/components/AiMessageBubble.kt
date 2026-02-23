package com.parkgolf.app.presentation.feature.chat.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.parkgolf.app.domain.model.ActionType
import com.parkgolf.app.domain.model.ChatAction
import com.parkgolf.app.presentation.feature.chat.components.cards.BookingCompleteCard
import com.parkgolf.app.presentation.feature.chat.components.cards.ClubCard
import com.parkgolf.app.presentation.feature.chat.components.cards.SlotCard
import com.parkgolf.app.presentation.feature.chat.components.cards.WeatherCard
import com.parkgolf.app.presentation.theme.ParkOnPrimary
import com.parkgolf.app.presentation.theme.ParkPrimary
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Composable
fun AiMessageBubble(
    content: String,
    actions: List<ChatAction>,
    createdAt: LocalDateTime,
    showLabel: Boolean = true,
    onClubSelect: ((String, String) -> Unit)? = null,
    onSlotSelect: ((String, String) -> Unit)? = null,
    selectedClubId: String? = null,
    selectedSlotId: String? = null
) {
    val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.Start
    ) {
        // AI label (hidden for consecutive AI messages)
        if (showLabel) {
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
        }

        // Message bubble with left accent border
        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = 4.dp,
                bottomEnd = 16.dp
            ),
            color = ParkPrimary.copy(alpha = 0.05f)
        ) {
            Row(modifier = Modifier.height(IntrinsicSize.Min)) {
                // Left accent border
                Box(
                    modifier = Modifier
                        .width(3.dp)
                        .fillMaxHeight()
                        .background(ParkPrimary.copy(alpha = 0.4f))
                )

                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (content.isNotEmpty()) {
                        Text(
                            text = content,
                            style = MaterialTheme.typography.bodyMedium,
                            color = ParkOnPrimary
                        )
                    }

                    // Action cards
                    actions.forEach { action ->
                        when (action.type) {
                            ActionType.SHOW_CLUBS -> ClubCard(
                                data = action.data,
                                onSelect = onClubSelect,
                                selectedClubId = selectedClubId
                            )
                            ActionType.SHOW_SLOTS -> SlotCard(
                                data = action.data,
                                onSelect = onSlotSelect,
                                selectedSlotId = selectedSlotId
                            )
                            ActionType.SHOW_WEATHER -> WeatherCard(data = action.data)
                            ActionType.CONFIRM_BOOKING -> {} // Handled by text
                            ActionType.BOOKING_COMPLETE -> BookingCompleteCard(data = action.data)
                        }
                    }
                }
            }
        }

        // Time
        Text(
            text = createdAt.format(timeFormatter),
            style = MaterialTheme.typography.labelSmall,
            color = ParkOnPrimary.copy(alpha = 0.5f),
            modifier = Modifier.padding(start = 8.dp, top = 2.dp)
        )
    }
}
