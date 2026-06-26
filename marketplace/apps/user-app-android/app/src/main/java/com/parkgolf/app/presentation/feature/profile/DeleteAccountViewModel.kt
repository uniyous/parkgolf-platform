package com.parkgolf.app.presentation.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.DeletionStatus
import com.parkgolf.app.domain.repository.AccountRepository
import com.parkgolf.app.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DeleteAccountUiState(
    val isLoading: Boolean = true,
    val status: DeletionStatus? = null,
    val password: String = "",
    val reason: String = "",
    val confirmed: Boolean = false,
    val isSubmitting: Boolean = false,
    val isCancelling: Boolean = false,
    val error: String? = null,
    val logoutComplete: Boolean = false
) {
    val canSubmit: Boolean
        get() = password.isNotBlank() && confirmed && !isSubmitting
}

@HiltViewModel
class DeleteAccountViewModel @Inject constructor(
    private val accountRepository: AccountRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DeleteAccountUiState())
    val uiState: StateFlow<DeleteAccountUiState> = _uiState.asStateFlow()

    init {
        loadDeletionStatus()
    }

    fun loadDeletionStatus() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            accountRepository.getDeletionStatus()
                .onSuccess { status ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        status = status
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "상태 조회에 실패했습니다"
                    )
                }
        }
    }

    fun updatePassword(password: String) {
        _uiState.value = _uiState.value.copy(password = password)
    }

    fun updateReason(reason: String) {
        _uiState.value = _uiState.value.copy(reason = reason)
    }

    fun updateConfirmed(confirmed: Boolean) {
        _uiState.value = _uiState.value.copy(confirmed = confirmed)
    }

    fun requestDeletion() {
        if (!_uiState.value.canSubmit) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, error = null)

            val reason = _uiState.value.reason.ifBlank { null }
            accountRepository.requestDeletion(_uiState.value.password, reason)
                .onSuccess {
                    authRepository.logout()
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        logoutComplete = true
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        error = exception.message ?: "계정 삭제 요청에 실패했습니다"
                    )
                }
        }
    }

    fun cancelDeletion() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isCancelling = true, error = null)

            accountRepository.cancelDeletion()
                .onSuccess {
                    loadDeletionStatus()
                    _uiState.value = _uiState.value.copy(isCancelling = false)
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isCancelling = false,
                        error = exception.message ?: "계정 삭제 취소에 실패했습니다"
                    )
                }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
