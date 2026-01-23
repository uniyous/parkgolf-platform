package com.parkgolf.app.presentation.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.User
import com.parkgolf.app.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val isLoggedIn: Boolean = false,
    val user: User? = null,
    val error: String? = null,
    val loginSuccess: Boolean = false,
    val signUpSuccess: Boolean = false
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        checkAuthStatus()
    }

    private fun checkAuthStatus() {
        viewModelScope.launch {
            authRepository.isLoggedIn.collect { isLoggedIn ->
                if (isLoggedIn) {
                    authRepository.currentUser.collect { user ->
                        _uiState.value = _uiState.value.copy(
                            isLoggedIn = true,
                            user = user
                        )
                    }
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoggedIn = false,
                        user = null
                    )
                }
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            authRepository.login(email, password)
                .onSuccess { user ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isLoggedIn = true,
                        user = user,
                        loginSuccess = true,
                        error = null
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "로그인에 실패했습니다"
                    )
                }
        }
    }

    fun signUp(email: String, password: String, name: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            authRepository.register(email, password, name, null)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        signUpSuccess = true,
                        error = null
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "회원가입에 실패했습니다"
                    )
                }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.value = AuthUiState()
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun resetLoginSuccess() {
        _uiState.value = _uiState.value.copy(loginSuccess = false)
    }

    fun resetSignUpSuccess() {
        _uiState.value = _uiState.value.copy(signUpSuccess = false)
    }

    fun refreshProfile() {
        viewModelScope.launch {
            authRepository.getProfile()
                .onSuccess { user ->
                    _uiState.value = _uiState.value.copy(user = user)
                }
        }
    }
}
