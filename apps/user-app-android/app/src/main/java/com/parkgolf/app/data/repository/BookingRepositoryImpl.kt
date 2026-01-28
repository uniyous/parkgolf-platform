package com.parkgolf.app.data.repository

import com.parkgolf.app.data.mapper.toDomain
import com.parkgolf.app.data.remote.api.BookingApi
import com.parkgolf.app.data.remote.dto.booking.CancelBookingRequest
import com.parkgolf.app.data.remote.dto.booking.CreateBookingRequest
import com.parkgolf.app.domain.model.Booking
import com.parkgolf.app.domain.model.BookingStatus
import com.parkgolf.app.domain.model.CreateBookingParams
import com.parkgolf.app.domain.repository.BookingRepository
import com.parkgolf.app.util.PaginatedData
import com.parkgolf.app.util.safeApiCall
import com.parkgolf.app.util.toResult
import com.parkgolf.app.util.toUnitResult
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BookingRepositoryImpl @Inject constructor(
    private val bookingApi: BookingApi
) : BookingRepository {

    override suspend fun createBooking(params: CreateBookingParams): Result<Booking> = safeApiCall {
        val request = CreateBookingRequest(
            idempotencyKey = UUID.randomUUID().toString(),
            gameId = params.gameId,
            gameTimeSlotId = params.gameTimeSlotId,
            bookingDate = params.bookingDate,
            playerCount = params.playerCount,
            paymentMethod = params.paymentMethod,
            specialRequests = params.specialRequests,
            userEmail = params.userEmail,
            userName = params.userName,
            userPhone = params.userPhone
        )
        bookingApi.createBooking(request).toResult("예약 생성에 실패했습니다") { it.toDomain() }
    }

    override suspend fun getMyBookings(
        status: String?,
        timeFilter: String?,
        page: Int,
        limit: Int
    ): Result<PaginatedData<Booking>> = safeApiCall {
        val response = bookingApi.getMyBookings()
        if (response.success && response.data != null) {
            // 백엔드에서 전체 목록 반환 -> 클라이언트에서 필터링 (iOS와 동일)
            val allBookings = response.data.map { it.toDomain() }

            // timeFilter에 따라 필터링
            val filteredBookings = when (timeFilter) {
                "UPCOMING" -> allBookings.filter { booking ->
                    val today = LocalDate.now()
                    booking.bookingDate >= today &&
                        booking.status in listOf(
                            BookingStatus.PENDING,
                            BookingStatus.SLOT_RESERVED,
                            BookingStatus.CONFIRMED
                        )
                }
                "PAST" -> allBookings.filter { booking ->
                    val today = LocalDate.now()
                    booking.bookingDate < today ||
                        booking.status in listOf(
                            BookingStatus.COMPLETED,
                            BookingStatus.CANCELLED,
                            BookingStatus.NO_SHOW
                        )
                }
                else -> allBookings
            }

            // status에 따라 추가 필터링
            val statusFilteredBookings = if (status != null) {
                filteredBookings.filter { it.status.name.equals(status, ignoreCase = true) }
            } else {
                filteredBookings
            }

            // 날짜순 정렬 (예정된 예약: 오름차순, 지난 예약: 내림차순)
            val sortedBookings = when (timeFilter) {
                "UPCOMING" -> statusFilteredBookings.sortedBy { it.bookingDate }
                "PAST" -> statusFilteredBookings.sortedByDescending { it.bookingDate }
                else -> statusFilteredBookings.sortedByDescending { it.bookingDate }
            }

            Result.success(
                PaginatedData(
                    data = sortedBookings,
                    total = sortedBookings.size,
                    page = 1,
                    limit = sortedBookings.size,
                    totalPages = 1
                )
            )
        } else {
            Result.failure(Exception("예약 목록 조회에 실패했습니다"))
        }
    }

    override suspend fun getBooking(id: String): Result<Booking> = safeApiCall {
        bookingApi.getBooking(id).toResult("예약 조회에 실패했습니다") { it.toDomain() }
    }

    override suspend fun getBookingByNumber(bookingNumber: String): Result<Booking> = safeApiCall {
        bookingApi.getBookingByNumber(bookingNumber).toResult("예약 조회에 실패했습니다") { it.toDomain() }
    }

    override suspend fun cancelBooking(id: String, reason: String?): Result<Unit> = safeApiCall {
        val request = reason?.let { CancelBookingRequest(it) }
        bookingApi.cancelBooking(id, request).toUnitResult("예약 취소에 실패했습니다")
    }
}
