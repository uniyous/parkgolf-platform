package com.parkgolf.app.util

import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.common.PaginatedResponse

/**
 * API Response 처리를 위한 Extension 함수들
 * Repository 레이어의 보일러플레이트 코드를 줄여줍니다.
 */

/**
 * ApiResponse를 Result<T>로 변환합니다.
 *
 * @param errorMessage API 실패 시 사용할 에러 메시지
 * @return Result<T>
 *
 * 사용 예:
 * ```
 * val response = api.getUser()
 * return response.toResult("사용자 정보를 가져오는데 실패했습니다")
 * ```
 */
fun <T> ApiResponse<T>.toResult(errorMessage: String = "요청에 실패했습니다"): Result<T> {
    return if (success && data != null) {
        Result.success(data)
    } else {
        Result.failure(Exception(error?.message ?: errorMessage))
    }
}

/**
 * ApiResponse를 Result<R>로 변환하면서 데이터를 매핑합니다.
 *
 * @param errorMessage API 실패 시 사용할 에러 메시지
 * @param transform DTO를 Domain 모델로 변환하는 함수
 * @return Result<R>
 *
 * 사용 예:
 * ```
 * val response = api.getUser()
 * return response.toResult("사용자 정보 조회 실패") { dto -> dto.toDomain() }
 * ```
 */
inline fun <T, R> ApiResponse<T>.toResult(
    errorMessage: String = "요청에 실패했습니다",
    transform: (T) -> R
): Result<R> {
    return if (success && data != null) {
        Result.success(transform(data))
    } else {
        Result.failure(Exception(error?.message ?: errorMessage))
    }
}

/**
 * ApiResponse<Unit>처럼 데이터가 없는 응답을 Result<Unit>으로 변환합니다.
 *
 * @param errorMessage API 실패 시 사용할 에러 메시지
 * @return Result<Unit>
 *
 * 사용 예:
 * ```
 * val response = api.deleteUser()
 * return response.toUnitResult("삭제에 실패했습니다")
 * ```
 */
fun <T> ApiResponse<T>.toUnitResult(errorMessage: String = "요청에 실패했습니다"): Result<Unit> {
    return if (success) {
        Result.success(Unit)
    } else {
        Result.failure(Exception(error?.message ?: errorMessage))
    }
}

/**
 * PaginatedResponse를 Result<PaginatedData<R>>로 변환하면서 데이터를 매핑합니다.
 *
 * @param errorMessage API 실패 시 사용할 에러 메시지
 * @param transform DTO를 Domain 모델로 변환하는 함수
 * @return Result<PaginatedData<R>>
 *
 * 사용 예:
 * ```
 * val response = api.getUsers()
 * return response.toPaginatedResult("사용자 목록 조회 실패") { dto -> dto.toDomain() }
 * ```
 */
inline fun <T, R> PaginatedResponse<T>.toPaginatedResult(
    errorMessage: String = "요청에 실패했습니다",
    transform: (T) -> R
): Result<PaginatedData<R>> {
    return if (success) {
        Result.success(
            PaginatedData(
                data = data.map(transform),
                total = total,
                page = page,
                limit = limit,
                totalPages = totalPages
            )
        )
    } else {
        Result.failure(Exception(errorMessage))
    }
}

/**
 * suspend 함수를 안전하게 실행하고 Result로 래핑합니다.
 *
 * @param block 실행할 suspend 함수
 * @return Result<T>
 *
 * 사용 예:
 * ```
 * return safeApiCall {
 *     api.getUser().toResult("조회 실패") { it.toDomain() }
 * }
 * ```
 */
suspend inline fun <T> safeApiCall(crossinline block: suspend () -> Result<T>): Result<T> {
    return try {
        block()
    } catch (e: Exception) {
        Result.failure(e)
    }
}
