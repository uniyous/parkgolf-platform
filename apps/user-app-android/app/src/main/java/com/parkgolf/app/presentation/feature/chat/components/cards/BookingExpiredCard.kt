package com.parkgolf.app.presentation.feature.chat.components.cards

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun BookingExpiredCard(data: Map<String, Any?>) {
    val reason = data["reason"]?.toString() ?: "결제 시간이 초과되었습니다"

    Surface(
        modifier = Modifier
            .padding(top = 8.dp)
            .widthIn(min = 280.dp, max = 320.dp),
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFFFFF3E0),
        border = BorderStroke(1.dp, Color(0xFFFFB74D).copy(alpha = 0.3f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = "⏰ $reason",
                fontSize = 14.sp,
                color = Color(0xFFF57C00)
            )
            Text(
                text = "다시 예약해 주세요",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}
