package com.parkgolf.app.data.remote.dto.user

import kotlinx.serialization.Serializable

@Serializable
data class UserProfileDto(
    val id: Int,
    val email: String,
    val name: String,
    val profileImageUrl: String? = null
)

@Serializable
data class UpdateProfileRequest(
    val name: String? = null,
    val profileImageUrl: String? = null
)
