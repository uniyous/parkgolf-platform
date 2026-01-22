package com.parkgolf.app.data.repository

import com.parkgolf.app.data.remote.api.UpdateProfileRequest
import com.parkgolf.app.data.remote.api.UserApi
import com.parkgolf.app.data.remote.api.UserProfileDto
import com.parkgolf.app.domain.model.User
import com.parkgolf.app.domain.repository.UserRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepositoryImpl @Inject constructor(
    private val userApi: UserApi
) : UserRepository {

    override suspend fun getProfile(): Result<User> {
        return try {
            val response = userApi.getProfile()
            if (response.success && response.data != null) {
                Result.success(response.data.toDomain())
            } else {
                Result.failure(Exception("Failed to get profile"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateProfile(name: String?, profileImageUrl: String?): Result<User> {
        return try {
            val request = UpdateProfileRequest(name, profileImageUrl)
            val response = userApi.updateProfile(request)
            if (response.success && response.data != null) {
                Result.success(response.data.toDomain())
            } else {
                Result.failure(Exception("Failed to update profile"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteAccount(): Result<Unit> {
        return try {
            val response = userApi.deleteAccount()
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete account"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

private fun UserProfileDto.toDomain(): User {
    return User(
        id = id,
        email = email,
        name = name,
        profileImageUrl = profileImageUrl
    )
}
