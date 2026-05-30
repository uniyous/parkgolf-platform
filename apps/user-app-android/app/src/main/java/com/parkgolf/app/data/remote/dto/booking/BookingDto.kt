package com.parkgolf.app.data.remote.dto.booking

import kotlinx.serialization.Serializable

@Serializable
data class BookingDto(
    val id: Int? = null,
    val bookingNumber: String? = null,
    val userId: Int? = null,
    val gameId: Int? = null,
    val gameTimeSlotId: Int? = null,
    val gameName: String? = null,
    val clubName: String? = null,
    val courseName: String? = null,
    val bookingDate: String? = null,
    val startTime: String? = null,
    val endTime: String? = null,
    val playerCount: Int? = null,
    val status: String? = null,
    val totalPrice: Int? = null,
    val pricePerPerson: Int? = null,
    val serviceFee: Int? = null,
    val paymentMethod: String? = null,
    val specialRequests: String? = null,
    val userEmail: String? = null,
    val userName: String? = null,
    val userPhone: String? = null,
    // AGENT_PAY.md §11.3 — 마이페이지 노출용 파생 필드 (BFF가 currentUser 기준 계산)
    val myRole: String? = null,                 // "BOOKER" | "MEMBER"
    val myParticipantStatus: String? = null,    // "PENDING" | "PAID" | "CANCELLED" | "REFUNDED"
    val createdAt: String? = null,
    val updatedAt: String? = null
)

// AGENT_PAY.md §11.4 — 더치페이 본인 자리 취소 응답
@Serializable
data class CancelParticipantResponse(
    val bookingId: Int,
    val userId: Int,
    val previousStatus: String,
    val newStatus: String,
    val refundedAmount: Int,
    val bookingCancelled: Boolean,
    val remainingParticipants: Int
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

