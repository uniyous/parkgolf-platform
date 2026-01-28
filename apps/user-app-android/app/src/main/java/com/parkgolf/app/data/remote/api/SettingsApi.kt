package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.settings.NotificationSettings
import com.parkgolf.app.data.remote.dto.settings.UpdateNotificationSettingsRequest
import com.parkgolf.app.data.remote.dto.settings.UpdateProfileRequest
import com.parkgolf.app.data.remote.dto.auth.UserDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.PUT

interface SettingsApi {

    @GET("api/user/settings/notifications")
    suspend fun getNotificationSettings(): ApiResponse<NotificationSettings>

    @PUT("api/user/settings/notifications")
    suspend fun updateNotificationSettings(
        @Body request: UpdateNotificationSettingsRequest
    ): ApiResponse<NotificationSettings>

    @PATCH("api/user/iam/profile")
    suspend fun updateProfile(
        @Body request: UpdateProfileRequest
    ): ApiResponse<UserDto>
}
