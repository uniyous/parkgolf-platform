package com.parkgolf.app.domain.repository

import com.parkgolf.app.domain.model.User

interface UserRepository {
    suspend fun getProfile(): Result<User>
    suspend fun updateProfile(name: String? = null, profileImageUrl: String? = null): Result<User>
    suspend fun deleteAccount(): Result<Unit>
}
