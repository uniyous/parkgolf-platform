package com.parkgolf.app.presentation.feature.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.AppNotification
import com.parkgolf.app.domain.repository.NotificationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationsUiState(
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val notifications: List<AppNotification> = emptyList(),
    val unreadCount: Int = 0,
    val error: String? = null,
    val currentPage: Int = 1,
    val totalPages: Int = 1
) {
    val hasMorePages: Boolean
        get() = currentPage < totalPages
}

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val notificationRepository: NotificationRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationsUiState())
    val uiState: StateFlow<NotificationsUiState> = _uiState.asStateFlow()

    init {
        loadNotifications()
    }

    fun loadNotifications() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            notificationRepository.getNotifications(page = 1)
                .onSuccess { paginatedData ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        notifications = paginatedData.data,
                        currentPage = 1,
                        totalPages = paginatedData.totalPages,
                        unreadCount = paginatedData.data.count { !it.isRead }
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "알림을 불러오는데 실패했습니다"
                    )
                }
        }
    }

    fun loadMoreNotifications() {
        val currentState = _uiState.value
        if (currentState.isLoadingMore || !currentState.hasMorePages) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingMore = true)

            val nextPage = currentState.currentPage + 1
            notificationRepository.getNotifications(page = nextPage)
                .onSuccess { paginatedData ->
                    _uiState.value = _uiState.value.copy(
                        isLoadingMore = false,
                        notifications = currentState.notifications + paginatedData.data,
                        currentPage = nextPage,
                        totalPages = paginatedData.totalPages
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoadingMore = false,
                        error = exception.message
                    )
                }
        }
    }

    fun markAsRead(notification: AppNotification) {
        if (notification.isRead) return

        viewModelScope.launch {
            notificationRepository.markAsRead(notification.id)
                .onSuccess { updatedNotification ->
                    // Update local state
                    val updatedList = _uiState.value.notifications.map {
                        if (it.id == notification.id) {
                            updatedNotification ?: it.copy(
                                status = com.parkgolf.app.domain.model.NotificationStatus.READ,
                                readAt = java.time.LocalDateTime.now()
                            )
                        } else it
                    }
                    _uiState.value = _uiState.value.copy(
                        notifications = updatedList,
                        unreadCount = maxOf(0, _uiState.value.unreadCount - 1)
                    )
                }
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            notificationRepository.markAllAsRead()
                .onSuccess { count ->
                    // Update all notifications to read
                    val updatedList = _uiState.value.notifications.map {
                        if (!it.isRead) {
                            it.copy(
                                status = com.parkgolf.app.domain.model.NotificationStatus.READ,
                                readAt = java.time.LocalDateTime.now()
                            )
                        } else it
                    }
                    _uiState.value = _uiState.value.copy(
                        notifications = updatedList,
                        unreadCount = 0
                    )
                }
        }
    }

    fun deleteNotification(notification: AppNotification) {
        viewModelScope.launch {
            notificationRepository.deleteNotification(notification.id)
                .onSuccess {
                    val updatedList = _uiState.value.notifications.filter { it.id != notification.id }
                    val unreadDelta = if (!notification.isRead) 1 else 0
                    _uiState.value = _uiState.value.copy(
                        notifications = updatedList,
                        unreadCount = maxOf(0, _uiState.value.unreadCount - unreadDelta)
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        error = "알림 삭제에 실패했습니다"
                    )
                }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun refresh() {
        loadNotifications()
    }
}

// Extension function for copying AppNotification (since it's a data class)
private fun AppNotification.copy(
    status: com.parkgolf.app.domain.model.NotificationStatus = this.status,
    readAt: java.time.LocalDateTime? = this.readAt
): AppNotification {
    return AppNotification(
        id = this.id,
        userId = this.userId,
        type = this.type,
        title = this.title,
        message = this.message,
        data = this.data,
        status = status,
        readAt = readAt,
        createdAt = this.createdAt,
        updatedAt = java.time.LocalDateTime.now()
    )
}
