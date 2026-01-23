package com.parkgolf.app.presentation.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.data.remote.dto.settings.NotificationSettings
import com.parkgolf.app.domain.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationSettingsUiState(
    val isLoading: Boolean = false,
    val settings: NotificationSettings = NotificationSettings(),
    val error: String? = null
)

@HiltViewModel
class NotificationSettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationSettingsUiState())
    val uiState: StateFlow<NotificationSettingsUiState> = _uiState.asStateFlow()

    fun loadSettings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            settingsRepository.getNotificationSettings()
                .onSuccess { settings ->
                    _uiState.update { it.copy(isLoading = false, settings = settings) }
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = e.message ?: "설정을 불러오는데 실패했습니다"
                        )
                    }
                }
        }
    }

    fun updateBooking(enabled: Boolean) {
        val previousSettings = _uiState.value.settings
        _uiState.update { it.copy(settings = it.settings.copy(booking = enabled)) }

        viewModelScope.launch {
            settingsRepository.updateNotificationSettings(booking = enabled)
                .onSuccess { newSettings ->
                    _uiState.update { it.copy(settings = newSettings) }
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            settings = previousSettings,
                            error = e.message ?: "설정 변경에 실패했습니다"
                        )
                    }
                }
        }
    }

    fun updateChat(enabled: Boolean) {
        val previousSettings = _uiState.value.settings
        _uiState.update { it.copy(settings = it.settings.copy(chat = enabled)) }

        viewModelScope.launch {
            settingsRepository.updateNotificationSettings(chat = enabled)
                .onSuccess { newSettings ->
                    _uiState.update { it.copy(settings = newSettings) }
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            settings = previousSettings,
                            error = e.message ?: "설정 변경에 실패했습니다"
                        )
                    }
                }
        }
    }

    fun updateFriend(enabled: Boolean) {
        val previousSettings = _uiState.value.settings
        _uiState.update { it.copy(settings = it.settings.copy(friend = enabled)) }

        viewModelScope.launch {
            settingsRepository.updateNotificationSettings(friend = enabled)
                .onSuccess { newSettings ->
                    _uiState.update { it.copy(settings = newSettings) }
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            settings = previousSettings,
                            error = e.message ?: "설정 변경에 실패했습니다"
                        )
                    }
                }
        }
    }

    fun updateMarketing(enabled: Boolean) {
        val previousSettings = _uiState.value.settings
        _uiState.update { it.copy(settings = it.settings.copy(marketing = enabled)) }

        viewModelScope.launch {
            settingsRepository.updateNotificationSettings(marketing = enabled)
                .onSuccess { newSettings ->
                    _uiState.update { it.copy(settings = newSettings) }
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            settings = previousSettings,
                            error = e.message ?: "설정 변경에 실패했습니다"
                        )
                    }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
