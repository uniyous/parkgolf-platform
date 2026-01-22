package com.parkgolf.app.domain.model

import java.time.LocalDateTime
import java.time.temporal.ChronoUnit

data class User(
    val id: Int,
    val email: String,
    val name: String,
    val phoneNumber: String? = null,
    val profileImageUrl: String? = null,
    val passwordChangedAt: LocalDateTime? = null,
    val createdAt: LocalDateTime? = null
) {
    val needsPasswordChange: Boolean
        get() {
            val changedAt = passwordChangedAt ?: createdAt ?: return true
            val daysSinceChange = ChronoUnit.DAYS.between(changedAt, LocalDateTime.now())
            return daysSinceChange >= 90
        }

    val daysSincePasswordChange: Long?
        get() {
            val changedAt = passwordChangedAt ?: return null
            return ChronoUnit.DAYS.between(changedAt, LocalDateTime.now())
        }

    val initials: String
        get() = name.take(1)
}

data class UserStats(
    val totalBookings: Int = 0,
    val upcomingBookings: Int = 0,
    val completedBookings: Int = 0,
    val cancelledBookings: Int = 0,
    val friendsCount: Int = 0
)

data class AuthToken(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int
)
