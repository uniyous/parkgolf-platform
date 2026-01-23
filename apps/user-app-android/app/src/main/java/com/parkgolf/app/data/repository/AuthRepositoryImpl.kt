package com.parkgolf.app.data.repository

import com.parkgolf.app.data.local.datastore.AuthPreferences
import com.parkgolf.app.data.mapper.toDomain
import com.parkgolf.app.data.remote.api.AuthApi
import com.parkgolf.app.data.remote.dto.auth.ChangePasswordRequest
import com.parkgolf.app.data.remote.dto.auth.LoginRequest
import com.parkgolf.app.data.remote.dto.auth.RefreshTokenRequest
import com.parkgolf.app.data.remote.dto.auth.RegisterRequest
import com.parkgolf.app.domain.model.User
import com.parkgolf.app.domain.model.UserStats
import com.parkgolf.app.domain.repository.AuthRepository
import com.parkgolf.app.util.safeApiCall
import com.parkgolf.app.util.toResult
import com.parkgolf.app.util.toUnitResult
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

    override suspend fun getProfile(): Result<User> = safeApiCall {
        authApi.getProfile().toResult("프로필 조회에 실패했습니다") { dto ->
            val user = dto.toDomain()
            // Update cached user info with latest data
            authPreferences.saveUserInfo(
                userId = user.id.toString(),
                email = user.email,
                name = user.name,
                phoneNumber = user.phoneNumber
            )
            user
        }
    }

    override suspend fun getStats(): Result<UserStats> = safeApiCall {
        authApi.getStats().toResult("통계 조회에 실패했습니다") { it.toDomain() }
    }

    override suspend fun changePassword(
        currentPassword: String,
        newPassword: String,
        confirmPassword: String
    ): Result<Unit> = safeApiCall {
        authApi.changePassword(
            ChangePasswordRequest(currentPassword, newPassword, confirmPassword)
        ).toUnitResult("비밀번호 변경에 실패했습니다")
    }

    override suspend fun checkPasswordExpiry(): Result<Boolean> = safeApiCall {
        val response = authApi.getPasswordExpiry()
        if (response.success && response.data != null) {
            Result.success(response.data.needsChange)
        } else {
            Result.failure(Exception("비밀번호 만료 확인에 실패했습니다"))
        }
    }
}
