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

