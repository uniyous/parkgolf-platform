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
import java.text.NumberFormat
import java.time.LocalDate
import java.util.Locale

@Composable
fun ConfirmBookingCard(
    data: Map<String, Any?>,
    onConfirm: ((String) -> Unit)? = null,
    onCancel: (() -> Unit)? = null
) {
    val clubName = data["clubName"]?.toString() ?: ""
    val date = data["date"]?.toString() ?: ""
    val time = data["time"]?.toString() ?: ""
    val playerCount = (data["playerCount"] as? Number)?.toInt() ?: 0
    val price = (data["price"] as? Number)?.toInt() ?: 0
    val isFree = price == 0
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)
    var paymentMethod by remember { mutableStateOf("onsite") }

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
            Text(
                text = "예약 정보 확인",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = ParkOnPrimary
            )

            // 예약 정보
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                InfoRow(icon = Icons.Default.LocationOn, value = clubName)
                InfoRow(icon = Icons.Default.CalendarToday, value = formatDateKorean(date))
                InfoRow(icon = Icons.Default.AccessTime, value = time)
                InfoRow(icon = Icons.Default.Group, value = "${playerCount}명")
                InfoRow(
                    icon = Icons.Default.Payment,
                    value = if (isFree) "무료" else "₩${numberFormat.format(price)}"
                )
            }

            // 결제방법 선택
            if (!isFree) {
                Column {
                    Text(
                        text = "결제방법",
                        style = MaterialTheme.typography.labelSmall,
                        color = ParkOnPrimary.copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PaymentMethodButton(
                            icon = Icons.Default.Store,
                            label = "현장결제",
                            isSelected = paymentMethod == "onsite",
                            onClick = { paymentMethod = "onsite" },
                            modifier = Modifier.weight(1f)
                        )
                        PaymentMethodButton(
                            icon = Icons.Default.CreditCard,
                            label = "카드결제",
                            isSelected = paymentMethod == "card",
                            selectedColor = ParkInfo,
                            onClick = { paymentMethod = "card" },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // 버튼
            if (onConfirm != null || onCancel != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (onCancel != null) {
                        OutlinedButton(
                            onClick = onCancel,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = ParkOnPrimary.copy(alpha = 0.7f)
                            ),
                            border = BorderStroke(1.dp, ParkOnPrimary.copy(alpha = 0.2f))
                        ) {
                            Text("취소", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    if (onConfirm != null) {
                        Button(
                            onClick = { onConfirm(if (isFree) "onsite" else paymentMethod) },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = ParkPrimary)
                        ) {
                            Text("예약 확인", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PaymentMethodButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    isSelected: Boolean,
    selectedColor: androidx.compose.ui.graphics.Color = ParkPrimary,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) selectedColor.copy(alpha = 0.15f)
        else ParkOnPrimary.copy(alpha = 0.05f),
        border = BorderStroke(
            1.dp,
            if (isSelected) selectedColor.copy(alpha = 0.5f)
            else ParkOnPrimary.copy(alpha = 0.1f)
        ),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(14.dp),
                tint = if (isSelected) selectedColor else ParkOnPrimary.copy(alpha = 0.5f)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Medium,
                color = if (isSelected) selectedColor else ParkOnPrimary.copy(alpha = 0.5f)
            )
        }
    }
}

@Composable
private fun InfoRow(
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
            tint = ParkPrimary
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
