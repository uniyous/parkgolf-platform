package com.parkgolf.app.presentation.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.Game
import com.parkgolf.app.domain.model.User
import com.parkgolf.app.domain.repository.AuthRepository
import com.parkgolf.app.domain.repository.GameRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val featuredGames: List<Game> = emptyList(),
    val recentGames: List<Game> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val gameRepository: GameRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            // Load user
            authRepository.getCurrentUser().collect { user ->
                _uiState.value = _uiState.value.copy(user = user)
            }
        }

        // Load games
        loadGames()
    }

    private fun loadGames() {
        viewModelScope.launch {
            gameRepository.getGames(page = 1, limit = 10)
                .onSuccess { paginatedData ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        featuredGames = paginatedData.data.take(5),
                        recentGames = paginatedData.data,
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

    fun refresh() {
        loadData()
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
