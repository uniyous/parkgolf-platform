package com.parkgolf.app.presentation.feature.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.Game
import com.parkgolf.app.domain.model.GameSearchParams
import com.parkgolf.app.domain.model.GameTimeSlot
import com.parkgolf.app.domain.model.SortOption
import com.parkgolf.app.domain.model.SortOrder
import com.parkgolf.app.domain.model.TimeOfDay
import com.parkgolf.app.domain.repository.GameRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

data class GameSearchUiState(
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val games: List<Game> = emptyList(),
    val searchQuery: String = "",
    val selectedDate: LocalDate = LocalDate.now().plusDays(1), // 내일
    val selectedTimeOfDay: TimeOfDay = TimeOfDay.ALL,
    val minPrice: String = "",
    val maxPrice: String = "",
    val selectedPlayerCount: Int? = null,
    val sortBy: SortOption = SortOption.PRICE,
    val sortOrder: SortOrder = SortOrder.ASC,
    val currentPage: Int = 1,
    val totalPages: Int = 1,
    val totalCount: Int = 0,
    val hasMore: Boolean = false,
    val error: String? = null,
    val showFilterSheet: Boolean = false,
    val showBookingForm: Boolean = false,
    val selectedGame: Game? = null,
    val selectedTimeSlot: GameTimeSlot? = null
) {
    val activeFiltersCount: Int
        get() {
            var count = 0
            if (minPrice.isNotEmpty() || maxPrice.isNotEmpty()) count++
            if (selectedPlayerCount != null) count++
            return count
        }
}

@HiltViewModel
class GameSearchViewModel @Inject constructor(
    private val gameRepository: GameRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(GameSearchUiState())
    val uiState: StateFlow<GameSearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    // 내일부터 30일
    val dateOptions: List<LocalDate> = (1..30).map { LocalDate.now().plusDays(it.toLong()) }

    init {
        search()
    }

    fun search() {
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            performSearch(resetPage = true)
        }
    }

    fun searchDebounced() {
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            performSearch(resetPage = true)
        }
    }

    private suspend fun performSearch(resetPage: Boolean) {
        val state = _uiState.value

        if (resetPage) {
            _uiState.update { it.copy(isLoading = true, currentPage = 1) }
        } else {
            _uiState.update { it.copy(isLoadingMore = true, currentPage = state.currentPage + 1) }
        }

        val params = GameSearchParams(
            search = state.searchQuery.takeIf { it.isNotBlank() },
            date = state.selectedDate.format(dateFormatter),
            timeOfDay = state.selectedTimeOfDay.takeIf { it != TimeOfDay.ALL },
            minPrice = state.minPrice.toIntOrNull(),
            maxPrice = state.maxPrice.toIntOrNull(),
            minPlayers = state.selectedPlayerCount,
            sortBy = state.sortBy,
            sortOrder = state.sortOrder,
            page = if (resetPage) 1 else state.currentPage + 1,
            limit = 20
        )

        gameRepository.searchGames(params)
            .onSuccess { paginatedData ->
                val games = if (resetPage) {
                    paginatedData.data
                } else {
                    _uiState.value.games + paginatedData.data
                }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isLoadingMore = false,
                        games = games,
                        currentPage = paginatedData.page,
                        totalPages = paginatedData.totalPages,
                        totalCount = paginatedData.total,
                        hasMore = paginatedData.page < paginatedData.totalPages,
                        error = null
                    )
                }
            }
            .onFailure { exception ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isLoadingMore = false,
                        error = exception.message
                    )
                }
            }
    }

    fun loadMore() {
        val state = _uiState.value
        if (state.hasMore && !state.isLoading && !state.isLoadingMore) {
            viewModelScope.launch {
                performSearch(resetPage = false)
            }
        }
    }

    // 검색어 변경
    fun updateSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        searchDebounced()
    }

    // 날짜 선택
    fun selectDate(date: LocalDate) {
        _uiState.update { it.copy(selectedDate = date) }
        search()
    }

    // 시간대 선택
    fun selectTimeOfDay(timeOfDay: TimeOfDay) {
        _uiState.update { it.copy(selectedTimeOfDay = timeOfDay) }
        search()
    }

    // 필터 시트 표시/숨김
    fun showFilterSheet(show: Boolean) {
        _uiState.update { it.copy(showFilterSheet = show) }
    }

    // 필터 값 업데이트
    fun updateMinPrice(price: String) {
        _uiState.update { it.copy(minPrice = price) }
    }

    fun updateMaxPrice(price: String) {
        _uiState.update { it.copy(maxPrice = price) }
    }

    fun updatePlayerCount(count: Int?) {
        _uiState.update { it.copy(selectedPlayerCount = count) }
    }

    fun updateSortBy(sortBy: SortOption) {
        _uiState.update { it.copy(sortBy = sortBy) }
    }

    fun updateSortOrder(sortOrder: SortOrder) {
        _uiState.update { it.copy(sortOrder = sortOrder) }
    }

    // 필터 적용
    fun applyFilters() {
        _uiState.update { it.copy(showFilterSheet = false) }
        search()
    }

    // 필터 초기화
    fun resetFilters() {
        _uiState.update {
            it.copy(
                selectedTimeOfDay = TimeOfDay.ALL,
                minPrice = "",
                maxPrice = "",
                selectedPlayerCount = null,
                sortBy = SortOption.PRICE,
                sortOrder = SortOrder.ASC
            )
        }
    }

    // 타임슬롯 선택 (예약 화면으로)
    fun selectTimeSlot(game: Game, timeSlot: GameTimeSlot) {
        _uiState.update {
            it.copy(
                selectedGame = game,
                selectedTimeSlot = timeSlot,
                showBookingForm = true
            )
        }
    }

    // 예약 폼 닫기
    fun dismissBookingForm() {
        _uiState.update {
            it.copy(
                showBookingForm = false,
                selectedGame = null,
                selectedTimeSlot = null
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    // 날짜 포맷팅 (요일)
    fun formatWeekday(date: LocalDate): String {
        val dayOfWeek = date.dayOfWeek.value
        return when (dayOfWeek) {
            1 -> "월"
            2 -> "화"
            3 -> "수"
            4 -> "목"
            5 -> "금"
            6 -> "토"
            7 -> "일"
            else -> ""
        }
    }

    // 날짜 포맷팅 (M/d)
    fun formatShortDate(date: LocalDate): String {
        return "${date.monthValue}/${date.dayOfMonth}"
    }

    // 주말 여부
    fun isWeekend(date: LocalDate): Boolean {
        val dayOfWeek = date.dayOfWeek.value
        return dayOfWeek == 6 || dayOfWeek == 7
    }
}
