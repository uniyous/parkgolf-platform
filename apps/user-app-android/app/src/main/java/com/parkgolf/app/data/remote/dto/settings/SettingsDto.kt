package com.parkgolf.app.data.remote.dto.settings

import kotlinx.serialization.Serializable

@Serializable
data class NotificationSettings(
    val booking: Boolean = true,
    val chat: Boolean = true,
    val friend: Boolean = true,
    val marketing: Boolean = false
)

@Serializable
data class UpdateNotificationSettingsRequest(
    val booking: Boolean? = null,
    val chat: Boolean? = null,
    val friend: Boolean? = null,
    val marketing: Boolean? = null
)

@Serializable
data class UpdateProfileRequest(
    val name: String? = null,
    val phoneNumber: String? = null
)
