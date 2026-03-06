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
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.*
import kotlinx.coroutines.delay
import java.text.NumberFormat
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Locale

private data class ParticipantInfo(
    val userId: Int,
    val userName: String,
    val orderId: String,
    val amount: Int,
    val status: String,
    val expiredAt: String
)

private fun parseParticipants(data: Map<String, Any?>): List<ParticipantInfo> {
    @Suppress("UNCHECKED_CAST")
    val participants = (data["participants"] as? List<Map<String, Any?>>) ?: emptyList()
    return participants.map { p ->
        ParticipantInfo(
            userId = (p["userId"] as? Number)?.toInt() ?: 0,
            userName = p["userName"]?.toString() ?: "",
            orderId = p["orderId"]?.toString() ?: "",
            amount = (p["amount"] as? Number)?.toInt() ?: 0,
            status = p["status"]?.toString() ?: "PENDING",
            expiredAt = p["expiredAt"]?.toString() ?: ""
        )
    }
}

@Composable
fun SettlementStatusCard(
    data: Map<String, Any?>,
    currentUserId: Int? = null,
    onSplitPaymentComplete: ((Boolean, String) -> Unit)? = null,
    onRequestSplitPayment: ((orderId: String, amount: Int) -> Unit)? = null,
    onSendReminder: (() -> Unit)? = null,
    onRefresh: (() -> Unit)? = null
) {
    val bookerId = (data["bookerId"] as? Number)?.toInt()
    val participants = remember(data) { parseParticipants(data) }

    // 부커이거나 currentUserId가 없으면 대시보드
    if (currentUserId == null || currentUserId == bookerId) {
        BookerDashboardView(
            data = data,
            participants = participants,
            onSendReminder = onSendReminder,
            onRefresh = onRefresh
        )
        return
    }

    // 참여자 찾기
    val myParticipant = participants.find { it.userId == currentUserId }

    if (myParticipant == null) {
        BookerDashboardView(
            data = data,
            participants = participants,
            onSendReminder = onSendReminder,
            onRefresh = onRefresh
        )
        return
    }

    when (myParticipant.status) {
        "PAID" -> ParticipantPaidView(participant = myParticipant)
        else -> ParticipantPaymentView(
            participant = myParticipant,
            clubName = data["clubName"]?.toString() ?: "",
            gameName = data["gameName"]?.toString() ?: "",
            date = data["date"]?.toString() ?: "",
            slotTime = data["slotTime"]?.toString() ?: "",
            onPay = { orderId ->
                if (onRequestSplitPayment != null) {
                    onRequestSplitPayment(orderId, myParticipant.amount)
                } else {
                    onSplitPaymentComplete?.invoke(true, orderId)
                }
            }
        )
    }
}

