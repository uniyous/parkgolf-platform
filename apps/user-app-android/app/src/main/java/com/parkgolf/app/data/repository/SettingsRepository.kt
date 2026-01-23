package com.parkgolf.app.data.repository

import com.parkgolf.app.data.remote.api.SettingsApi
import com.parkgolf.app.data.remote.dto.settings.NotificationSettings
import com.parkgolf.app.data.remote.dto.settings.UpdateNotificationSettingsRequest
import com.parkgolf.app.data.remote.dto.settings.UpdateProfileRequest
import com.parkgolf.app.data.remote.dto.auth.UserDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SettingsRepository @Inject constructor(
    private val settingsApi: SettingsApi
) {
    suspend fun getNotificationSettings(): NotificationSettings {
        val response = settingsApi.getNotificationSettings()
        return response.data ?: NotificationSettings()
    }

    suspend fun updateNotificationSettings(request: UpdateNotificationSettingsRequest): NotificationSettings {
        val response = settingsApi.updateNotificationSettings(request)
        return response.data ?: NotificationSettings()
    }

    suspend fun updateBookingNotification(enabled: Boolean): NotificationSettings {
        return updateNotificationSettings(UpdateNotificationSettingsRequest(booking = enabled))
    }

    suspend fun updateChatNotification(enabled: Boolean): NotificationSettings {
        return updateNotificationSettings(UpdateNotificationSettingsRequest(chat = enabled))
    }

    suspend fun updateFriendNotification(enabled: Boolean): NotificationSettings {
        return updateNotificationSettings(UpdateNotificationSettingsRequest(friend = enabled))
    }

    suspend fun updateMarketingNotification(enabled: Boolean): NotificationSettings {
        return updateNotificationSettings(UpdateNotificationSettingsRequest(marketing = enabled))
    }

    suspend fun updateProfile(name: String?, phoneNumber: String?): UserDto {
        val response = settingsApi.updateProfile(UpdateProfileRequest(name = name, phoneNumber = phoneNumber))
        return response.data ?: throw Exception("Failed to update profile")
    }
}
