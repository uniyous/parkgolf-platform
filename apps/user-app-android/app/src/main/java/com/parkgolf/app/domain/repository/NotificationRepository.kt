package com.parkgolf.app.domain.repository

import com.parkgolf.app.domain.model.AppNotification
import com.parkgolf.app.domain.model.NotificationType
import com.parkgolf.app.util.PaginatedData

interface NotificationRepository {

    /**
     * Get paginated notifications
     */
    suspend fun getNotifications(
        page: Int = 1,
        limit: Int = 20,
        type: NotificationType? = null,
        unreadOnly: Boolean = false
    ): Result<PaginatedData<AppNotification>>

    /**
     * Get unread notification count
     */
    suspend fun getUnreadCount(): Result<Int>

    /**
     * Mark a notification as read
     */
    suspend fun markAsRead(notificationId: Int): Result<AppNotification?>

    /**
     * Mark all notifications as read
     */
    suspend fun markAllAsRead(): Result<Int>

    /**
     * Delete a notification
     */
    suspend fun deleteNotification(notificationId: Int): Result<Unit>
}
