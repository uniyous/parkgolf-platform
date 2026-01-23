package com.parkgolf.app.data.repository

import com.parkgolf.app.data.remote.api.BookingApi
import com.parkgolf.app.data.remote.dto.booking.BookingDto
import com.parkgolf.app.data.remote.dto.booking.CancelBookingRequest
import com.parkgolf.app.data.remote.dto.booking.CreateBookingRequest
import com.parkgolf.app.domain.model.Booking
import com.parkgolf.app.domain.model.BookingStatus
import com.parkgolf.app.domain.model.CreateBookingParams
import com.parkgolf.app.domain.repository.BookingRepository
import com.parkgolf.app.util.PaginatedData
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BookingRepositoryImpl @Inject constructor(
    private val bookingApi: BookingApi
) : BookingRepository {

    override suspend fun createBooking(params: CreateBookingParams): Result<Booking> {
        return try {
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
            val response = bookingApi.createBooking(request)
            if (response.success && response.data != null) {
                Result.success(response.data.toDomain())
            } else {
                Result.failure(Exception("Failed to create booking"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getMyBookings(
        status: String?,
        timeFilter: String?,
        page: Int,
        limit: Int
    ): Result<PaginatedData<Booking>> {
        return try {
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
                Result.failure(Exception("Failed to get bookings"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getBooking(id: String): Result<Booking> {
        return try {
            val response = bookingApi.getBooking(id)
            if (response.success && response.data != null) {
                Result.success(response.data.toDomain())
            } else {
                Result.failure(Exception("Failed to get booking"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getBookingByNumber(bookingNumber: String): Result<Booking> {
        return try {
            val response = bookingApi.getBookingByNumber(bookingNumber)
            if (response.success && response.data != null) {
                Result.success(response.data.toDomain())
            } else {
                Result.failure(Exception("Failed to get booking"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun cancelBooking(id: String, reason: String?): Result<Unit> {
        return try {
            val request = reason?.let { CancelBookingRequest(it) }
            val response = bookingApi.cancelBooking(id, request)
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to cancel booking"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

private fun BookingDto.toDomain(): Booking {
    return Booking(
        id = id,
        bookingNumber = bookingNumber,
        gameId = gameId,
        gameTimeSlotId = gameTimeSlotId,
        gameName = gameName,
        clubName = clubName,
        courseName = courseName,
        bookingDate = LocalDate.parse(bookingDate.substring(0, 10), DateTimeFormatter.ISO_DATE),
        startTime = startTime,
        endTime = endTime,
        playerCount = playerCount,
        status = BookingStatus.fromValue(status),
        totalPrice = totalPrice,
        paymentMethod = paymentMethod,
        specialRequests = specialRequests,
        userEmail = userEmail,
        userName = userName,
        userPhone = userPhone
    )
}
