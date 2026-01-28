package com.parkgolf.app.presentation.feature.notifications

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Shield
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parkgolf.app.domain.model.AppNotification
import com.parkgolf.app.domain.model.NotificationType
import com.parkgolf.app.domain.repository.NotificationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// Filter enum for notifications
enum class NotificationFilter(
    val label: String,
    val icon: ImageVector,
    val types: List<NotificationType>?
) {
    ALL(
        label = "전체",
        icon = Icons.Default.Notifications,
        types = null
    ),
    BOOKING(
        label = "예약",
        icon = Icons.Default.CalendarMonth,
        types = listOf(
            NotificationType.BOOKING_CONFIRMED,
            NotificationType.BOOKING_CANCELLED,
            NotificationType.PAYMENT_SUCCESS,
            NotificationType.PAYMENT_FAILED
        )
    ),
    SOCIAL(
        label = "소셜",
        icon = Icons.Default.People,
        types = listOf(
            NotificationType.FRIEND_REQUEST,
            NotificationType.FRIEND_ACCEPTED,
            NotificationType.CHAT_MESSAGE
        )
    ),
    SYSTEM(
        label = "시스템",
        icon = Icons.Default.Shield,
        types = listOf(NotificationType.SYSTEM_ALERT)
    );

    fun matches(type: NotificationType): Boolean {
        return types == null || types.contains(type)
    }

    fun emptyMessage(): Pair<String, String> = when (this) {
        ALL -> "알림이 없습니다" to "새로운 알림이 도착하면 여기에 표시됩니다"
        BOOKING -> "예약 알림이 없습니다" to "예약 관련 알림이 도착하면 여기에 표시됩니다"
        SOCIAL -> "소셜 알림이 없습니다" to "친구 요청이나 채팅 알림이 도착하면 여기에 표시됩니다"
        SYSTEM -> "시스템 알림이 없습니다" to "시스템 공지사항이 도착하면 여기에 표시됩니다"
    }
}

data class NotificationsUiState(
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val notifications: List<AppNotification> = emptyList(),
    val selectedFilter: NotificationFilter = NotificationFilter.ALL,
    val error: String? = null,
    val currentPage: Int = 1,
    val totalPages: Int = 1
) {
    val hasMorePages: Boolean
        get() = currentPage < totalPages

    val filteredNotifications: List<AppNotification>
        get() {
            val types = selectedFilter.types ?: return notifications
            return notifications.filter { types.contains(it.type) }
        }

    val unreadCount: Int
        get() = notifications.count { !it.isRead }

    val unreadCounts: Map<NotificationFilter, Int>
        get() {
            return NotificationFilter.entries.associateWith { filter ->
                val types = filter.types
                if (types == null) {
                    notifications.count { !it.isRead }
                } else {
                    notifications.count { !it.isRead && types.contains(it.type) }
                }
            }
        }
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

    fun setFilter(filter: NotificationFilter) {
        _uiState.value = _uiState.value.copy(selectedFilter = filter)
    }

    fun loadNotifications() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            notificationRepository.getNotifications(page = 1, limit = 50)
                .onSuccess { paginatedData ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        notifications = paginatedData.data,
                        currentPage = 1,
                        totalPages = paginatedData.totalPages
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
                        notifications = updatedList
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
                        notifications = updatedList
                    )
                }
        }
    }

    fun deleteNotification(notification: AppNotification) {
        viewModelScope.launch {
            notificationRepository.deleteNotification(notification.id)
                .onSuccess {
                    val updatedList = _uiState.value.notifications.filter { it.id != notification.id }
                    _uiState.value = _uiState.value.copy(
                        notifications = updatedList
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
