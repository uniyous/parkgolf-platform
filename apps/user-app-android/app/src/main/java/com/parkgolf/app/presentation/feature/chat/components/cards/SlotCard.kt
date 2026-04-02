package com.parkgolf.app.presentation.feature.chat.components.cards

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.GolfCourse
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
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
import kotlin.math.ceil

private const val SLOTS_PER_PAGE = 4

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SlotCard(
    data: Map<String, Any?>,
    onSelect: ((String, String, Int, String?) -> Unit)? = null,
    selectedSlotId: String? = null
) {
    val clubName = data["clubName"]?.toString() ?: ""
    val clubAddress = data["clubAddress"]?.toString() ?: ""
    val date = data["date"]?.toString() ?: ""
    @Suppress("UNCHECKED_CAST")
    val rounds = (data["rounds"] as? List<*>)?.filterIsInstance<Map<String, Any?>>()
    val numberFormat = NumberFormat.getNumberInstance(Locale.KOREA)
    val hasSelection = selectedSlotId != null

    // 라운드별 페이지 상태
    val pages = remember { mutableStateMapOf<String, Int>() }

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
                                style = MaterialTheme.typography.titleMedium,
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
                                    style = MaterialTheme.typography.bodyMedium,
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
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = ParkOnPrimary.copy(alpha = 0.5f)
                                )
                            }
                        }
                    }
                    HorizontalDivider(color = ParkOnPrimary.copy(alpha = 0.1f))
                }

                // 게임 라운드 목록
                rounds.forEachIndexed { index, round ->
                    val gameId = round["gameId"]?.toString() ?: "$index"
                    val roundName = round["name"]?.toString() ?: ""
                    val roundPrice = (round["price"] as? Number)?.toInt() ?: 0
                    @Suppress("UNCHECKED_CAST")
                    val slots = (round["slots"] as? List<*>)
                        ?.filterIsInstance<Map<String, Any?>>() ?: emptyList()

                    val totalPages = maxOf(1, ceil(slots.size.toDouble() / SLOTS_PER_PAGE).toInt())
                    val currentPage = pages[gameId] ?: 0

                    // 선택된 슬롯이 이 라운드에 있으면 해당 페이지로 자동 이동
                    val selectedIdx = if (selectedSlotId != null) {
                        slots.indexOfFirst { it["id"]?.toString() == selectedSlotId }
                    } else -1
                    val effectivePage = if (selectedIdx >= 0) selectedIdx / SLOTS_PER_PAGE else currentPage

                    val start = effectivePage * SLOTS_PER_PAGE
                    val visibleSlots = slots.subList(start, minOf(start + SLOTS_PER_PAGE, slots.size))
                    val needsPagination = totalPages > 1

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
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold,
                                color = ParkOnPrimary
                            )
                            Text(
                                text = "₩${numberFormat.format(roundPrice)}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = ParkPrimary
                            )
                        }

                        // 타임슬롯 칩 (2열 균등 그리드)
                        val rows = visibleSlots.chunked(2)
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            rows.forEach { rowSlots ->
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    rowSlots.forEach { slot ->
                                        val slotId = slot["id"]?.toString() ?: ""
                                        val time = slot["time"]?.toString() ?: ""
                                        val availableSpots = (slot["availableSpots"] as? Number)?.toInt()
                                        val isSelected = selectedSlotId == slotId
                                        val isDisabled = hasSelection && !isSelected

                                        Box(modifier = Modifier.weight(1f)) {
                                            TimeSlotChip(
                                                time = time,
                                                availableSpots = availableSpots,
                                                isSelected = isSelected,
                                                isDisabled = isDisabled,
                                                onClick = { onSelect?.invoke(slotId, time, roundPrice, roundName) },
                                                modifier = Modifier.fillMaxWidth()
                                            )
                                        }
                                    }
                                    if (rowSlots.size == 1) {
                                        Spacer(modifier = Modifier.weight(1f))
                                    }
                                }
                            }
                        }

                        // 페이지네이션
                        if (needsPagination) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                TextButton(
                                    onClick = { pages[gameId] = effectivePage - 1 },
                                    enabled = effectivePage > 0,
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Icon(
                                        Icons.Default.ChevronLeft,
                                        contentDescription = null,
                                        modifier = Modifier.size(14.dp),
                                        tint = if (effectivePage == 0) ParkOnPrimary.copy(alpha = 0.2f)
                                        else ParkOnPrimary.copy(alpha = 0.6f)
                                    )
                                    Text(
                                        "이전",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = if (effectivePage == 0) ParkOnPrimary.copy(alpha = 0.2f)
                                        else ParkOnPrimary.copy(alpha = 0.6f)
                                    )
                                }

                                Text(
                                    "${effectivePage + 1} / $totalPages",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ParkOnPrimary.copy(alpha = 0.4f)
                                )

                                TextButton(
                                    onClick = { pages[gameId] = effectivePage + 1 },
                                    enabled = effectivePage < totalPages - 1,
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        "다음",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = if (effectivePage >= totalPages - 1) ParkOnPrimary.copy(alpha = 0.2f)
                                        else ParkOnPrimary.copy(alpha = 0.6f)
                                    )
                                    Icon(
                                        Icons.Default.ChevronRight,
                                        contentDescription = null,
                                        modifier = Modifier.size(14.dp),
                                        tint = if (effectivePage >= totalPages - 1) ParkOnPrimary.copy(alpha = 0.2f)
                                        else ParkOnPrimary.copy(alpha = 0.6f)
                                    )
                                }
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
                    val gameName = slot["gameName"]?.toString() ?: ""
                    val price = (slot["price"] as? Number)?.toInt() ?: 0
                    val isSelected = selectedSlotId == id
                    val isDisabled = hasSelection && !isSelected

                    Surface(
                        onClick = { if (!isDisabled) onSelect?.invoke(id, time, price, gameName) },
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
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = FontWeight.SemiBold,
                                        color = ParkOnPrimary
                                    )
                                }
                                Text(
                                    text = gameName,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = ParkOnPrimary.copy(alpha = 0.6f)
                                )
                                Text(
                                    text = "₩${numberFormat.format(price)}",
                                    style = MaterialTheme.typography.bodyMedium,
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
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        enabled = !isDisabled,
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) ParkPrimary.copy(alpha = 0.15f)
        else ParkOnPrimary.copy(alpha = 0.08f),
        border = if (isSelected) BorderStroke(1.5.dp, ParkPrimary)
        else BorderStroke(1.dp, ParkOnPrimary.copy(alpha = 0.15f)),
        modifier = modifier.alpha(if (isDisabled) 0.4f else 1f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally)
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
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) ParkPrimary else ParkOnPrimary
            )
            if (availableSpots != null) {
                Text(
                    text = "${availableSpots}명",
                    style = MaterialTheme.typography.labelMedium,
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
