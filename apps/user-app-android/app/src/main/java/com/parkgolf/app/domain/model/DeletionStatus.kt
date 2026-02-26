package com.parkgolf.app.domain.model

data class DeletionStatus(
    val isDeletionRequested: Boolean,
    val deletionRequestedAt: String?,
    val deletionScheduledAt: String?,
    val daysRemaining: Int?
)
