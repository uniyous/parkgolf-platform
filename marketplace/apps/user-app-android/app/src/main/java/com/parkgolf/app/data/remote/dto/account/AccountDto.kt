package com.parkgolf.app.data.remote.dto.account

import kotlinx.serialization.Serializable

@Serializable
data class DeletionStatusDto(
    val userId: Int,
    val isDeletionRequested: Boolean,
    val deletionRequestedAt: String? = null,
    val deletionScheduledAt: String? = null,
    val daysRemaining: Int? = null
)

@Serializable
data class RequestDeletionRequest(
    val password: String,
    val reason: String? = null
)

@Serializable
data class RequestDeletionDto(
    val userId: Int,
    val deletionRequestedAt: String,
    val deletionScheduledAt: String,
    val gracePeriodDays: Int
)
