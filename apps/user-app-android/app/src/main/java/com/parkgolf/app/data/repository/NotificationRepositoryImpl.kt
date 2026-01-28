package com.parkgolf.app.data.repository

import com.parkgolf.app.data.mapper.toDomain
import com.parkgolf.app.data.remote.api.NotificationApi
import com.parkgolf.app.domain.model.AppNotification
import com.parkgolf.app.domain.model.NotificationType
import com.parkgolf.app.domain.repository.NotificationRepository
import com.parkgolf.app.util.PaginatedData
import javax.inject.Inject

class NotificationRepositoryImpl @Inject constructor(
    private val notificationApi: NotificationApi
) : NotificationRepository {

    override suspend fun getNotifications(
        page: Int,
        limit: Int,
        type: NotificationType?,
        unreadOnly: Boolean
    ): Result<PaginatedData<AppNotification>> {
        return try {
            val response = notificationApi.getNotifications(
                page = page,
                limit = limit,
                type = type?.name,
                unreadOnly = if (unreadOnly) true else null
            )

            if (response.success) {
                val notifications = response.data.notifications.map { it.toDomain() }
                Result.success(
                    PaginatedData(
                        data = notifications,
                        total = response.data.total,
                        page = response.data.page,
                        totalPages = response.data.totalPages
                    )
                )
            } else {
                Result.failure(Exception("Failed to get notifications"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getUnreadCount(): Result<Int> {
        return try {
            val response = notificationApi.getUnreadCount()
            if (response.success) {
                Result.success(response.count)
            } else {
                Result.failure(Exception("Failed to get unread count"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun markAsRead(notificationId: Int): Result<AppNotification?> {
        return try {
            val response = notificationApi.markAsRead(notificationId)
            if (response.success) {
                Result.success(response.data?.toDomain())
            } else {
                Result.failure(Exception("Failed to mark notification as read"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun markAllAsRead(): Result<Int> {
        return try {
            val response = notificationApi.markAllAsRead()
            if (response.success) {
                Result.success(response.data?.count ?: 0)
            } else {
                Result.failure(Exception("Failed to mark all notifications as read"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteNotification(notificationId: Int): Result<Unit> {
        return try {
            val response = notificationApi.deleteNotification(notificationId)
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete notification"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
