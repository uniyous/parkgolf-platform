package com.parkgolf.app.presentation.feature.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.parkgolf.app.domain.model.AvailabilityStatus
import com.parkgolf.app.domain.model.Round
import com.parkgolf.app.domain.model.TimeSlot
import com.parkgolf.app.domain.model.SortOption
import com.parkgolf.app.domain.model.SortOrder
import com.parkgolf.app.domain.model.TimeOfDay
import com.parkgolf.app.presentation.components.EmptyStateView
import com.parkgolf.app.presentation.components.GlassCard
import com.parkgolf.app.presentation.components.GlassTextField
import com.parkgolf.app.presentation.components.GradientBackground
import com.parkgolf.app.presentation.components.GradientButton
import com.parkgolf.app.presentation.components.GradientButtonStyle
import com.parkgolf.app.presentation.theme.GlassBorder
import com.parkgolf.app.presentation.theme.GlassBackground
import com.parkgolf.app.presentation.theme.ParkAccent
import com.parkgolf.app.presentation.theme.ParkError
import com.parkgolf.app.presentation.theme.ParkPrimary
import com.parkgolf.app.presentation.theme.ParkSuccess
import com.parkgolf.app.presentation.theme.ParkWarning
import com.parkgolf.app.presentation.theme.TextOnGradient
import com.parkgolf.app.presentation.theme.TextOnGradientSecondary
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoundBookingScreen(
    onNavigate: (String) -> Unit,
    viewModel: RoundBookingViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    GradientBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            // Title Header
            TitleHeader()

            // Search Header
            SearchHeader(
                searchQuery = uiState.searchQuery,
                onSearchChange = { viewModel.updateSearchQuery(it) },
                activeFiltersCount = uiState.activeFiltersCount,
                onFilterClick = { viewModel.showFilterSheet(true) }
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

            // Time of Day Filter
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
                                color = TextOnGradientSecondary
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
                        selectedDate = uiState.selectedDate,
                        isLoadingMore = uiState.isLoadingMore,
                        onLoadMore = { viewModel.loadMore() },
                        onSelectTimeSlot = { round, timeSlot ->
                            viewModel.selectTimeSlot(round, timeSlot)
                        }
                    )
                }
            }
        }

        // Filter Bottom Sheet
        if (uiState.showFilterSheet) {
            ModalBottomSheet(
                onDismissRequest = { viewModel.showFilterSheet(false) },
                sheetState = sheetState,
                containerColor = Color(0xFF064E3B)
            ) {
                FilterSheetContent(
                    uiState = uiState,
                    onMinPriceChange = { viewModel.updateMinPrice(it) },
                    onMaxPriceChange = { viewModel.updateMaxPrice(it) },
                    onPlayerCountChange = { viewModel.updatePlayerCount(it) },
                    onSortByChange = { viewModel.updateSortBy(it) },
                    onSortOrderChange = { viewModel.updateSortOrder(it) },
                    onReset = { viewModel.resetFilters() },
                    onApply = { viewModel.applyFilters() }
                )
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

// MARK: - Search Header

@Composable
private fun SearchHeader(
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    activeFiltersCount: Int,
    onFilterClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        GlassTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            label = "골프장, 코스 검색...",
            leadingIcon = Icons.Default.Search,
            modifier = Modifier.weight(1f)
        )

        // Filter Button
        Box {
            IconButton(
                onClick = onFilterClick,
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        color = GlassBackground,
                        shape = RoundedCornerShape(12.dp)
                    )
            ) {
                Icon(
                    imageVector = Icons.Default.Tune,
                    contentDescription = "필터",
                    tint = TextOnGradient
                )
            }

            if (activeFiltersCount > 0) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .size(18.dp)
                        .background(ParkAccent, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "$activeFiltersCount",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
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
            .width(44.dp)
            .height(48.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(
                if (isSelected) ParkPrimary else GlassBackground
            )
            .clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = weekday,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = weekdayColor
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = shortDate,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (isSelected) Color.White else TextOnGradient
        )
    }
}

// MARK: - Time of Day Filter

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
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            TimeOfDay.entries.forEach { timeOfDay ->
                FilterChip(
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
                style = MaterialTheme.typography.labelMedium,
                color = TextOnGradientSecondary
            )
        }
    }
}

