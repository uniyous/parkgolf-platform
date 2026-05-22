package com.parkgolf.app.presentation.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.data.remote.dto.settings.AgentMemoryStatus
import com.parkgolf.app.domain.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AgentMemoryUiState(
    val isLoading: Boolean = false,
    val isUpdating: Boolean = false,
    val status: AgentMemoryStatus? = null,
    val error: String? = null
)

@HiltViewModel
class AgentMemorySettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AgentMemoryUiState())
    val uiState: StateFlow<AgentMemoryUiState> = _uiState.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            settingsRepository.getAgentMemory()
                .onSuccess { status ->
                    _uiState.update { it.copy(isLoading = false, status = status) }
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = e.message ?: "AI 메모리 설정을 불러오는데 실패했습니다"
                        )
                    }
                }
        }
    }

    fun setEnabled(enabled: Boolean) {
        val previous = _uiState.value.status ?: return
        _uiState.update {
            it.copy(
                isUpdating = true,
                status = previous.copy(enabled = enabled),
                error = null
            )
        }
        viewModelScope.launch {
            settingsRepository.setAgentMemoryEnabled(enabled)
                .onSuccess {
                    settingsRepository.getAgentMemory()
                        .onSuccess { fresh ->
                            _uiState.update { s -> s.copy(isUpdating = false, status = fresh) }
                        }
                        .onFailure {
                            _uiState.update { s -> s.copy(isUpdating = false) }
                        }
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isUpdating = false,
                            status = previous,
                            error = e.message ?: "AI 메모리 설정 변경에 실패했습니다"
                        )
                    }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
