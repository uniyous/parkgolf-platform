package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.booking.BookingDto
import com.parkgolf.app.data.remote.dto.booking.CancelBookingRequest
import com.parkgolf.app.data.remote.dto.booking.CreateBookingRequest
import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.common.PaginatedResponse
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface BookingApi {

    @POST("api/user/bookings")
    suspend fun createBooking(@Body request: CreateBookingRequest): ApiResponse<BookingDto>

    @GET("api/user/bookings")
    suspend fun getMyBookings(): ApiResponse<List<BookingDto>>

    @GET("api/user/bookings/{id}")
    suspend fun getBooking(@Path("id") id: String): ApiResponse<BookingDto>

    @GET("api/user/bookings/number/{bookingNumber}")
    suspend fun getBookingByNumber(@Path("bookingNumber") bookingNumber: String): ApiResponse<BookingDto>

    @DELETE("api/user/bookings/{id}")
    suspend fun cancelBooking(
        @Path("id") id: String,
        @Body request: CancelBookingRequest? = null
    ): ApiResponse<Unit>
}
