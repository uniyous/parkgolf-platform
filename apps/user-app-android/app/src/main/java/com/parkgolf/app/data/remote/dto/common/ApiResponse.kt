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

/**
 * 페이지네이션 응답
 *
 * 서버 응답 구조 (2단계 래핑):
 * { success, data: { data: [...], total, page, limit, totalPages }, error? }
 *
 * iOS와 동일하게 ApiResponse 패턴을 따른다.
 */
@Serializable
data class PaginatedResponse<T>(
    val success: Boolean,
    val data: PaginatedPayload<T>? = null,
    val error: ApiError? = null
)

@Serializable
data class PaginatedPayload<T>(
    val data: List<T>,
    val total: Int = 0,
    val page: Int = 1,
    val limit: Int = 20,
    val totalPages: Int = 1
)
