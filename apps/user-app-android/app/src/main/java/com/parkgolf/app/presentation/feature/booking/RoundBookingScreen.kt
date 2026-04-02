package com.parkgolf.app.presentation.feature.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
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
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.style.TextAlign
import java.text.NumberFormat
import java.util.Locale
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun RoundBookingScreen(
    onNavigate: (String) -> Unit,
    viewModel: RoundBookingViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val dateOptions by viewModel.dateOptions.collectAsState()

    var isRefreshing by remember { mutableStateOf(false) }
    val pullRefreshState = rememberPullRefreshState(
        refreshing = isRefreshing,
        onRefresh = {
            isRefreshing = true
            viewModel.search()
        }
    )

    // isLoading이 false로 바뀌면 pull-to-refresh 종료
    LaunchedEffect(uiState.isLoading) {
        if (!uiState.isLoading) {
            isRefreshing = false
        }
    }

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
                dateOptions = dateOptions,
                selectedDate = uiState.selectedDate,
                onDateSelect = { viewModel.selectDate(it) },
                formatWeekday = { viewModel.formatWeekday(it) },
                formatShortDate = { viewModel.formatShortDate(it) },
                isWeekend = { viewModel.isWeekend(it) },
                onLoadMore = { viewModel.loadMoreDates() }
            )

            // Time of Day Filter (시니어 UI: 3개로 단순화)
            TimeOfDayFilter(
                selectedTimeOfDay = uiState.selectedTimeOfDay,
                onTimeOfDaySelect = { viewModel.selectTimeOfDay(it) },
                totalCount = uiState.totalCount
            )

            // Content with pull-to-refresh
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .pullRefresh(pullRefreshState)
            ) {
                when {
                    uiState.isLoading && uiState.rounds.isEmpty() && !isRefreshing -> {
                        // 초기 로딩: 전체 화면 스피너
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
                        // 에러 상태 (pull-to-refresh 가능하도록 LazyColumn)
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.Center
                        ) {
                            item {
                                EmptyStateView(
                                    icon = Icons.Default.Close,
                                    title = "오류가 발생했습니다",
                                    description = uiState.error ?: "다시 시도해 주세요"
                                )
                            }
                        }
                    }
                    uiState.rounds.isEmpty() -> {
                        // 빈 결과 (pull-to-refresh 가능하도록 LazyColumn)
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.Center
                        ) {
                            item {
                                EmptyStateView(
                                    icon = Icons.Default.Search,
                                    title = "검색 결과가 없습니다",
                                    description = "다른 날짜나 검색어로 시도해보세요"
                                )
                            }
                        }
                    }
                    else -> {
                        // 라운드 리스트
                        RoundList(
                            rounds = uiState.rounds,
                            isLoadingMore = uiState.isLoadingMore,
                            onLoadMore = { viewModel.loadMore() },
                            onSelectTimeSlot = { round, timeSlot ->
                                viewModel.selectTimeSlot(round, timeSlot)
                            }
                        )

                        // 재검색 시 오버레이 로딩 (iOS 동일)
                        if (uiState.isLoading && !isRefreshing) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color.Black.copy(alpha = 0.3f)),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(
                                    color = Color.White,
                                    modifier = Modifier.size(48.dp)
                                )
                            }
                        }
                    }
                }

                // Pull-to-refresh 인디케이터 (제스처 시에만 표시)
                PullRefreshIndicator(
                    refreshing = isRefreshing,
                    state = pullRefreshState,
                    modifier = Modifier.align(Alignment.TopCenter),
                    backgroundColor = Color.White,
                    contentColor = ParkPrimary
                )
            }
        }

        // Booking Form Navigation (LaunchedEffect로 side effect 처리)
        LaunchedEffect(uiState.showBookingForm) {
            if (uiState.showBookingForm && uiState.selectedRound != null && uiState.selectedTimeSlot != null) {
                val date = uiState.selectedDate.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                val startTime = uiState.selectedTimeSlot!!.startTime
                val route = "booking/${uiState.selectedRound!!.id}/${uiState.selectedTimeSlot!!.id}?date=$date&startTime=$startTime"
                viewModel.dismissBookingForm()
                onNavigate(route)
            }
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
    isWeekend: (LocalDate) -> Boolean,
    onLoadMore: () -> Unit
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

        // +7일 더보기 버튼
        item {
            LoadMoreDateButton(onClick = onLoadMore)
        }
    }
}

// +7일 더보기 버튼
@Composable
private fun LoadMoreDateButton(onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .width(56.dp)
            .height(60.dp)
            .clip(RoundedCornerShape(12.dp))
            .border(
                width = 1.dp,
                color = TextOnGradientSecondary.copy(alpha = 0.5f),
                shape = RoundedCornerShape(12.dp)
            )
            .clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "+",
            fontSize = 18.sp,
            fontWeight = FontWeight.Medium,
            color = TextOnGradientSecondary
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = "7일",
            fontSize = 12.sp,
            color = TextOnGradientSecondary
        )
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

