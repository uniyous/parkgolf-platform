package com.parkgolf.app.domain.repository

import com.parkgolf.app.data.remote.dto.settings.AgentMemoryStatus
import com.parkgolf.app.data.remote.dto.settings.AgentMemoryToggleResult
import com.parkgolf.app.data.remote.dto.settings.NotificationSettings
import com.parkgolf.app.domain.model.User

interface SettingsRepository {
    suspend fun getNotificationSettings(): Result<NotificationSettings>
    suspend fun updateNotificationSettings(
        booking: Boolean? = null,
        chat: Boolean? = null,
        friend: Boolean? = null,
        marketing: Boolean? = null
    ): Result<NotificationSettings>
    suspend fun updateProfile(name: String?, phone: String?): Result<User>
    suspend fun getAgentMemory(): Result<AgentMemoryStatus>
    suspend fun setAgentMemoryEnabled(enabled: Boolean): Result<AgentMemoryToggleResult>
}
