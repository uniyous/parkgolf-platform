package com.parkgolf.app.presentation.feature.chat.components.cards

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.GolfCourse
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.parkgolf.app.presentation.theme.GlassCard
import com.parkgolf.app.presentation.theme.ParkOnPrimary
import com.parkgolf.app.presentation.theme.ParkPrimary
import java.text.NumberFormat
import java.time.LocalDate
import java.util.Locale

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SlotCard(
    data: Map<String, Any?>,
    onSelect: ((String, String, Int) -> Unit)? = null,
    selectedSlotId: String? = null
) {
    val clubName = data["clubName"]?.toString() ?: ""
    val clubAddress = data["clubAddress"]?.toString() ?: ""
    val date = data["date"]?.toString() ?: ""
    @Suppress("UNCHECKED_CAST")
    val rounds = (data["rounds"] as? List<*>)?.filterIsInstance<Map<String, Any?>>()
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)
    val hasSelection = selectedSlotId != null

    // ── 라운드 그룹 레이아웃 ──
    if (!rounds.isNullOrEmpty()) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = GlassCard
        ) {
            Column {
                // 골프장 헤더
                if (clubName.isNotEmpty()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                Icons.Default.GolfCourse,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = ParkPrimary
                            )
                            Text(
                                text = clubName,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = ParkOnPrimary
                            )
                        }
                        if (clubAddress.isNotEmpty()) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    Icons.Default.LocationOn,
                                    contentDescription = null,
                                    modifier = Modifier.size(12.dp),
                                    tint = ParkOnPrimary.copy(alpha = 0.5f)
                                )
                                Text(
                                    text = clubAddress,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = ParkOnPrimary.copy(alpha = 0.5f),
                                    maxLines = 1
                                )
                            }
                        }
                        if (date.isNotEmpty()) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    Icons.Default.CalendarToday,
                                    contentDescription = null,
                                    modifier = Modifier.size(12.dp),
                                    tint = ParkOnPrimary.copy(alpha = 0.5f)
                                )
                                Text(
                                    text = formatDateKorean(date),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = ParkOnPrimary.copy(alpha = 0.5f)
                                )
                            }
                        }
                    }
                    HorizontalDivider(color = ParkOnPrimary.copy(alpha = 0.1f))
                }

                // 게임 라운드 목록
                rounds.forEachIndexed { index, round ->
                    val roundName = round["name"]?.toString() ?: ""
                    val roundPrice = (round["price"] as? Number)?.toInt() ?: 0
                    @Suppress("UNCHECKED_CAST")
                    val slots = (round["slots"] as? List<*>)
                        ?.filterIsInstance<Map<String, Any?>>() ?: emptyList()

                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // 라운드 헤더: 이름 + 가격
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = roundName,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = ParkOnPrimary
                            )
                            Text(
                                text = "₩${numberFormat.format(roundPrice)}",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold,
                                color = ParkPrimary
                            )
                        }

                        // 타임슬롯 칩
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            slots.forEach { slot ->
                                val slotId = slot["id"]?.toString() ?: ""
                                val time = slot["time"]?.toString() ?: ""
                                val availableSpots = (slot["availableSpots"] as? Number)?.toInt()
                                val isSelected = selectedSlotId == slotId
                                val isDisabled = hasSelection && !isSelected

                                TimeSlotChip(
                                    time = time,
                                    availableSpots = availableSpots,
                                    isSelected = isSelected,
                                    isDisabled = isDisabled,
                                    onClick = { onSelect?.invoke(slotId, time, roundPrice) }
                                )
                            }
                        }
                    }

                    if (index < rounds.size - 1) {
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = ParkOnPrimary.copy(alpha = 0.06f)
                        )
                    }
                }
            }
        }
        return
    }

    // ── 하위 호환: flat slots 레이아웃 ──
    @Suppress("UNCHECKED_CAST")
    val slots = (data["slots"] as? List<*>)?.filterIsInstance<Map<String, Any?>>() ?: return

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
                    val isSelected = selectedSlotId == id
                    val isDisabled = hasSelection && !isSelected

                    Surface(
                        onClick = { if (!isDisabled) onSelect?.invoke(id, time, price) },
                        enabled = onSelect != null && !isDisabled,
                        shape = RoundedCornerShape(12.dp),
                        color = GlassCard,
                        border = if (isSelected) BorderStroke(1.5.dp, ParkPrimary.copy(alpha = 0.4f)) else null,
                        modifier = Modifier
                            .weight(1f)
                            .alpha(if (isDisabled) 0.5f else 1f)
                    ) {
                        Box {
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

                            if (isSelected) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = "선택됨",
                                    modifier = Modifier
                                        .size(18.dp)
                                        .align(Alignment.TopEnd)
                                        .padding(top = 4.dp, end = 4.dp),
                                    tint = ParkPrimary
                                )
                            }
                        }
                    }
                }
                if (rowSlots.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun TimeSlotChip(
    time: String,
    availableSpots: Int? = null,
    isSelected: Boolean,
    isDisabled: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        enabled = !isDisabled,
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) ParkPrimary.copy(alpha = 0.15f)
        else ParkOnPrimary.copy(alpha = 0.08f),
        border = if (isSelected) BorderStroke(1.5.dp, ParkPrimary)
        else BorderStroke(1.dp, ParkOnPrimary.copy(alpha = 0.15f)),
        modifier = Modifier.alpha(if (isDisabled) 0.4f else 1f)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            if (isSelected) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = ParkPrimary
                )
            }
            Text(
                text = time,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) ParkPrimary else ParkOnPrimary
            )
            if (availableSpots != null) {
                Text(
                    text = "${availableSpots}명",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (isSelected) ParkPrimary.copy(alpha = 0.7f)
                    else ParkOnPrimary.copy(alpha = 0.5f)
                )
            }
        }
    }
}

private fun formatDateKorean(dateStr: String): String {
    return try {
        val date = LocalDate.parse(dateStr)
        val dayOfWeek = when (date.dayOfWeek.value) {
            1 -> "월"; 2 -> "화"; 3 -> "수"; 4 -> "목"
            5 -> "금"; 6 -> "토"; 7 -> "일"; else -> ""
        }
        "${date.year}년 ${date.monthValue}월 ${date.dayOfMonth}일 (${dayOfWeek})"
    } catch (e: Exception) {
        dateStr
    }
}
