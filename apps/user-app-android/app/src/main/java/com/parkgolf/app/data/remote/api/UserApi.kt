package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.user.UpdateProfileRequest
import com.parkgolf.app.data.remote.dto.user.UserProfileDto
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH

interface UserApi {
    @GET("api/users/me")
    suspend fun getProfile(): ApiResponse<UserProfileDto>

    @PATCH("api/users/me")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): ApiResponse<UserProfileDto>

    @DELETE("api/users/me")
    suspend fun deleteAccount(): ApiResponse<Unit>
}
