package com.parkgolf.app.domain.repository

import com.parkgolf.app.domain.model.User
import com.parkgolf.app.domain.model.UserStats
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    val isLoggedIn: Flow<Boolean>
    val currentUser: Flow<User?>

    suspend fun login(email: String, password: String): Result<User>
    suspend fun register(
        email: String,
        password: String,
        name: String,
        phoneNumber: String?
    ): Result<User>
    suspend fun refreshToken(): Result<Unit>
    suspend fun logout()
    suspend fun getProfile(): Result<User>
    suspend fun getStats(): Result<UserStats>
    suspend fun changePassword(
        currentPassword: String,
        newPassword: String,
        confirmPassword: String
    ): Result<Unit>
    suspend fun checkPasswordExpiry(): Result<Boolean>
}
