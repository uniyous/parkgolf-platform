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

    /** 결제 실패/취소 통지 → PAYMENT_FAILED Saga 트리거 */
    suspend fun abandonPayment(
        orderId: String,
        reason: String,
        errorCode: String?,
        errorMessage: String?,
    ): Result<PaymentStatusResponse>
}
