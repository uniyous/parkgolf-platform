package com.parkgolf.app.data.repository

import com.parkgolf.app.data.mapper.toDomain
import com.parkgolf.app.data.remote.api.SettingsApi
import com.parkgolf.app.data.remote.dto.settings.NotificationSettings
import com.parkgolf.app.data.remote.dto.settings.UpdateNotificationSettingsRequest
import com.parkgolf.app.data.remote.dto.settings.UpdateProfileRequest
import com.parkgolf.app.domain.model.User
import com.parkgolf.app.domain.repository.SettingsRepository
import com.parkgolf.app.util.safeApiCall
import com.parkgolf.app.util.toResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SettingsRepositoryImpl @Inject constructor(
    private val settingsApi: SettingsApi
) : SettingsRepository {

    override suspend fun getNotificationSettings(): Result<NotificationSettings> = safeApiCall {
        settingsApi.getNotificationSettings().toResult("알림 설정을 불러오는데 실패했습니다")
    }

    override suspend fun updateNotificationSettings(
        booking: Boolean?,
        chat: Boolean?,
        friend: Boolean?,
        marketing: Boolean?
    ): Result<NotificationSettings> = safeApiCall {
        val request = UpdateNotificationSettingsRequest(
            booking = booking,
            chat = chat,
            friend = friend,
            marketing = marketing
        )
        settingsApi.updateNotificationSettings(request).toResult("알림 설정 변경에 실패했습니다")
    }

    override suspend fun updateProfile(name: String?, phoneNumber: String?): Result<User> = safeApiCall {
        val request = UpdateProfileRequest(name = name, phoneNumber = phoneNumber)
        settingsApi.updateProfile(request).toResult("프로필 수정에 실패했습니다") { it.toDomain() }
    }
}
