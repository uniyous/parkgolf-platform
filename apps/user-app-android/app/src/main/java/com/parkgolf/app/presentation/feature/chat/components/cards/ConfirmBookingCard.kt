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

    // 그룹 모드 관련
    val groupMode = data["groupMode"] as? Boolean ?: false
    val teamNumber = (data["teamNumber"] as? Number)?.toInt()
    val pricePerPerson = (data["pricePerPerson"] as? Number)?.toInt()
    @Suppress("UNCHECKED_CAST")
    val members = (data["members"] as? List<Map<String, Any?>>) ?: emptyList()
    val memberNames = members.mapNotNull { it["userName"]?.toString() }

    var paymentMethod by remember { mutableStateOf(if (groupMode) "dutchpay" else "onsite") }

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
                text = if (teamNumber != null) "팀${teamNumber} 예약 정보 확인" else "예약 정보 확인",
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                color = ParkOnPrimary
            )

            // 예약 정보
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                InfoRow(icon = Icons.Default.LocationOn, value = clubName)
                InfoRow(icon = Icons.Default.CalendarToday, value = formatDateKorean(date))
                InfoRow(icon = Icons.Default.AccessTime, value = time)
                if (memberNames.isNotEmpty()) {
                    InfoRow(icon = Icons.Default.Group, value = memberNames.joinToString(", "))
                } else {
                    InfoRow(icon = Icons.Default.Group, value = "${playerCount}명")
                }
                val priceText = if (isFree) "무료" else {
                    val base = "₩${numberFormat.format(price)}"
                    if (pricePerPerson != null && pricePerPerson > 0) {
                        "$base (1인 ${numberFormat.format(pricePerPerson)}원)"
                    } else base
                }
                InfoRow(icon = Icons.Default.Payment, value = priceText)
            }

            // 결제방법 선택
            if (!isFree) {
                Column {
                    Text(
                        text = "결제방법",
                        style = MaterialTheme.typography.labelMedium,
                        color = ParkOnPrimary.copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    if (groupMode) {
                        // 그룹모드: 3옵션 (더치페이 기본)
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                PaymentMethodButton(
                                    icon = Icons.Default.GroupWork,
                                    label = "더치페이",
                                    isSelected = paymentMethod == "dutchpay",
                                    selectedColor = ParkPrimary,
                                    onClick = { paymentMethod = "dutchpay" },
                                    modifier = Modifier.weight(1f)
                                )
                                PaymentMethodButton(
                                    icon = Icons.Default.Store,
                                    label = "현장결제",
                                    isSelected = paymentMethod == "onsite",
                                    onClick = { paymentMethod = "onsite" },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            PaymentMethodButton(
                                icon = Icons.Default.CreditCard,
                                label = "카드결제",
                                isSelected = paymentMethod == "card",
                                selectedColor = ParkInfo,
                                onClick = { paymentMethod = "card" },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    } else {
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
                            Text("취소", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                    if (onConfirm != null) {
                        Button(
                            onClick = { onConfirm(if (isFree) "onsite" else paymentMethod) },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = ParkPrimary)
                        ) {
                            Text("예약 확인", style = MaterialTheme.typography.bodyMedium)
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
                style = MaterialTheme.typography.labelLarge,
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
            style = MaterialTheme.typography.bodyMedium,
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
