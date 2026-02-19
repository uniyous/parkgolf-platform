package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.user.UpdateProfileRequest
import com.parkgolf.app.data.remote.dto.user.UserProfileDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH

interface UserApi {
    @GET("api/user/iam/profile")
    suspend fun getProfile(): ApiResponse<UserProfileDto>

    @PATCH("api/user/iam/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): ApiResponse<UserProfileDto>
}
