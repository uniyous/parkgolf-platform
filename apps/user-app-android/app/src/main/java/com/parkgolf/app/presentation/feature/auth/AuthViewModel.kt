package com.parkgolf.app.presentation.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.User
import com.parkgolf.app.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
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
        observeAuthStatus()
    }

    /**
     * 인증 상태와 사용자 정보를 combine으로 동시 관찰
     * 중첩 collect 대신 단일 collect로 개선하여 메모리 효율성 향상
     */
    private fun observeAuthStatus() {
        viewModelScope.launch {
            combine(
                authRepository.isLoggedIn,
                authRepository.currentUser
            ) { isLoggedIn, user ->
                isLoggedIn to user
            }.collect { (isLoggedIn, user) ->
                _uiState.update {
                    it.copy(
                        isLoggedIn = isLoggedIn,
                        user = if (isLoggedIn) user else null
                    )
                }
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            authRepository.login(email, password)
                .onSuccess { user ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isLoggedIn = true,
                            user = user,
                            loginSuccess = true,
                            error = null
                        )
                    }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "로그인에 실패했습니다"
                        )
                    }
                }
        }
    }

    fun signUp(email: String, password: String, name: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            authRepository.register(email, password, name, null)
                .onSuccess {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            signUpSuccess = true,
                            error = null
                        )
                    }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "회원가입에 실패했습니다"
                        )
                    }
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
        _uiState.update { it.copy(error = null) }
    }

    fun resetLoginSuccess() {
        _uiState.update { it.copy(loginSuccess = false) }
    }

    fun resetSignUpSuccess() {
        _uiState.update { it.copy(signUpSuccess = false) }
    }

    fun refreshProfile() {
        viewModelScope.launch {
            authRepository.getProfile()
                .onSuccess { user ->
                    _uiState.update { it.copy(user = user) }
                }
        }
    }
}
