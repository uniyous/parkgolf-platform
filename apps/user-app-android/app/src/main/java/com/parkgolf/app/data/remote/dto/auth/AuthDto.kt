package com.parkgolf.app.data.remote.dto.auth

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    val name: String,
    val phoneNumber: String? = null
)

@Serializable
data class RefreshTokenRequest(
    val refreshToken: String
)

@Serializable
data class LoginResponse(
    val success: Boolean,
    val data: AuthData? = null
)

@Serializable
data class AuthData(
    val accessToken: String,
    val refreshToken: String,
    val user: UserDto,
    val expiresIn: Int
)

@Serializable
data class UserDto(
    val id: Int,
    val email: String,
    val name: String,
    val phoneNumber: String? = null,
    val profileImageUrl: String? = null,
    val passwordChangedAt: String? = null,
    val createdAt: String? = null
)

@Serializable
data class UserStatsDto(
    val totalBookings: Int = 0,
    val upcomingBookings: Int = 0,
    val completedBookings: Int = 0,
    val cancelledBookings: Int = 0,
    val friendsCount: Int = 0
)

@Serializable
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String,
    val confirmPassword: String
)

@Serializable
data class PasswordExpiryResponse(
    val success: Boolean,
    val data: PasswordExpiryData? = null
)

@Serializable
data class PasswordExpiryData(
    val needsChange: Boolean,
    val daysSinceChange: Int? = null,
    val passwordChangedAt: String? = null
)
