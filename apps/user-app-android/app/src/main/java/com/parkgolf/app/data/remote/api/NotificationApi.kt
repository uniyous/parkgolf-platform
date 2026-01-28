package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.notification.DeleteNotificationResponse
import com.parkgolf.app.data.remote.dto.notification.MarkAllAsReadResponse
import com.parkgolf.app.data.remote.dto.notification.MarkAsReadResponse
import com.parkgolf.app.data.remote.dto.notification.NotificationsResponse
import com.parkgolf.app.data.remote.dto.notification.UnreadCountResponse
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface NotificationApi {

    @GET("api/user/notifications")
    suspend fun getNotifications(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("type") type: String? = null,
        @Query("unreadOnly") unreadOnly: Boolean? = null
    ): NotificationsResponse

    @GET("api/user/notifications/unread-count")
    suspend fun getUnreadCount(): UnreadCountResponse

    @POST("api/user/notifications/{id}/read")
    suspend fun markAsRead(@Path("id") id: Int): MarkAsReadResponse

    @POST("api/user/notifications/read-all")
    suspend fun markAllAsRead(): MarkAllAsReadResponse

    @DELETE("api/user/notifications/{id}")
    suspend fun deleteNotification(@Path("id") id: Int): DeleteNotificationResponse
}
