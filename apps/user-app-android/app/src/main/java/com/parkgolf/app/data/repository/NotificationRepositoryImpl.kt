package com.parkgolf.app.data.repository

import com.parkgolf.app.data.mapper.toDomain
import com.parkgolf.app.data.remote.api.NotificationApi
import com.parkgolf.app.domain.model.AppNotification
import com.parkgolf.app.domain.model.NotificationType
import com.parkgolf.app.domain.repository.NotificationRepository
import com.parkgolf.app.util.PaginatedData
import com.parkgolf.app.util.safeApiCall
import javax.inject.Inject

class NotificationRepositoryImpl @Inject constructor(
    private val notificationApi: NotificationApi
) : NotificationRepository {

    override suspend fun getNotifications(
        page: Int,
        limit: Int,
        type: NotificationType?,
        unreadOnly: Boolean
    ): Result<PaginatedData<AppNotification>> = safeApiCall {
        val response = notificationApi.getNotifications(
            page = page,
            limit = limit,
            type = type?.name,
            unreadOnly = if (unreadOnly) true else null
        )

        if (response.success) {
            val notifications = response.data.map { it.toDomain() }
            Result.success(
                PaginatedData(
                    data = notifications,
                    total = response.total,
                    page = response.page,
                    limit = response.limit,
                    totalPages = response.totalPages
                )
            )
        } else {
            Result.failure(Exception("알림 목록 조회에 실패했습니다"))
        }
    }

    override suspend fun getUnreadCount(): Result<Int> = safeApiCall {
        val response = notificationApi.getUnreadCount()
        if (response.success) {
            Result.success(response.count)
        } else {
            Result.failure(Exception("읽지 않은 알림 수 조회에 실패했습니다"))
        }
    }

    override suspend fun markAsRead(notificationId: Int): Result<AppNotification?> = safeApiCall {
        val response = notificationApi.markAsRead(notificationId)
        if (response.success) {
            Result.success(response.data?.toDomain())
        } else {
            Result.failure(Exception("알림 읽음 처리에 실패했습니다"))
        }
    }

    override suspend fun markAllAsRead(): Result<Int> = safeApiCall {
        val response = notificationApi.markAllAsRead()
        if (response.success) {
            Result.success(response.data?.count ?: 0)
        } else {
            Result.failure(Exception("전체 알림 읽음 처리에 실패했습니다"))
        }
    }

    override suspend fun deleteNotification(notificationId: Int): Result<Unit> = safeApiCall {
        val response = notificationApi.deleteNotification(notificationId)
        if (response.success) {
            Result.success(Unit)
        } else {
            Result.failure(Exception("알림 삭제에 실패했습니다"))
        }
    }
}
