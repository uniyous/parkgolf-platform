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
}
