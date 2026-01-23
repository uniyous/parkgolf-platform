package com.parkgolf.app.presentation.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.data.remote.api.AuthApi
import com.parkgolf.app.data.remote.dto.auth.ChangePasswordRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChangePasswordUiState(
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
) {
    val validationErrors: List<String>
        get() = if (newPassword.isEmpty()) emptyList() else validatePassword(newPassword)

    val passwordStrength: PasswordStrength
        get() = calculatePasswordStrength(newPassword)

    val passwordsMatch: Boolean
        get() = newPassword.isNotEmpty() && newPassword == confirmPassword

    val canSubmit: Boolean
        get() = currentPassword.isNotEmpty() &&
                newPassword.isNotEmpty() &&
                confirmPassword.isNotEmpty() &&
                validationErrors.isEmpty() &&
                passwordsMatch
}

@HiltViewModel
class ChangePasswordViewModel @Inject constructor(
    private val authApi: AuthApi
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChangePasswordUiState())
    val uiState: StateFlow<ChangePasswordUiState> = _uiState.asStateFlow()

    fun updateCurrentPassword(password: String) {
        _uiState.update { it.copy(currentPassword = password) }
    }

    fun updateNewPassword(password: String) {
        _uiState.update { it.copy(newPassword = password) }
    }

    fun updateConfirmPassword(password: String) {
        _uiState.update { it.copy(confirmPassword = password) }
    }

    fun changePassword() {
        val state = _uiState.value
        if (!state.canSubmit) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                authApi.changePassword(
                    ChangePasswordRequest(
                        currentPassword = state.currentPassword,
                        newPassword = state.newPassword,
                        confirmPassword = state.confirmPassword
                    )
                )
                _uiState.update { it.copy(isLoading = false, isSuccess = true) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "비밀번호 변경에 실패했습니다"
                    )
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun resetState() {
        _uiState.update { ChangePasswordUiState() }
    }
}

private fun validatePassword(password: String): List<String> {
    val errors = mutableListOf<String>()

    if (password.length < 8) {
        errors.add("8자 이상이어야 합니다")
    }
    if (password.length > 128) {
        errors.add("128자 이하여야 합니다")
    }
    if (!password.contains(Regex("[a-zA-Z]"))) {
        errors.add("영문을 포함해야 합니다")
    }
    if (!password.contains(Regex("[0-9]"))) {
        errors.add("숫자를 포함해야 합니다")
    }
    if (!password.contains(Regex("[!@#\$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]"))) {
        errors.add("특수문자를 포함해야 합니다")
    }

    return errors
}

private fun calculatePasswordStrength(password: String): PasswordStrength {
    if (password.isEmpty()) return PasswordStrength.WEAK

    var score = 0

    // Length score
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (password.length >= 16) score++

    // Complexity score
    if (password.contains(Regex("[a-z]"))) score++
    if (password.contains(Regex("[A-Z]"))) score++
    if (password.contains(Regex("[0-9]"))) score++
    if (password.contains(Regex("[!@#\$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]"))) score++

    return when (score) {
        in 0..2 -> PasswordStrength.WEAK
        in 3..4 -> PasswordStrength.FAIR
        in 5..6 -> PasswordStrength.GOOD
        else -> PasswordStrength.STRONG
    }
}
