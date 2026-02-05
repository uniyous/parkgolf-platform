package com.parkgolf.app.presentation.feature.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.domain.model.AvailabilityStatus
import com.parkgolf.app.domain.model.Round
import com.parkgolf.app.domain.model.TimeSlot
import com.parkgolf.app.domain.model.TimeOfDay
import com.parkgolf.app.presentation.components.EmptyStateView
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GlassTextField
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.GlassBackground
import com.parkgolf.app.presentation.theme.ParkAccent
import com.parkgolf.app.presentation.theme.ParkError
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.ParkSuccess
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary
import java.time.LocalDate

@Composable
fun RoundBookingScreen(
    onNavigate: (String) -> Unit,
    viewModel: RoundBookingViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    GradientBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            // Title Header
            TitleHeader()

            // Search Header (시니어 UI: 필터 버튼 제거)
            SearchHeader(
                searchQuery = uiState.searchQuery,
                onSearchChange = { viewModel.updateSearchQuery(it) }
            )

            // Date Selector
            DateSelector(
                dateOptions = viewModel.dateOptions,
                selectedDate = uiState.selectedDate,
                onDateSelect = { viewModel.selectDate(it) },
                formatWeekday = { viewModel.formatWeekday(it) },
                formatShortDate = { viewModel.formatShortDate(it) },
                isWeekend = { viewModel.isWeekend(it) }
            )

            // Time of Day Filter (시니어 UI: 3개로 단순화)
            TimeOfDayFilter(
                selectedTimeOfDay = uiState.selectedTimeOfDay,
                onTimeOfDaySelect = { viewModel.selectTimeOfDay(it) },
                totalCount = uiState.totalCount
            )

            // Content
            when {
                uiState.isLoading && uiState.rounds.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = ParkPrimary)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "라운드 검색 중...",
                                color = TextOnGradientSecondary,
                                fontSize = 16.sp
                            )
                        }
                    }
                }
                uiState.error != null && uiState.rounds.isEmpty() -> {
                    EmptyStateView(
                        icon = Icons.Default.Close,
                        title = "오류가 발생했습니다",
                        description = uiState.error ?: "다시 시도해 주세요"
                    )
                }
                uiState.rounds.isEmpty() -> {
                    EmptyStateView(
                        icon = Icons.Default.Search,
                        title = "검색 결과가 없습니다",
                        description = "다른 날짜나 검색어로 시도해보세요"
                    )
                }
                else -> {
                    RoundList(
                        rounds = uiState.rounds,
                        isLoadingMore = uiState.isLoadingMore,
                        onLoadMore = { viewModel.loadMore() },
                        onSelectTimeSlot = { round, timeSlot ->
                            viewModel.selectTimeSlot(round, timeSlot)
                        }
                    )
                }
            }
        }

        // Booking Form Navigation
        if (uiState.showBookingForm && uiState.selectedRound != null && uiState.selectedTimeSlot != null) {
            viewModel.dismissBookingForm()
            onNavigate("booking/${uiState.selectedRound!!.id}/${uiState.selectedTimeSlot!!.id}")
        }
    }
}

// MARK: - Title Header

@Composable
private fun TitleHeader() {
    Text(
        text = "라운드 예약",
        style = MaterialTheme.typography.headlineMedium,
        color = TextOnGradient,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .padding(horizontal = 16.dp)
            .padding(top = 16.dp, bottom = 8.dp)
    )
}

// MARK: - Search Header (시니어 UI: 필터 버튼 제거)

@Composable
private fun SearchHeader(
    searchQuery: String,
    onSearchChange: (String) -> Unit
) {
    GlassTextField(
        value = searchQuery,
        onValueChange = onSearchChange,
        label = "골프장, 코스 검색...",
        leadingIcon = Icons.Default.Search,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 8.dp)
    )
}

// MARK: - Date Selector

@Composable
private fun DateSelector(
    dateOptions: List<LocalDate>,
    selectedDate: LocalDate,
    onDateSelect: (LocalDate) -> Unit,
    formatWeekday: (LocalDate) -> String,
    formatShortDate: (LocalDate) -> String,
    isWeekend: (LocalDate) -> Boolean
) {
    LazyRow(
        modifier = Modifier.padding(vertical = 12.dp),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        items(dateOptions) { date ->
            DateChip(
                weekday = formatWeekday(date),
                shortDate = formatShortDate(date),
                isSelected = date == selectedDate,
                isWeekend = isWeekend(date),
                onClick = { onDateSelect(date) }
            )
        }
    }
}

@Composable
private fun DateChip(
    weekday: String,
    shortDate: String,
    isSelected: Boolean,
    isWeekend: Boolean,
    onClick: () -> Unit
) {
    val weekdayColor = when {
        isSelected -> Color.White
        isWeekend -> ParkAccent
        else -> TextOnGradientSecondary
    }

    Column(
        modifier = Modifier
            .width(56.dp)
            .height(60.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (isSelected) ParkPrimary else GlassBackground
            )
            .clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = weekday,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = weekdayColor
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = shortDate,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (isSelected) Color.White else TextOnGradient
        )
    }
}

