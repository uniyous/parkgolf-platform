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
fun BookingFailedCard(data: Map<String, Any?>) {
    val reason = data["reason"]?.toString() ?: "예약에 실패했습니다"

    Surface(
        modifier = Modifier
            .padding(top = 8.dp)
            .widthIn(min = 280.dp, max = 320.dp),
        shape = RoundedCornerShape(12.dp),
        color = Color.Red.copy(alpha = 0.1f),
        border = BorderStroke(1.dp, Color.Red.copy(alpha = 0.2f))
    ) {
        Text(
            text = "❌ $reason",
            fontSize = 14.sp,
            color = Color.Red.copy(alpha = 0.8f),
            modifier = Modifier.padding(12.dp)
        )
    }
}
