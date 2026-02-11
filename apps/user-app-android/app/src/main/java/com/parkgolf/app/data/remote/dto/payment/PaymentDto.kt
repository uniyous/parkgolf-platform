package com.parkgolf.app.data.remote.dto.payment

import kotlinx.serialization.Serializable

@Serializable
data class PreparePaymentRequest(
    val amount: Int,
    val orderName: String,
    val bookingId: Int? = null
)

@Serializable
data class PreparePaymentResponse(
    val orderId: String,
    val amount: Int,
    val orderName: String
)

@Serializable
data class ConfirmPaymentRequest(
    val paymentKey: String,
    val orderId: String,
    val amount: Int
)

@Serializable
data class ConfirmPaymentResponse(
    val paymentId: Int,
    val orderId: String,
    val paymentKey: String,
    val amount: Int,
    val status: String
)

@Serializable
data class PaymentStatusResponse(
    val id: Int,
    val orderId: String,
    val paymentKey: String? = null,
    val amount: Int,
    val status: String,
    val bookingId: Int? = null
)
