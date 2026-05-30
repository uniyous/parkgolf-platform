package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.auth.UserDto
import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.settings.AgentMemoryStatus
import com.parkgolf.app.data.remote.dto.settings.AgentMemoryToggleResult
import com.parkgolf.app.data.remote.dto.settings.NotificationSettings
import com.parkgolf.app.data.remote.dto.settings.UpdateAgentMemoryRequest
import com.parkgolf.app.data.remote.dto.settings.UpdateNotificationSettingsRequest
import com.parkgolf.app.data.remote.dto.settings.UpdateProfileRequest
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

    @GET("api/user/settings/agent-memory")
    suspend fun getAgentMemory(): ApiResponse<AgentMemoryStatus>

    @PUT("api/user/settings/agent-memory")
    suspend fun updateAgentMemory(
        @Body request: UpdateAgentMemoryRequest
    ): ApiResponse<AgentMemoryToggleResult>
}
