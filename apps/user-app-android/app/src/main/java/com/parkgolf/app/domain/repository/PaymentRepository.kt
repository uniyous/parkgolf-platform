package com.parkgolf.app.domain.repository

import com.parkgolf.app.data.remote.dto.payment.ConfirmPaymentResponse
import com.parkgolf.app.data.remote.dto.payment.ConfirmSplitPaymentResponse
import com.parkgolf.app.data.remote.dto.payment.PaymentStatusResponse
import com.parkgolf.app.data.remote.dto.payment.PreparePaymentResponse

interface PaymentRepository {
    suspend fun preparePayment(amount: Int, orderName: String, bookingId: Int?): Result<PreparePaymentResponse>
    suspend fun confirmPayment(paymentKey: String, orderId: String, amount: Int): Result<ConfirmPaymentResponse>
    suspend fun confirmSplitPayment(paymentKey: String, orderId: String, amount: Int): Result<ConfirmSplitPaymentResponse>
    suspend fun getPaymentByOrderId(orderId: String): Result<PaymentStatusResponse>
}