@Composable
private fun BookerDashboardView(
    data: Map<String, Any?>,
    participants: List<ParticipantInfo>,
    onSendReminder: (() -> Unit)? = null,
    onRefresh: (() -> Unit)? = null
) {
    val groupNumber = data["groupNumber"]?.toString() ?: ""
    val totalParticipants = (data["totalParticipants"] as? Number)?.toInt() ?: 0
    val paidCount = (data["paidCount"] as? Number)?.toInt() ?: 0
    val pricePerPerson = (data["pricePerPerson"] as? Number)?.toInt() ?: 0
    val totalPrice = (data["totalPrice"] as? Number)?.toInt() ?: 0
    val expiredAt = data["expiredAt"]?.toString() ?: ""
    val allPaid = paidCount == totalParticipants
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)

    val progress = if (totalParticipants > 0) paidCount.toFloat() / totalParticipants else 0f
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(500),
        label = "progress"
    )

    // Countdown timer
    var remainingSeconds by remember { mutableIntStateOf(-1) }
    var isExpired by remember { mutableStateOf(false) }

    LaunchedEffect(expiredAt) {
        if (expiredAt.isBlank() || allPaid) return@LaunchedEffect
        try {
            val expiry = Instant.parse(expiredAt)
            while (true) {
                val diff = ChronoUnit.SECONDS.between(Instant.now(), expiry).toInt()
                if (diff <= 0) {
                    isExpired = true
                    remainingSeconds = 0
                    break
                }
                remainingSeconds = diff
                delay(1000)
            }
        } catch (_: Exception) { }
    }

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
                        style = MaterialTheme.typography.bodyLarge,
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
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Medium,
                        color = if (allPaid) ParkPrimary else ParkWarning,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }

            // Countdown timer (booker only)
            if (!allPaid && remainingSeconds >= 0 && !isExpired) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        Icons.Default.Timer,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = ParkWarning
                    )
                    val m = remainingSeconds / 60
                    val s = remainingSeconds % 60
                    Text(
                        text = "${"%02d".format(m)}:${"%02d".format(s)} 남음",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Medium,
                        color = ParkWarning
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
                    style = MaterialTheme.typography.labelMedium,
                    color = ParkOnPrimary.copy(alpha = 0.6f)
                )
                Text(
                    text = "총 ${numberFormat.format(totalPrice)}원",
                    style = MaterialTheme.typography.labelMedium,
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
                            style = MaterialTheme.typography.labelLarge,
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
                                Text("완료", style = MaterialTheme.typography.labelMedium, color = ParkPrimary)
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
                                Text("취소", style = MaterialTheme.typography.labelMedium, color = ParkError)
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
                                Text("대기", style = MaterialTheme.typography.labelMedium, color = ParkWarning)
                            }
                        }
                    }
                }
            }

            // Group number
            HorizontalDivider(color = ParkOnPrimary.copy(alpha = 0.05f))
            Text(
                text = groupNumber,
                style = MaterialTheme.typography.labelMedium,
                color = ParkOnPrimary.copy(alpha = 0.3f),
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )

            // Reminder + Refresh buttons (booker only, when not all paid)
            if (!allPaid && (onSendReminder != null || onRefresh != null)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (onSendReminder != null) {
                        OutlinedButton(
                            onClick = onSendReminder,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = ParkWarning
                            ),
                            border = BorderStroke(1.dp, ParkWarning.copy(alpha = 0.3f))
                        ) {
                            Icon(
                                Icons.Default.Notifications,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("리마인더", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                    if (onRefresh != null) {
                        OutlinedButton(
                            onClick = onRefresh,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = ParkOnPrimary.copy(alpha = 0.7f)
                            ),
                            border = BorderStroke(1.dp, ParkOnPrimary.copy(alpha = 0.2f))
                        ) {
                            Icon(
                                Icons.Default.Refresh,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("새로고침", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ParticipantPaymentView(
    participant: ParticipantInfo,
    clubName: String = "",
    gameName: String = "",
    date: String = "",
    slotTime: String = "",
    onPay: (String) -> Unit
) {
    var isPaying by remember { mutableStateOf(false) }
    var remainingSeconds by remember { mutableIntStateOf(-1) }
    var isExpired by remember { mutableStateOf(false) }
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)

    // 카운트다운 (expiredAt 기준)
    LaunchedEffect(participant.expiredAt) {
        if (participant.expiredAt.isBlank()) return@LaunchedEffect
        try {
            val expiry = Instant.parse(participant.expiredAt)
            while (true) {
                val diff = ChronoUnit.SECONDS.between(Instant.now(), expiry).toInt()
                if (diff <= 0) {
                    isExpired = true
                    remainingSeconds = 0
                    break
                }
                remainingSeconds = diff
                delay(1000)
            }
        } catch (_: Exception) {
            // ignore parse errors
        }
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = ParkPrimary.copy(alpha = 0.05f),
        border = BorderStroke(1.dp, ParkPrimary.copy(alpha = 0.2f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.CreditCard,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = ParkPrimary
                )
                Text(
                    text = "결제 요청",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = ParkOnPrimary
                )
            }

            // 골프장/코스/날짜/시간 정보
            if (clubName.isNotBlank() || gameName.isNotBlank() || date.isNotBlank() || slotTime.isNotBlank()) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (clubName.isNotBlank()) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                Icons.Default.Place,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = ParkOnPrimary.copy(alpha = 0.4f)
                            )
                            Text(
                                text = clubName,
                                style = MaterialTheme.typography.labelMedium,
                                color = ParkOnPrimary.copy(alpha = 0.6f)
                            )
                        }
                    }
                    if (gameName.isNotBlank()) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                Icons.Default.Flag,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = ParkOnPrimary.copy(alpha = 0.4f)
                            )
                            Text(
                                text = gameName,
                                style = MaterialTheme.typography.labelMedium,
                                color = ParkOnPrimary.copy(alpha = 0.6f)
                            )
                        }
                    }
                    val dateTime = listOf(date, slotTime).filter { it.isNotBlank() }.joinToString(" ")
                    if (dateTime.isNotBlank()) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                Icons.Default.Schedule,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = ParkOnPrimary.copy(alpha = 0.4f)
                            )
                            Text(
                                text = dateTime,
                                style = MaterialTheme.typography.labelMedium,
                                color = ParkOnPrimary.copy(alpha = 0.6f)
                            )
                        }
                    }
                }
            }

            Text(
                text = "${numberFormat.format(participant.amount)}원",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = ParkOnPrimary
            )
            Text(
                text = "더치페이 결제 금액",
                style = MaterialTheme.typography.labelMedium,
                color = ParkOnPrimary.copy(alpha = 0.5f)
            )

            // 카운트다운
            if (remainingSeconds >= 0 && !isExpired) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        Icons.Default.Timer,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = ParkWarning
                    )
                    val m = remainingSeconds / 60
                    val s = remainingSeconds % 60
                    Text(
                        text = "${"%02d".format(m)}:${"%02d".format(s)} 남음",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Medium,
                        color = ParkWarning
                    )
                }
            }

            if (isExpired) {
                Text(
                    text = "결제 시간이 만료되었습니다",
                    style = MaterialTheme.typography.labelMedium,
                    color = ParkError,
                    textAlign = TextAlign.Center
                )
            } else {
                Button(
                    onClick = {
                        if (!isPaying && participant.orderId.isNotBlank()) {
                            isPaying = true
                            onPay(participant.orderId)
                        }
                    },
                    enabled = !isPaying && participant.orderId.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ParkPrimary)
                ) {
                    if (isPaying) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = ParkOnPrimary,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("결제 처리 중...")
                    } else {
                        Text("결제하기", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun ParticipantPaidView(participant: ParticipantInfo) {
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = ParkPrimary.copy(alpha = 0.05f),
        border = BorderStroke(1.dp, ParkPrimary.copy(alpha = 0.3f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
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
                    text = "결제 완료",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = ParkPrimary
                )
            }
            Text(
                text = "${numberFormat.format(participant.amount)}원",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = ParkOnPrimary
            )
        }
    }
}
