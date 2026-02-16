package com.parkgolf.app.presentation.feature.club

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.ClubDetail
import com.parkgolf.app.domain.model.Round
import com.parkgolf.app.domain.repository.ClubRepository
import com.parkgolf.app.domain.repository.RoundRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ClubDetailUiState(
    val isLoading: Boolean = false,
    val club: ClubDetail? = null,
    val games: List<Round> = emptyList(),
    val isLoadingGames: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ClubDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val clubRepository: ClubRepository,
    private val roundRepository: RoundRepository
) : ViewModel() {

    private val clubId: Int = savedStateHandle.get<Int>("clubId") ?: 0

    private val _uiState = MutableStateFlow(ClubDetailUiState())
    val uiState: StateFlow<ClubDetailUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val clubDeferred = async { clubRepository.getClubDetail(clubId) }
            val gamesDeferred = async { roundRepository.getRounds(clubId = clubId) }

            val clubResult = clubDeferred.await()
            val gamesResult = gamesDeferred.await()

            _uiState.value = _uiState.value.copy(
                isLoading = false,
                club = clubResult.getOrNull(),
                games = gamesResult.getOrNull()?.data ?: emptyList(),
                error = if (clubResult.isFailure) clubResult.exceptionOrNull()?.message else null
            )
        }
    }
}
