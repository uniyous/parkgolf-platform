package com.parkgolf.app.presentation.feature.chat.components.cards

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.GlassCard
import com.parkgolf.app.presentation.theme.ParkOnPrimary
import com.parkgolf.app.presentation.theme.ParkPrimary
import java.text.NumberFormat
import java.util.Locale

@Composable
fun SlotCard(
    data: Map<String, Any?>,
    onSelect: ((String, String) -> Unit)? = null
) {
    @Suppress("UNCHECKED_CAST")
    val slots = (data["slots"] as? List<*>)?.filterIsInstance<Map<String, Any?>>() ?: return
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)

    val rows = slots.chunked(2)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        rows.forEach { rowSlots ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                rowSlots.forEach { slot ->
                    val id = slot["id"]?.toString() ?: ""
                    val time = slot["time"]?.toString() ?: ""
                    val courseName = slot["courseName"]?.toString() ?: ""
                    val price = (slot["price"] as? Number)?.toInt() ?: 0

                    Surface(
                        onClick = { onSelect?.invoke(id, time) },
                        enabled = onSelect != null,
                        shape = RoundedCornerShape(12.dp),
                        color = GlassCard,
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    Icons.Default.AccessTime,
                                    contentDescription = null,
                                    modifier = Modifier.size(12.dp),
                                    tint = ParkPrimary
                                )
                                Text(
                                    text = time,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = ParkOnPrimary
                                )
                            }
                            Text(
                                text = courseName,
                                style = MaterialTheme.typography.bodySmall,
                                color = ParkOnPrimary.copy(alpha = 0.6f)
                            )
                            Text(
                                text = "₩${numberFormat.format(price)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = ParkPrimary
                            )
                        }
                    }
                }
                // Fill remaining space if odd number
                if (rowSlots.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
