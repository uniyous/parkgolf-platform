package com.parkgolf.app.data.remote.dto.booking

import kotlinx.serialization.Serializable

@Serializable
data class BookingDto(
    val id: String,
    val bookingNumber: String? = null,
    val userId: Int? = null,
    val gameId: Int,
    val gameTimeSlotId: Int,
    val gameName: String? = null,
    val clubName: String,
    val courseName: String? = null,
    val bookingDate: String,
    val startTime: String,
    val endTime: String,
    val playerCount: Int,
    val status: String,
    val totalPrice: Int,
    val paymentMethod: String? = null,
    val specialRequests: String? = null,
    val userEmail: String? = null,
    val userName: String? = null,
    val userPhone: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

@Serializable
data class CreateBookingRequest(
    val idempotencyKey: String? = null,
    val gameId: Int,
    val gameTimeSlotId: Int,
    val bookingDate: String,
    val playerCount: Int,
    val paymentMethod: String? = null,
    val specialRequests: String? = null,
    val userEmail: String,
    val userName: String,
    val userPhone: String? = null
)

@Serializable
data class CancelBookingRequest(
    val reason: String? = null
)

enum class BookingStatus(val value: String, val displayName: String) {
    PENDING("pending", "대기중"),
    SLOT_RESERVED("slot_reserved", "대기중"),
    CONFIRMED("confirmed", "예약확정"),
    CANCELLED("cancelled", "취소됨"),
    COMPLETED("completed", "완료"),
    NO_SHOW("no_show", "노쇼"),
    FAILED("failed", "실패");

    val canCancel: Boolean
        get() = this in listOf(CONFIRMED, PENDING, SLOT_RESERVED)

    companion object {
        fun fromValue(value: String): BookingStatus =
            entries.find { it.value == value } ?: PENDING
    }
}
