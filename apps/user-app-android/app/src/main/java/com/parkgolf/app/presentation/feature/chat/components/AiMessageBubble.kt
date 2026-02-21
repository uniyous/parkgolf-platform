package com.parkgolf.app.presentation.feature.chat.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.parkgolf.app.domain.model.ActionType
import com.parkgolf.app.domain.model.ChatAction
import com.parkgolf.app.presentation.feature.chat.components.cards.BookingCompleteCard
import com.parkgolf.app.presentation.feature.chat.components.cards.ClubCard
import com.parkgolf.app.presentation.feature.chat.components.cards.SlotCard
import com.parkgolf.app.presentation.feature.chat.components.cards.WeatherCard
import com.parkgolf.app.presentation.theme.GlassCard
import com.parkgolf.app.presentation.theme.ParkOnPrimary
import com.parkgolf.app.presentation.theme.ParkPrimary
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Composable
fun AiMessageBubble(
    content: String,
    actions: List<ChatAction>,
    createdAt: LocalDateTime,
    onClubSelect: ((String, String) -> Unit)? = null,
    onSlotSelect: ((String, String) -> Unit)? = null
) {
    val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.Start
    ) {
        // AI label
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier.padding(start = 8.dp, bottom = 4.dp)
        ) {
            Icon(
                Icons.Default.AutoAwesome,
                contentDescription = null,
                modifier = Modifier.size(14.dp),
                tint = ParkPrimary
            )
            Text(
                text = "AI 예약 도우미",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Medium,
                color = ParkPrimary
            )
        }

        // Message bubble
        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = 4.dp,
                bottomEnd = 16.dp
            ),
            color = GlassCard
        ) {
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
                            onSelect = onClubSelect
                        )
                        ActionType.SHOW_SLOTS -> SlotCard(
                            data = action.data,
                            onSelect = onSlotSelect
                        )
                        ActionType.SHOW_WEATHER -> WeatherCard(data = action.data)
                        ActionType.CONFIRM_BOOKING -> {} // Handled by text
                        ActionType.BOOKING_COMPLETE -> BookingCompleteCard(data = action.data)
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
