package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.auth.ChangePasswordRequest
import com.parkgolf.app.data.remote.dto.auth.LoginRequest
import com.parkgolf.app.data.remote.dto.auth.LoginResponse
import com.parkgolf.app.data.remote.dto.auth.PasswordExpiryResponse
import com.parkgolf.app.data.remote.dto.auth.RefreshTokenRequest
import com.parkgolf.app.data.remote.dto.auth.RegisterRequest
import com.parkgolf.app.data.remote.dto.auth.UserDto
import com.parkgolf.app.data.remote.dto.auth.UserStatsDto
import com.parkgolf.app.data.remote.dto.common.ApiResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AuthApi {

    @POST("api/user/iam/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("api/user/iam/register")
    suspend fun register(@Body request: RegisterRequest): LoginResponse

    @POST("api/user/iam/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): LoginResponse

    @POST("api/user/iam/logout")
    suspend fun logout()

    @GET("api/user/iam/profile")
    suspend fun getProfile(): ApiResponse<UserDto>

    @GET("api/user/iam/stats")
    suspend fun getStats(): ApiResponse<UserStatsDto>

    @POST("api/user/account/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): ApiResponse<Unit>

    @GET("api/user/account/password-expiry")
    suspend fun getPasswordExpiry(): PasswordExpiryResponse
}
