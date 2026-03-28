package com.parkgolf.app.presentation.feature.chat.components.cards

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parkgolf.app.presentation.theme.ParkPrimary

@Composable
fun TaskPreviewCard(data: Map<String, Any?>) {
    val location = data["location"]?.toString()
    val date = data["date"]?.toString() ?: "오늘"
    val playerCount = (data["playerCount"] as? Number)?.toInt()

    val tags = listOfNotNull(
        location?.let { "📍 $it" },
        playerCount?.let { "👥 ${it}명" },
        "📅 $date"
    )

    Surface(
        modifier = Modifier
            .padding(top = 8.dp)
            .widthIn(min = 280.dp, max = 320.dp),
        shape = RoundedCornerShape(12.dp),
        color = ParkPrimary.copy(alpha = 0.1f),
        border = BorderStroke(1.dp, ParkPrimary.copy(alpha = 0.2f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = "네! 검색할게요 🏌️",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            if (tags.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    tags.forEach { tag ->
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f)
                        ) {
                            Text(
                                text = tag,
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