// 시니어 UI: 큰 터치 영역의 필터 칩 (DateChip과 동일 패턴)
@Composable
private fun SeniorFilterChip(
    title: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Text(
        text = title,
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold,
        color = if (isSelected) Color.White else TextOnGradientSecondary,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (isSelected) ParkPrimary else GlassBackground
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
    val slotsPerPage = 4
    var currentPage by remember { mutableIntStateOf(0) }
    val slots = round.timeSlots ?: emptyList()
    val totalPages = maxOf(1, kotlin.math.ceil(slots.size.toDouble() / slotsPerPage).toInt())
    val visibleSlots = slots.drop(currentPage * slotsPerPage).take(slotsPerPage)
    val needsPagination = totalPages > 1
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
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextOnGradient
                )

                Text(
                    text = "\uD83D\uDCCD ${round.club?.address ?: ""} · ${round.name}",
                    fontSize = 14.sp,
                    color = TextOnGradientSecondary
                )

                Text(
                    text = "${String.format("%,d", pricePerPerson)}원 /인 · ${round.durationText} · ${round.maxPlayers}명",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextOnGradient.copy(alpha = 0.9f)
                )
            }

            // Time Slots (그리드: 모바일 2열, 태블릿 4열)
            if (visibleSlots.isNotEmpty()) {
                HorizontalDivider(color = GlassBorder)

                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "예약 가능 시간",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextOnGradient
                    )

                    TimeSlotGrid(
                        slots = visibleSlots,
                        onSelectTimeSlot = onSelectTimeSlot
                    )

                    // 페이지네이션
                    if (needsPagination) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(
                                onClick = { currentPage-- },
                                enabled = currentPage > 0,
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Icon(
                                    Icons.Default.ChevronLeft,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = if (currentPage == 0) TextOnGradientSecondary.copy(alpha = 0.3f)
                                    else TextOnGradientSecondary
                                )
                                Text(
                                    "이전",
                                    fontSize = 12.sp,
                                    color = if (currentPage == 0) TextOnGradientSecondary.copy(alpha = 0.3f)
                                    else TextOnGradientSecondary
                                )
                            }

                            Text(
                                "${currentPage + 1} / $totalPages",
                                fontSize = 12.sp,
                                color = TextOnGradientSecondary.copy(alpha = 0.6f)
                            )

                            TextButton(
                                onClick = { currentPage++ },
                                enabled = currentPage < totalPages - 1,
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    "다음",
                                    fontSize = 12.sp,
                                    color = if (currentPage >= totalPages - 1) TextOnGradientSecondary.copy(alpha = 0.3f)
                                    else TextOnGradientSecondary
                                )
                                Icon(
                                    Icons.Default.ChevronRight,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = if (currentPage >= totalPages - 1) TextOnGradientSecondary.copy(alpha = 0.3f)
                                    else TextOnGradientSecondary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Time Slot Grid (모바일 2열, 태블릿 4열 - iOS 동일)

@Composable
private fun TimeSlotGrid(
    slots: List<TimeSlot>,
    onSelectTimeSlot: (TimeSlot) -> Unit
) {
    val configuration = LocalConfiguration.current
    val columnCount = if (configuration.smallestScreenWidthDp >= 600) 4 else 2

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        slots.chunked(columnCount).forEach { rowSlots ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                rowSlots.forEach { slot ->
                    TimeSlotGridCell(
                        slot = slot,
                        onClick = { onSelectTimeSlot(slot) },
                        modifier = Modifier.weight(1f)
                    )
                }
                // 빈 셀로 마지막 행 채우기
                repeat(columnCount - rowSlots.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

private val SkyBlue = Color(0xFF66D9FF)

@Composable
private fun TimeSlotGridCell(
    slot: TimeSlot,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val availabilityText = when {
        slot.availablePlayers == 0 -> "매진"
        slot.availablePlayers <= 2 -> "마감임박"
        else -> "${slot.availablePlayers}자리"
    }

    val availabilityColor = when {
        slot.availablePlayers == 0 -> Color.White.copy(alpha = 0.4f)
        slot.availablePlayers <= 2 -> ParkError
        else -> SkyBlue
    }

    val formatter = NumberFormat.getNumberInstance(Locale.KOREA)

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (slot.isPremium) ParkAccent.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.08f)
            )
            .border(
                width = 1.dp,
                color = if (slot.isPremium) ParkAccent.copy(alpha = 0.4f) else Color.White.copy(alpha = 0.2f),
                shape = RoundedCornerShape(12.dp)
            )
            .clickable(enabled = slot.availablePlayers > 0) { onClick() }
            .then(
                if (slot.availablePlayers == 0) Modifier.alpha(0.4f) else Modifier
            )
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        // 시간
        Text(
            text = slot.startTime,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            textAlign = TextAlign.Center
        )

        // 잔여 자리
        Text(
            text = availabilityText,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = availabilityColor,
            textAlign = TextAlign.Center
        )
    }
}

private fun Modifier.alpha(alpha: Float): Modifier = this.then(
    Modifier.graphicsLayer(alpha = alpha)
)
