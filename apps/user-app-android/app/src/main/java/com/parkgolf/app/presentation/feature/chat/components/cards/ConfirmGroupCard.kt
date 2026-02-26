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
import com.parkgolf.app.presentation.theme.*
import java.text.NumberFormat
import java.util.Locale

@Composable
fun ConfirmGroupCard(
    data: Map<String, Any?>,
    onConfirm: ((String) -> Unit)? = null,
    onCancel: (() -> Unit)? = null
) {
    val clubName = data["clubName"]?.toString() ?: ""
    val date = data["date"]?.toString() ?: ""
    val teamCount = (data["teamCount"] as? Number)?.toInt() ?: 0
    val maxParticipants = (data["maxParticipants"] as? Number)?.toInt() ?: 0
    val totalPrice = (data["totalPrice"] as? Number)?.toInt() ?: 0
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)

    @Suppress("UNCHECKED_CAST")
    val slots = (data["slots"] as? List<Map<String, Any?>>)?.map { slot ->
        SlotInfo(
            slotTime = slot["slotTime"]?.toString() ?: "",
            courseName = slot["courseName"]?.toString() ?: "",
            price = (slot["price"] as? Number)?.toInt() ?: 0
        )
    } ?: emptyList()

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = ParkPrimary.copy(alpha = 0.05f),
        border = BorderStroke(1.dp, ParkPrimary.copy(alpha = 0.2f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.Group,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = ParkPrimary
                )
                Text(
                    text = "그룹 예약 (${teamCount}팀)",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = ParkOnPrimary
                )
            }

            // Club & Date
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = null,
                    modifier = Modifier.size(12.dp),
                    tint = ParkOnPrimary.copy(alpha = 0.5f)
                )
                Text(
                    text = clubName,
                    style = MaterialTheme.typography.labelSmall,
                    color = ParkOnPrimary.copy(alpha = 0.5f)
                )
                Text(
                    text = " · ",
                    style = MaterialTheme.typography.labelSmall,
                    color = ParkOnPrimary.copy(alpha = 0.3f)
                )
                Text(
                    text = date,
                    style = MaterialTheme.typography.labelSmall,
                    color = ParkOnPrimary.copy(alpha = 0.5f)
                )
            }

            // Slots
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                slots.forEachIndexed { index, slot ->
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = ParkOnPrimary.copy(alpha = 0.03f),
                        border = BorderStroke(1.dp, ParkOnPrimary.copy(alpha = 0.05f))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "팀${index + 1}",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Medium,
                                    color = ParkPrimary
                                )
                                Icon(
                                    Icons.Default.AccessTime,
                                    contentDescription = null,
                                    modifier = Modifier.size(12.dp),
                                    tint = ParkOnPrimary.copy(alpha = 0.4f)
                                )
                                Text(
                                    text = slot.slotTime,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ParkOnPrimary.copy(alpha = 0.7f)
                                )
                                Text(
                                    text = " · ${slot.courseName}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ParkOnPrimary.copy(alpha = 0.4f)
                                )
                            }
                            Text(
                                text = "${numberFormat.format(slot.price)}원/인",
                                style = MaterialTheme.typography.labelSmall,
                                color = ParkOnPrimary.copy(alpha = 0.5f)
                            )
                        }
                    }
                }
            }

            // Summary
            HorizontalDivider(color = ParkOnPrimary.copy(alpha = 0.1f))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "최대 참여 인원",
                    style = MaterialTheme.typography.labelSmall,
                    color = ParkOnPrimary.copy(alpha = 0.6f)
                )
                Text(
                    text = "${maxParticipants}명",
                    style = MaterialTheme.typography.labelSmall,
                    color = ParkOnPrimary.copy(alpha = 0.6f)
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "예상 총액",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    color = ParkOnPrimary
                )
                Text(
                    text = "${numberFormat.format(totalPrice)}원",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    color = ParkPrimary
                )
            }

            // Payment method buttons
            if (onConfirm != null) {
                Text(
                    text = "결제 방법을 선택해주세요",
                    style = MaterialTheme.typography.labelSmall,
                    color = ParkOnPrimary.copy(alpha = 0.5f)
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { onConfirm("onsite") },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = ParkOnPrimary
                        ),
                        border = BorderStroke(1.dp, ParkOnPrimary.copy(alpha = 0.2f))
                    ) {
                        Icon(
                            Icons.Default.Store,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("현장결제", style = MaterialTheme.typography.labelMedium)
                    }
                    Button(
                        onClick = { onConfirm("dutchpay") },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = ParkPrimary)
                    ) {
                        Icon(
                            Icons.Default.CreditCard,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("더치페이", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }

            // Cancel
            if (onCancel != null) {
                TextButton(
                    onClick = onCancel,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        "취소",
                        style = MaterialTheme.typography.labelMedium,
                        color = ParkOnPrimary.copy(alpha = 0.4f)
                    )
                }
            }
        }
    }
}

private data class SlotInfo(
    val slotTime: String,
    val courseName: String,
    val price: Int
)
