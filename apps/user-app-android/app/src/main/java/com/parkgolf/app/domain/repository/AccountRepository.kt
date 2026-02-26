package com.parkgolf.app.domain.repository

import com.parkgolf.app.domain.model.DeletionStatus

interface AccountRepository {
    suspend fun getDeletionStatus(): Result<DeletionStatus>
    suspend fun requestDeletion(password: String, reason: String?): Result<Unit>
    suspend fun cancelDeletion(): Result<Unit>
}
