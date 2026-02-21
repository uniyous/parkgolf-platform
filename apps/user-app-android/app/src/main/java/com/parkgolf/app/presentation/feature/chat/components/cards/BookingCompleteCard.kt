package com.parkgolf.app.presentation.feature.chat.components.cards

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.ParkOnPrimary
import com.parkgolf.app.presentation.theme.ParkPrimary
import java.text.NumberFormat
import java.util.Locale

@Composable
fun BookingCompleteCard(data: Map<String, Any?>) {
    val confirmationNumber = data["confirmationNumber"]?.toString() ?: ""

    @Suppress("UNCHECKED_CAST")
    val details = data["details"] as? Map<String, Any?> ?: emptyMap()
    val date = details["date"]?.toString() ?: ""
    val time = details["time"]?.toString() ?: ""
    val playerCount = (details["playerCount"] as? Number)?.toInt() ?: 0
    val totalPrice = (details["totalPrice"] as? Number)?.toInt() ?: 0
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = ParkPrimary.copy(alpha = 0.1f),
        border = BorderStroke(1.dp, ParkPrimary.copy(alpha = 0.2f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = ParkPrimary
                )
                Text(
                    text = "예약 완료",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = ParkPrimary
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                InfoRow(icon = Icons.Default.Tag, label = "예약번호", value = confirmationNumber)
                InfoRow(icon = Icons.Default.CalendarToday, value = "$date $time")
                InfoRow(icon = Icons.Default.Group, value = "${playerCount}명")
                InfoRow(icon = Icons.Default.Payment, value = "₩${numberFormat.format(totalPrice)}")
            }
        }
    }
}

@Composable
private fun InfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String? = null,
    value: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(14.dp),
            tint = ParkOnPrimary.copy(alpha = 0.4f)
        )
        if (label != null) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = ParkOnPrimary.copy(alpha = 0.4f)
            )
        }
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            color = ParkOnPrimary.copy(alpha = 0.7f)
        )
    }
}