@Composable
private fun FilterChip(
    title: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Text(
        text = title,
        fontSize = 12.sp,
        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
        color = if (isSelected) Color.White else TextOnGradientSecondary,
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (isSelected) ParkPrimary.copy(alpha = 0.8f) else Color.Transparent
            )
            .then(
                if (!isSelected) {
                    Modifier.background(
                        Color.Transparent,
                        RoundedCornerShape(16.dp)
                    )
                } else Modifier
            )
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 6.dp)
    )
}

// MARK: - Round List

@Composable
private fun RoundList(
    rounds: List<Round>,
    selectedDate: LocalDate,
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
            RoundCardView(
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

// MARK: - Round Card

@Composable
private fun RoundCardView(
    round: Round,
    onSelectTimeSlot: (TimeSlot) -> Unit
) {
    var showAllSlots by remember { mutableStateOf(false) }
    val slots = round.timeSlots ?: emptyList()
    val displayedSlots = if (showAllSlots) slots else slots.take(6)
    val hasMoreSlots = slots.size > 6

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = 0.dp
    ) {
        Column {
            // Round Info
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Text(
                        text = round.name,
                        style = MaterialTheme.typography.titleMedium,
                        color = TextOnGradient,
                        fontWeight = FontWeight.SemiBold
                    )

                    round.priceRange?.let { range ->
                        PriceRangeDisplay(minPrice = range.min, maxPrice = range.max)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    InfoLabel(icon = "🏢", text = round.clubName)
                    if (round.courseNames.isNotEmpty()) {
                        InfoLabel(icon = "🚩", text = round.courseNames)
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    InfoLabel(icon = "⏱", text = round.durationText)
                    InfoLabel(icon = "👥", text = "최대 ${round.maxPlayers}명")
                }
            }

            // Time Slots
            if (displayedSlots.isNotEmpty()) {
                HorizontalDivider(color = GlassBorder)

                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Time slots grid (3 columns)
                    val rows = displayedSlots.chunked(3)
                    rows.forEach { rowSlots ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            rowSlots.forEach { slot ->
                                TimeSlotChip(
                                    slot = slot,
                                    onClick = { onSelectTimeSlot(slot) }
                                )
                            }
                            // Fill remaining space if less than 3 items
                            repeat(3 - rowSlots.size) {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }

                    // Show more button
                    if (hasMoreSlots && !showAllSlots) {
                        Text(
                            text = "+ ${slots.size - 6}개 더보기",
                            fontSize = 12.sp,
                            color = TextOnGradient,
                            modifier = Modifier
                                .clickable { showAllSlots = true }
                                .padding(vertical = 4.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun InfoLabel(icon: String, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(text = icon, fontSize = 12.sp)
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = text,
            fontSize = 12.sp,
            color = TextOnGradientSecondary
        )
    }
}

@Composable
private fun PriceRangeDisplay(minPrice: Int, maxPrice: Int) {
    val priceText = if (minPrice == maxPrice) {
        "${String.format("%,d", minPrice)}원"
    } else {
        "${String.format("%,d", minPrice)}~${String.format("%,d", maxPrice)}원"
    }

    Text(
        text = priceText,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        color = ParkPrimary
    )
}

// MARK: - Time Slot Chip

@Composable
private fun RowScope.TimeSlotChip(
    slot: TimeSlot,
    onClick: () -> Unit
) {
    val availabilityColor = when (slot.availabilityStatus) {
        AvailabilityStatus.AVAILABLE -> ParkSuccess
        AvailabilityStatus.LIMITED -> ParkWarning
        AvailabilityStatus.ALMOST_FULL -> ParkError
        AvailabilityStatus.SOLD_OUT -> Color.Gray
    }

    val noFontPadding = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))

    Column(
        modifier = Modifier
            .weight(1f)
            .background(GlassBackground, RoundedCornerShape(6.dp))
            .clip(RoundedCornerShape(6.dp))
            .clickable(enabled = slot.availablePlayers > 0) { onClick() }
            .then(
                if (slot.availablePlayers == 0) Modifier.alpha(0.4f) else Modifier
            )
            .padding(horizontal = 2.dp, vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // 시간
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = slot.startTime,
                style = noFontPadding.copy(
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextOnGradient
                )
            )
            if (slot.isPremium) {
                Spacer(modifier = Modifier.width(2.dp))
                Text(text = "💎", fontSize = 8.sp)
            }
        }
        // 가격
        Text(
            text = slot.priceText,
            style = noFontPadding.copy(
                fontSize = 9.sp,
                color = TextOnGradientSecondary
            )
        )
        Spacer(modifier = Modifier.height(2.dp))
        // 인원
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(5.dp)
                    .background(availabilityColor, CircleShape)
            )
            Spacer(modifier = Modifier.width(2.dp))
            Text(
                text = "${slot.availablePlayers}명",
                style = noFontPadding.copy(
                    fontSize = 9.sp,
                    color = Color.White
                )
            )
        }
    }
}

private fun Modifier.alpha(alpha: Float): Modifier = this.then(
    Modifier.graphicsLayer(alpha = alpha)
)

// MARK: - Filter Sheet Content

@Composable
private fun FilterSheetContent(
    uiState: RoundBookingUiState,
    onMinPriceChange: (String) -> Unit,
    onMaxPriceChange: (String) -> Unit,
    onPlayerCountChange: (Int?) -> Unit,
    onSortByChange: (SortOption) -> Unit,
    onSortOrderChange: (SortOrder) -> Unit,
    onReset: () -> Unit,
    onApply: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "상세 필터",
            style = MaterialTheme.typography.titleLarge,
            color = TextOnGradient,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )

        // Price Range
        GlassCard {
            Column {
                Text(
                    text = "💰 가격대",
                    style = MaterialTheme.typography.titleSmall,
                    color = TextOnGradient
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    GlassTextField(
                        value = uiState.minPrice,
                        onValueChange = onMinPriceChange,
                        label = "최소",
                        modifier = Modifier.weight(1f)
                    )
                    Text("~", color = TextOnGradientSecondary)
                    GlassTextField(
                        value = uiState.maxPrice,
                        onValueChange = onMaxPriceChange,
                        label = "최대",
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Player Count
        GlassCard {
            Column {
                Text(
                    text = "👥 인원",
                    style = MaterialTheme.typography.titleSmall,
                    color = TextOnGradient
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(1, 2, 3, 4).forEach { count ->
                        FilterChip(
                            title = if (count == 4) "4명+" else "${count}명",
                            isSelected = uiState.selectedPlayerCount == count,
                            onClick = {
                                onPlayerCountChange(
                                    if (uiState.selectedPlayerCount == count) null else count
                                )
                            }
                        )
                    }
                }
            }
        }

        // Sort Options
        GlassCard {
            Column {
                Text(
                    text = "📊 정렬",
                    style = MaterialTheme.typography.titleSmall,
                    color = TextOnGradient
                )
                Spacer(modifier = Modifier.height(8.dp))

                SortOption.entries.forEach { option ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSortByChange(option) }
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (uiState.sortBy == option)
                                Icons.Filled.CheckCircle
                            else Icons.Outlined.Circle,
                            contentDescription = null,
                            tint = if (uiState.sortBy == option) ParkPrimary else TextOnGradientSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = option.label,
                            color = TextOnGradient
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SortOrder.entries.forEach { order ->
                        FilterChip(
                            title = order.label,
                            isSelected = uiState.sortOrder == order,
                            onClick = { onSortOrderChange(order) }
                        )
                    }
                }
            }
        }

        // Buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            GradientButton(
                text = "초기화",
                onClick = onReset,
                style = GradientButtonStyle.Ghost,
                modifier = Modifier.weight(1f)
            )
            GradientButton(
                text = "적용하기",
                onClick = onApply,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}
