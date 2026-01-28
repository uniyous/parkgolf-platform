package com.parkgolf.app.presentation.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.data.local.datastore.AuthPreferences
import com.parkgolf.app.domain.model.PasswordExpiryInfo
import com.parkgolf.app.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MainUiState(
    val showPasswordReminder: Boolean = false,
    val passwordExpiryInfo: PasswordExpiryInfo? = null,
    val hasCheckedExpiry: Boolean = false
)

@HiltViewModel
class MainViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    init {
        checkPasswordExpiry()
    }

    /**
     * 비밀번호 만료 체크 (앱 진입 시 한 번만)
     */
    private fun checkPasswordExpiry() {
        if (_uiState.value.hasCheckedExpiry) return

        viewModelScope.launch {
            try {
                // 최근 7일 내 스킵했는지 확인
                if (authPreferences.hasRecentlySkippedPasswordChange()) {
                    _uiState.value = _uiState.value.copy(hasCheckedExpiry = true)
                    return@launch
                }

                // 비밀번호 만료 정보 조회
                val result = authRepository.checkPasswordExpiry()
                result.onSuccess { expiryInfo ->
                    if (expiryInfo.needsChange) {
                        _uiState.value = _uiState.value.copy(
                            showPasswordReminder = true,
                            passwordExpiryInfo = expiryInfo,
                            hasCheckedExpiry = true
                        )
                    } else {
                        _uiState.value = _uiState.value.copy(hasCheckedExpiry = true)
                    }
                }.onFailure {
                    // 에러 시 무시하고 진행
                    _uiState.value = _uiState.value.copy(hasCheckedExpiry = true)
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(hasCheckedExpiry = true)
            }
        }
    }

    /**
     * "나중에 하기" 선택 시
     */
    fun onSkipPasswordChange() {
        viewModelScope.launch {
            authPreferences.savePasswordChangeSkipped()
            _uiState.value = _uiState.value.copy(showPasswordReminder = false)
        }
    }

    /**
     * "지금 변경하기" 선택 시
     */
    fun onDismissReminder() {
        _uiState.value = _uiState.value.copy(showPasswordReminder = false)
    }
}
