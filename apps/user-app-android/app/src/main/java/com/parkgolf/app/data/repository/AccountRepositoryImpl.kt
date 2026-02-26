package com.parkgolf.app.data.repository

import com.parkgolf.app.data.remote.api.AccountApi
import com.parkgolf.app.data.remote.dto.account.RequestDeletionRequest
import com.parkgolf.app.domain.model.DeletionStatus
import com.parkgolf.app.domain.repository.AccountRepository
import com.parkgolf.app.util.safeApiCall
import com.parkgolf.app.util.toResult
import com.parkgolf.app.util.toUnitResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AccountRepositoryImpl @Inject constructor(
    private val accountApi: AccountApi
) : AccountRepository {

    override suspend fun getDeletionStatus(): Result<DeletionStatus> = safeApiCall {
        accountApi.getDeletionStatus().toResult("삭제 상태 조회에 실패했습니다") { dto ->
            DeletionStatus(
                isDeletionRequested = dto.isDeletionRequested,
                deletionRequestedAt = dto.deletionRequestedAt,
                deletionScheduledAt = dto.deletionScheduledAt,
                daysRemaining = dto.daysRemaining
            )
        }
    }

    override suspend fun requestDeletion(password: String, reason: String?): Result<Unit> = safeApiCall {
        val request = RequestDeletionRequest(password = password, reason = reason)
        accountApi.requestDeletion(request).toUnitResult("계정 삭제 요청에 실패했습니다")
    }

    override suspend fun cancelDeletion(): Result<Unit> = safeApiCall {
        accountApi.cancelDeletion().toUnitResult("계정 삭제 취소에 실패했습니다")
    }
}
