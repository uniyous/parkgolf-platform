package com.parkgolf.app.data.repository

import com.parkgolf.app.data.local.datastore.AuthPreferences
import com.parkgolf.app.data.remote.api.AuthApi
import com.parkgolf.app.data.remote.dto.auth.ChangePasswordRequest
import com.parkgolf.app.data.remote.dto.auth.LoginRequest
import com.parkgolf.app.data.remote.dto.auth.RefreshTokenRequest
import com.parkgolf.app.data.remote.dto.auth.RegisterRequest
import com.parkgolf.app.domain.model.User
import com.parkgolf.app.domain.model.UserStats
import com.parkgolf.app.domain.repository.AuthRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val authApi: AuthApi,
    private val authPreferences: AuthPreferences
) : AuthRepository {

    override val isLoggedIn: Flow<Boolean> = authPreferences.isLoggedIn

    override val currentUser: Flow<User?> = authPreferences.userName.map { name ->
        if (name != null) {
            val email = authPreferences.userEmail.first()
            val id = authPreferences.userId.first()?.toIntOrNull()
            val phoneNumber = authPreferences.userPhone.first()
            if (email != null && id != null) {
                User(id = id, email = email, name = name, phoneNumber = phoneNumber)
            } else null
        } else null
    }

    override suspend fun login(email: String, password: String): Result<User> {
        return try {
            val response = authApi.login(LoginRequest(email, password))
            authPreferences.saveTokens(response.accessToken, response.refreshToken)
            authPreferences.saveUserInfo(
                userId = response.user.id.toString(),
                email = response.user.email,
                name = response.user.name,
                phoneNumber = response.user.phoneNumber
            )
            Result.success(response.user.toDomain())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun register(
        email: String,
        password: String,
        name: String,
        phoneNumber: String?
    ): Result<User> {
        return try {
            val response = authApi.register(
                RegisterRequest(
                    email = email,
                    password = password,
                    name = name,
                    phoneNumber = phoneNumber
                )
            )
            authPreferences.saveTokens(response.accessToken, response.refreshToken)
            authPreferences.saveUserInfo(
                userId = response.user.id.toString(),
                email = response.user.email,
                name = response.user.name,
                phoneNumber = response.user.phoneNumber
            )
            Result.success(response.user.toDomain())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun refreshToken(): Result<Unit> {
        return try {
            val currentRefreshToken = authPreferences.refreshToken.first()
                ?: return Result.failure(Exception("No refresh token"))

            val response = authApi.refreshToken(RefreshTokenRequest(currentRefreshToken))
            authPreferences.saveTokens(
                response.accessToken,
                response.refreshToken
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun logout() {
        try {
            authApi.logout()
        } catch (_: Exception) {
            // Ignore logout errors
        } finally {
            authPreferences.clearAll()
        }
    }

    override suspend fun getProfile(): Result<User> {
        return try {
            val response = authApi.getProfile()
            if (response.success && response.data != null) {
                val user = response.data.toDomain()
                // Update cached user info with latest data
                authPreferences.saveUserInfo(
                    userId = user.id.toString(),
                    email = user.email,
                    name = user.name,
                    phoneNumber = user.phoneNumber
                )
                Result.success(user)
            } else {
                Result.failure(Exception("Failed to get profile"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getStats(): Result<UserStats> {
        return try {
            val response = authApi.getStats()
            if (response.success && response.data != null) {
                Result.success(response.data.toDomain())
            } else {
                Result.failure(Exception("Failed to get stats"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun changePassword(
        currentPassword: String,
        newPassword: String,
        confirmPassword: String
    ): Result<Unit> {
        return try {
            val response = authApi.changePassword(
                ChangePasswordRequest(currentPassword, newPassword, confirmPassword)
            )
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Password change failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun checkPasswordExpiry(): Result<Boolean> {
        return try {
            val response = authApi.getPasswordExpiry()
            if (response.success && response.data != null) {
                Result.success(response.data.needsChange)
            } else {
                Result.failure(Exception("Failed to check password expiry"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// Extension functions for mapping DTOs to Domain models
private fun com.parkgolf.app.data.remote.dto.auth.UserDto.toDomain(): User {
    return User(
        id = id,
        email = email,
        name = name,
        phoneNumber = phoneOrPhoneNumber,  // Use combined field (handles both 'phone' and 'phoneNumber')
        profileImageUrl = profileImageUrl
    )
}

private fun com.parkgolf.app.data.remote.dto.auth.UserStatsDto.toDomain(): UserStats {
    return UserStats(
        totalBookings = totalBookings,
        upcomingBookings = upcomingBookings,
        completedBookings = completedBookings,
        cancelledBookings = cancelledBookings,
        friendsCount = friendsCount
    )
}