// MARK: - Time of Day Filter (시니어 UI: 큰 터치 영역, 3개 옵션)

@Composable
private fun TimeOfDayFilter(
    selectedTimeOfDay: TimeOfDay,
    onTimeOfDaySelect: (TimeOfDay) -> Unit,
    totalCount: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TimeOfDay.entries.forEach { timeOfDay ->
                SeniorFilterChip(
                    title = timeOfDay.label,
                    isSelected = selectedTimeOfDay == timeOfDay,
                    onClick = { onTimeOfDaySelect(timeOfDay) }
                )
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        if (totalCount > 0) {
            Text(
                text = "${totalCount}건",
                fontSize = 14.sp,
                color = TextOnGradientSecondary
            )
        }
    }
}

// 시니어 UI: 큰 터치 영역의 필터 칩
@Composable
private fun SeniorFilterChip(
    title: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Text(
        text = title,
        fontSize = 16.sp,
        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
        color = if (isSelected) Color.White else TextOnGradientSecondary,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (isSelected) ParkPrimary.copy(alpha = 0.3f) else GlassBackground
            )
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 12.dp)
    )
}

// MARK: - Round List

@Composable
private fun RoundList(
    rounds: List<Round>,
    isLoadingMore: Boolean,
    onLoadMore: () -> Unit,
    onSelectTimeSlot: (Round, TimeSlot) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(rounds, key = { it.id }) { round ->
            SeniorRoundCardView(
                round = round,
                onSelectTimeSlot = { timeSlot -> onSelectTimeSlot(round, timeSlot) }
            )

            // Load more trigger
            if (round == rounds.last()) {
                onLoadMore()
            }
        }

        if (isLoadingMore) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        color = ParkPrimary,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

// MARK: - Senior Round Card (시니어 UI: 세로 리스트, 단순화)

@Composable
private fun SeniorRoundCardView(
    round: Round,
    onSelectTimeSlot: (TimeSlot) -> Unit
) {
    var showAllSlots by remember { mutableStateOf(false) }
    val slots = round.timeSlots ?: emptyList()
    val displayedSlots = if (showAllSlots) slots else slots.take(5)
    val hasMoreSlots = slots.size > 5
    val pricePerPerson = round.pricePerPerson ?: round.basePrice

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = 0.dp
    ) {
        Column {
            // Round Info (시니어 UI: 단순화)
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = round.clubName,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextOnGradient
                )

                Text(
                    text = "📍 ${round.club?.address ?: ""} · ${round.name}",
                    fontSize = 16.sp,
                    color = TextOnGradientSecondary
                )

                Text(
                    text = "${String.format("%,d", pricePerPerson)}원 /인 · ${round.durationText} · ${round.maxPlayers}명",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextOnGradient.copy(alpha = 0.9f)
                )
            }

            // Time Slots (시니어 UI: 세로 리스트)
            if (displayedSlots.isNotEmpty()) {
                HorizontalDivider(color = GlassBorder)

                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "예약 가능 시간",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextOnGradient
                    )

                    displayedSlots.forEach { slot ->
                        SeniorTimeSlotRow(
                            slot = slot,
                            onClick = { onSelectTimeSlot(slot) }
                        )
                    }

                    // Show more button
                    if (hasMoreSlots && !showAllSlots) {
                        Text(
                            text = "전체 ${slots.size}개 시간 보기 ▼",
                            fontSize = 14.sp,
                            color = TextOnGradientSecondary,
                            modifier = Modifier
                                .clickable { showAllSlots = true }
                                .padding(vertical = 8.dp)
                        )
                    }
                }
            }
        }
    }
}

// MARK: - Senior Time Slot Row (시니어 UI: 큰 터치 영역, 세로 리스트)

@Composable
private fun SeniorTimeSlotRow(
    slot: TimeSlot,
    onClick: () -> Unit
) {
    val availabilityText = when {
        slot.availablePlayers == 0 -> "매진"
        slot.availablePlayers <= 2 -> "마감임박"
        else -> "${slot.availablePlayers}자리 남음"
    }

    val availabilityColor = when (slot.availabilityStatus) {
        AvailabilityStatus.AVAILABLE, AvailabilityStatus.LIMITED -> ParkSuccess
        AvailabilityStatus.ALMOST_FULL -> ParkError
        AvailabilityStatus.SOLD_OUT -> Color.Gray
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (slot.isPremium) ParkAccent.copy(alpha = 0.2f) else GlassBackground
            )
            .clickable(enabled = slot.availablePlayers > 0) { onClick() }
            .then(
                if (slot.availablePlayers == 0) Modifier.alpha(0.4f) else Modifier
            )
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = slot.startTime,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextOnGradient
        )

        Text(
            text = availabilityText,
            fontSize = 16.sp,
            color = availabilityColor
        )
    }
}

private fun Modifier.alpha(alpha: Float): Modifier = this.then(
    Modifier.graphicsLayer(alpha = alpha)
)
