package com.parkgolf.app.domain.model

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

data class Booking(
    val id: String,
    val bookingNumber: String? = null,
    val gameId: Int,
    val gameTimeSlotId: Int,
    val gameName: String? = null,
    val clubName: String,
    val courseName: String? = null,
    val bookingDate: LocalDate,
    val startTime: String,
    val endTime: String,
    val playerCount: Int,
    val status: BookingStatus,
    val totalPrice: Int,
    val paymentMethod: String? = null,
    val specialRequests: String? = null,
    val userEmail: String? = null,
    val userName: String? = null,
    val userPhone: String? = null
) {
    val priceText: String
        get() = "${String.format("%,d", totalPrice)}원"

    val dateText: String
        get() {
            val formatter = DateTimeFormatter.ofPattern("yyyy년 M월 d일 (E)", Locale.KOREAN)
            return bookingDate.format(formatter)
        }

    val timeText: String
        get() = "$startTime - $endTime"

    val playerCountText: String
        get() = "${playerCount}명"

    val canCancel: Boolean
        get() = status.canCancel
}

enum class BookingStatus(
    val value: String,
    val displayName: String,
    val canCancel: Boolean
) {
    PENDING("pending", "대기중", true),
    SLOT_RESERVED("slot_reserved", "대기중", true),
    CONFIRMED("confirmed", "예약확정", true),
    CANCELLED("cancelled", "취소됨", false),
    COMPLETED("completed", "완료", false),
    NO_SHOW("no_show", "노쇼", false),
    FAILED("failed", "실패", false);

    companion object {
        fun fromValue(value: String): BookingStatus =
            entries.find { it.value == value } ?: PENDING
    }
}

data class CreateBookingParams(
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
