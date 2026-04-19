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

