package com.parkgolf.app.presentation.feature.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.Game
import com.parkgolf.app.domain.model.GameSearchParams
import com.parkgolf.app.domain.model.GameTimeSlot
import com.parkgolf.app.domain.repository.GameRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class GameSearchUiState(
    val isLoading: Boolean = false,
    val games: List<Game> = emptyList(),
    val selectedGame: Game? = null,
    val timeSlots: List<GameTimeSlot> = emptyList(),
    val searchQuery: String = "",
    val selectedDate: String? = null,
    val minPrice: Int? = null,
    val maxPrice: Int? = null,
    val currentPage: Int = 1,
    val totalPages: Int = 1,
    val hasMore: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class GameSearchViewModel @Inject constructor(
    private val gameRepository: GameRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(GameSearchUiState())
    val uiState: StateFlow<GameSearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        loadGames()
    }

    fun loadGames(refresh: Boolean = false) {
        val currentPage = if (refresh) 1 else _uiState.value.currentPage

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            val params = GameSearchParams(
                search = _uiState.value.searchQuery.takeIf { it.isNotBlank() },
                date = _uiState.value.selectedDate,
                minPrice = _uiState.value.minPrice,
                maxPrice = _uiState.value.maxPrice,
                page = currentPage,
                limit = 20
            )

            gameRepository.searchGames(params)
                .onSuccess { paginatedData ->
                    val games = if (refresh || currentPage == 1) {
                        paginatedData.data
                    } else {
                        _uiState.value.games + paginatedData.data
                    }

                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        games = games,
                        currentPage = paginatedData.page,
                        totalPages = paginatedData.totalPages,
                        hasMore = paginatedData.page < paginatedData.totalPages,
                        error = null
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }

    fun search(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query, currentPage = 1)

        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300) // Debounce
            loadGames(refresh = true)
        }
    }

    fun setDateFilter(date: String?) {
        _uiState.value = _uiState.value.copy(selectedDate = date, currentPage = 1)
        loadGames(refresh = true)
    }

    fun setPriceFilter(min: Int?, max: Int?) {
        _uiState.value = _uiState.value.copy(minPrice = min, maxPrice = max, currentPage = 1)
        loadGames(refresh = true)
    }

    fun clearFilters() {
        _uiState.value = _uiState.value.copy(
            searchQuery = "",
            selectedDate = null,
            minPrice = null,
            maxPrice = null,
            currentPage = 1
        )
        loadGames(refresh = true)
    }

    fun selectGame(game: Game) {
        _uiState.value = _uiState.value.copy(selectedGame = game)
        loadTimeSlots(game.id)
    }

    fun loadTimeSlots(gameId: Int, date: String? = null) {
        viewModelScope.launch {
            gameRepository.getTimeSlots(gameId, date)
                .onSuccess { slots ->
                    _uiState.value = _uiState.value.copy(timeSlots = slots)
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(error = exception.message)
                }
        }
    }

    fun loadAvailableTimeSlots(gameId: Int, date: String) {
        viewModelScope.launch {
            gameRepository.getAvailableTimeSlots(gameId, date)
                .onSuccess { slots ->
                    _uiState.value = _uiState.value.copy(timeSlots = slots)
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(error = exception.message)
                }
        }
    }

    fun loadMore() {
        if (_uiState.value.hasMore && !_uiState.value.isLoading) {
            _uiState.value = _uiState.value.copy(currentPage = _uiState.value.currentPage + 1)
            loadGames()
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
