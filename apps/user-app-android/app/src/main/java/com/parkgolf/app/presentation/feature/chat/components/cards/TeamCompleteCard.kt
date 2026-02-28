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
fun TeamCompleteCard(
    data: Map<String, Any?>,
    onNextTeam: (() -> Unit)? = null,
    onFinish: (() -> Unit)? = null
) {
    val teamNumber = (data["teamNumber"] as? Number)?.toInt() ?: 1
    val bookingNumber = data["bookingNumber"]?.toString() ?: ""
    val clubName = data["clubName"]?.toString() ?: ""
    val date = data["date"]?.toString() ?: ""
    val slotTime = data["slotTime"]?.toString() ?: ""
    val courseName = data["courseName"]?.toString() ?: ""
    val totalPrice = (data["totalPrice"] as? Number)?.toInt() ?: 0
    val paymentMethod = data["paymentMethod"]?.toString() ?: "onsite"
    val hasMoreTeams = data["hasMoreTeams"] as? Boolean ?: false
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)

    @Suppress("UNCHECKED_CAST")
    val participants = (data["participants"] as? List<Map<String, Any?>>) ?: emptyList()
    val participantNames = participants.mapNotNull { it["userName"]?.toString() }

    val paymentLabel = when (paymentMethod) {
        "dutchpay" -> "더치페이"
        "card" -> "카드결제"
        else -> "현장결제"
    }

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
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = ParkPrimary
                )
                Text(
                    text = "팀${teamNumber} 예약 완료",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = ParkPrimary
                )
            }

            // Booking info
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = ParkPrimary
                    )
                    Text(
                        text = clubName,
                        style = MaterialTheme.typography.bodySmall,
                        color = ParkOnPrimary.copy(alpha = 0.7f)
                    )
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.AccessTime,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = ParkPrimary
                    )
                    Text(
                        text = "$date $slotTime · $courseName",
                        style = MaterialTheme.typography.bodySmall,
                        color = ParkOnPrimary.copy(alpha = 0.7f)
                    )
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.Group,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = ParkPrimary
                    )
                    Text(
                        text = participantNames.joinToString(", "),
                        style = MaterialTheme.typography.bodySmall,
                        color = ParkOnPrimary.copy(alpha = 0.7f)
                    )
                }
            }

            // Price & payment method
            HorizontalDivider(color = ParkOnPrimary.copy(alpha = 0.1f))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = paymentLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = ParkOnPrimary.copy(alpha = 0.5f)
                )
                Text(
                    text = "${numberFormat.format(totalPrice)}원",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = ParkPrimary
                )
            }

            // Booking number
            Text(
                text = bookingNumber,
                style = MaterialTheme.typography.labelSmall,
                color = ParkOnPrimary.copy(alpha = 0.3f),
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )

            // Action buttons
            if (onNextTeam != null || onFinish != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (onFinish != null) {
                        if (hasMoreTeams) {
                            OutlinedButton(
                                onClick = onFinish,
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = ParkOnPrimary.copy(alpha = 0.7f)
                                ),
                                border = BorderStroke(1.dp, ParkOnPrimary.copy(alpha = 0.2f))
                            ) {
                                Text("종료", style = MaterialTheme.typography.bodySmall)
                            }
                        } else {
                            Button(
                                onClick = onFinish,
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = ParkPrimary)
                            ) {
                                Text("종료", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                    if (hasMoreTeams && onNextTeam != null) {
                        Button(
                            onClick = onNextTeam,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = ParkPrimary)
                        ) {
                            Text("다음 팀 예약", style = MaterialTheme.typography.bodySmall)
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                Icons.Default.ArrowForward,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
