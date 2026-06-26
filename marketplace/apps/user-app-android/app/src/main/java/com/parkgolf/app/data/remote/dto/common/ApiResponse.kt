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
 * 서버 응답 구조: { success, data: [...] }
 * (페이지 메타 total/page/limit/totalPages는 엔드포인트에 따라 누락될 수 있어 default 값 부여)
 */
@Serializable
data class PaginatedResponse<T>(
    val success: Boolean,
    val data: List<T> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val limit: Int = 20,
    val totalPages: Int = 1,
    val error: ApiError? = null
)
