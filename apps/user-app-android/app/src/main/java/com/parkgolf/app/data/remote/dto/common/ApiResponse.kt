package com.parkgolf.app.data.remote.dto.common

import kotlinx.serialization.Serializable

@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ApiError? = null,
    /** saga 트랜잭션을 경유한 응답에만 존재 */
    val saga: SagaMeta? = null
)

@Serializable
data class ApiError(
    val code: String,
    val message: String
)

/** Saga 트랜잭션 메타데이터 */
@Serializable
data class SagaMeta(
    val executionId: Int,
    val status: String,
    val failReason: String? = null,
    val duplicate: Boolean? = null
)

@Serializable
data class PaginatedResponse<T>(
    val success: Boolean,
    val data: List<T>,
    val total: Int,
    val page: Int,
    val limit: Int,
    val totalPages: Int
)
