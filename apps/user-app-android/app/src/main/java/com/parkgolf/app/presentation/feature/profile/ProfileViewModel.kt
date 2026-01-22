package com.parkgolf.app.presentation.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.User
import com.parkgolf.app.domain.repository.AuthRepository
import com.parkgolf.app.domain.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val isEditing: Boolean = false,
    val editName: String = "",
    val error: String? = null,
    val successMessage: String? = null,
    val logoutComplete: Boolean = false
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadUser()
    }

    fun loadUser() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            authRepository.getCurrentUser().collect { user ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    user = user,
                    editName = user?.name ?: ""
                )
            }
        }
    }

    fun startEditing() {
        _uiState.value = _uiState.value.copy(
            isEditing = true,
            editName = _uiState.value.user?.name ?: ""
        )
    }

    fun cancelEditing() {
        _uiState.value = _uiState.value.copy(
            isEditing = false,
            editName = _uiState.value.user?.name ?: ""
        )
    }

    fun updateEditName(name: String) {
        _uiState.value = _uiState.value.copy(editName = name)
    }

    fun saveProfile() {
        val name = _uiState.value.editName.trim()
        if (name.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "이름을 입력해주세요")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            userRepository.updateProfile(name = name)
                .onSuccess { updatedUser ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        user = updatedUser,
                        isEditing = false,
                        successMessage = "프로필이 업데이트되었습니다"
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "프로필 업데이트 실패"
                    )
                }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.value = _uiState.value.copy(logoutComplete = true)
        }
    }

    fun deleteAccount() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            userRepository.deleteAccount()
                .onSuccess {
                    authRepository.logout()
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        logoutComplete = true
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "계정 삭제 실패"
                    )
                }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun clearSuccessMessage() {
        _uiState.value = _uiState.value.copy(successMessage = null)
    }
}
