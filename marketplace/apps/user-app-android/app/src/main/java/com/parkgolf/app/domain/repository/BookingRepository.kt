package com.parkgolf.app.domain.repository

import com.parkgolf.app.domain.model.Booking
import com.parkgolf.app.domain.model.CreateBookingParams
import com.parkgolf.app.util.PaginatedData

interface BookingRepository {
    suspend fun createBooking(params: CreateBookingParams): Result<Booking>

    suspend fun getMyBookings(
        status: String? = null,
        timeFilter: String? = null,
        page: Int = 1,
        limit: Int = 20
    ): Result<PaginatedData<Booking>>

    suspend fun getBooking(id: String): Result<Booking>

    suspend fun getBookingByNumber(bookingNumber: String): Result<Booking>

    suspend fun cancelBooking(id: String, reason: String?): Result<Unit>

    // AGENT_PAY.md §11.4 — 더치페이 본인 자리만 취소
    suspend fun cancelParticipant(id: String, reason: String?): Result<CancelParticipantResult>
}

// AGENT_PAY.md §11.4 — 본인 자리 취소 결과
data class CancelParticipantResult(
    val previousStatus: String,
    val newStatus: String,
    val refundedAmount: Int,
    val bookingCancelled: Boolean,
    val remainingParticipants: Int
)
