package com.parkgolf.app.presentation.feature.chat.components.cards

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.*
import kotlinx.coroutines.delay
import java.text.NumberFormat
import java.time.LocalDate
import java.util.Locale

private const val PAYMENT_TIMEOUT_SECONDS = 10 * 60 // 10분

@Composable
fun PaymentCard(
    data: Map<String, Any?>,
    onPaymentComplete: ((Boolean) -> Unit)? = null
) {
    val clubName = data["clubName"]?.toString() ?: ""
    val date = data["date"]?.toString() ?: ""
    val time = data["time"]?.toString() ?: ""
    val playerCount = (data["playerCount"] as? Number)?.toInt() ?: 0
    val amount = (data["amount"] as? Number)?.toInt() ?: 0
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)

    var remainingSeconds by remember { mutableIntStateOf(PAYMENT_TIMEOUT_SECONDS) }
    var isPaying by remember { mutableStateOf(false) }
    var isExpired by remember { mutableStateOf(false) }

    // 카운트다운 타이머
    LaunchedEffect(Unit) {
        while (remainingSeconds > 0 && !isExpired && !isPaying) {
            delay(1000)
            remainingSeconds--
            if (remainingSeconds <= 0) {
                isExpired = true
                onPaymentComplete?.invoke(false)
            }
        }
    }

    val isUrgent = remainingSeconds < 60
    val timerText = String.format(
        Locale.getDefault(),
        "%02d:%02d",
        remainingSeconds / 60,
        remainingSeconds % 60
    )

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = ParkInfo.copy(alpha = 0.05f),
        border = BorderStroke(1.dp, ParkInfo.copy(alpha = 0.2f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // 헤더
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.CreditCard,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = ParkInfo
                )
                Text(
                    text = "카드결제",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = ParkOnPrimary
                )
            }

            // 결제 정보
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                PaymentInfoRow(icon = Icons.Default.LocationOn, value = clubName)
                PaymentInfoRow(
                    icon = Icons.Default.CalendarToday,
                    value = "${formatDateKorean(date)} $time"
                )
                PaymentInfoRow(icon = Icons.Default.Group, value = "${playerCount}명")
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.Payment,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = ParkInfo
                    )
                    Text(
                        text = "₩${numberFormat.format(amount)}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold,
                        color = ParkOnPrimary
                    )
                }
            }

            // 타이머
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = when {
                    isExpired -> ParkError.copy(alpha = 0.1f)
                    isUrgent -> ParkWarning.copy(alpha = 0.1f)
                    else -> ParkOnPrimary.copy(alpha = 0.05f)
                }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.Timer,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = when {
                            isExpired -> ParkError
                            isUrgent -> ParkWarning
                            else -> ParkOnPrimary.copy(alpha = 0.5f)
                        }
                    )
                    Text(
                        text = if (isExpired) "결제 시간이 만료되었습니다"
                        else "결제 제한시간: $timerText 남음",
                        style = MaterialTheme.typography.labelSmall,
                        color = when {
                            isExpired -> ParkError
                            isUrgent -> ParkWarning
                            else -> ParkOnPrimary.copy(alpha = 0.5f)
                        }
                    )
                }
            }

            // 버튼
            if (!isExpired) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { onPaymentComplete?.invoke(false) },
                        enabled = !isPaying,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = ParkOnPrimary.copy(alpha = 0.7f)
                        ),
                        border = BorderStroke(1.dp, ParkOnPrimary.copy(alpha = 0.2f))
                    ) {
                        Text("예약 취소", style = MaterialTheme.typography.bodySmall)
                    }
                    Button(
                        onClick = {
                            isPaying = true
                            // TODO: Toss SDK requestPayment(orderId)
                            onPaymentComplete?.invoke(true)
                        },
                        enabled = !isPaying,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = ParkInfo)
                    ) {
                        if (isPaying) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(14.dp),
                                    strokeWidth = 2.dp,
                                    color = ParkOnPrimary
                                )
                                Text("결제 중...", style = MaterialTheme.typography.bodySmall)
                            }
                        } else {
                            Text("결제하기", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PaymentInfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
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
            tint = ParkInfo
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            color = ParkOnPrimary.copy(alpha = 0.7f)
        )
    }
}

private fun formatDateKorean(dateStr: String): String {
    return try {
        val date = LocalDate.parse(dateStr)
        val dayOfWeek = when (date.dayOfWeek.value) {
            1 -> "월"; 2 -> "화"; 3 -> "수"; 4 -> "목"
            5 -> "금"; 6 -> "토"; 7 -> "일"; else -> ""
        }
        "$dateStr (${dayOfWeek})"
    } catch (e: Exception) {
        dateStr
    }
}
