package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.account.DeletionStatusDto
import com.parkgolf.app.data.remote.dto.account.RequestDeletionDto
import com.parkgolf.app.data.remote.dto.account.RequestDeletionRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AccountApi {
    @GET("api/user/account/delete-status")
    suspend fun getDeletionStatus(): ApiResponse<DeletionStatusDto>

    @POST("api/user/account/delete-request")
    suspend fun requestDeletion(@Body request: RequestDeletionRequest): ApiResponse<RequestDeletionDto>

    @POST("api/user/account/delete-cancel")
    suspend fun cancelDeletion(): ApiResponse<CancelDeletionDto>
}

@kotlinx.serialization.Serializable
data class CancelDeletionDto(
    val userId: Int,
    val cancelled: Boolean
)
