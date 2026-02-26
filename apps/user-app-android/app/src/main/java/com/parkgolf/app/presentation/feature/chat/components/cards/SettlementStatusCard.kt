package com.parkgolf.app.presentation.feature.chat.components.cards

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.*
import java.text.NumberFormat
import java.util.Locale

@Composable
fun SettlementStatusCard(
    data: Map<String, Any?>
) {
    val groupNumber = data["groupNumber"]?.toString() ?: ""
    val totalParticipants = (data["totalParticipants"] as? Number)?.toInt() ?: 0
    val paidCount = (data["paidCount"] as? Number)?.toInt() ?: 0
    val pricePerPerson = (data["pricePerPerson"] as? Number)?.toInt() ?: 0
    val totalPrice = (data["totalPrice"] as? Number)?.toInt() ?: 0
    val allPaid = paidCount == totalParticipants
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)

    @Suppress("UNCHECKED_CAST")
    val participants = (data["participants"] as? List<Map<String, Any?>>)?.map { p ->
        ParticipantInfo(
            userName = p["userName"]?.toString() ?: "",
            status = p["status"]?.toString() ?: "PENDING"
        )
    } ?: emptyList()

    val progress = if (totalParticipants > 0) paidCount.toFloat() / totalParticipants else 0f
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(500),
        label = "progress"
    )

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
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
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
                        text = "정산 현황",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = ParkOnPrimary
                    )
                }
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (allPaid) ParkPrimary.copy(alpha = 0.2f)
                    else ParkWarning.copy(alpha = 0.2f)
                ) {
                    Text(
                        text = if (allPaid) "완료" else "$paidCount/$totalParticipants",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Medium,
                        color = if (allPaid) ParkPrimary else ParkWarning,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }

            // Progress bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(ParkOnPrimary.copy(alpha = 0.1f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(animatedProgress)
                        .clip(RoundedCornerShape(3.dp))
                        .background(if (allPaid) ParkPrimary else ParkWarning)
                )
            }

            // Amount
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "1인당 ${numberFormat.format(pricePerPerson)}원",
                    style = MaterialTheme.typography.labelSmall,
                    color = ParkOnPrimary.copy(alpha = 0.6f)
                )
                Text(
                    text = "총 ${numberFormat.format(totalPrice)}원",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Medium,
                    color = ParkPrimary
                )
            }

            // Participants
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                participants.forEach { p ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = p.userName,
                            style = MaterialTheme.typography.labelMedium,
                            color = ParkOnPrimary.copy(alpha = 0.7f)
                        )
                        when (p.status) {
                            "PAID" -> Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    modifier = Modifier.size(12.dp),
                                    tint = ParkPrimary
                                )
                                Text(
                                    "완료",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ParkPrimary
                                )
                            }
                            "CANCELLED" -> Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    Icons.Default.Cancel,
                                    contentDescription = null,
                                    modifier = Modifier.size(12.dp),
                                    tint = ParkError
                                )
                                Text(
                                    "취소",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ParkError
                                )
                            }
                            else -> Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    Icons.Default.Schedule,
                                    contentDescription = null,
                                    modifier = Modifier.size(12.dp),
                                    tint = ParkWarning
                                )
                                Text(
                                    "대기",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ParkWarning
                                )
                            }
                        }
                    }
                }
            }

            // Group number
            HorizontalDivider(color = ParkOnPrimary.copy(alpha = 0.05f))
            Text(
                text = groupNumber,
                style = MaterialTheme.typography.labelSmall,
                color = ParkOnPrimary.copy(alpha = 0.3f),
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        }
    }
}

private data class ParticipantInfo(
    val userName: String,
    val status: String
)
