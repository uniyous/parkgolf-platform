package com.parkgolf.app.data.repository

import com.parkgolf.app.data.mapper.toDomain
import com.parkgolf.app.data.remote.api.UserApi
import com.parkgolf.app.data.remote.dto.user.UpdateProfileRequest
import com.parkgolf.app.domain.model.User
import com.parkgolf.app.domain.repository.UserRepository
import com.parkgolf.app.util.safeApiCall
import com.parkgolf.app.util.toResult
import com.parkgolf.app.util.toUnitResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepositoryImpl @Inject constructor(
    private val userApi: UserApi
) : UserRepository {

    override suspend fun getProfile(): Result<User> = safeApiCall {
        userApi.getProfile().toResult("프로필 조회에 실패했습니다") { it.toDomain() }
    }

    override suspend fun updateProfile(name: String?, profileImageUrl: String?): Result<User> = safeApiCall {
        val request = UpdateProfileRequest(name, profileImageUrl)
        userApi.updateProfile(request).toResult("프로필 수정에 실패했습니다") { it.toDomain() }
    }

    override suspend fun deleteAccount(): Result<Unit> = safeApiCall {
        userApi.deleteAccount().toUnitResult("계정 삭제에 실패했습니다")
    }
}
