package com.parkgolf.app.data.repository

import com.parkgolf.app.data.remote.api.PaymentApi
import com.parkgolf.app.data.remote.dto.payment.ConfirmPaymentRequest
import com.parkgolf.app.data.remote.dto.payment.ConfirmPaymentResponse
import com.parkgolf.app.data.remote.dto.payment.ConfirmSplitPaymentResponse
import com.parkgolf.app.data.remote.dto.payment.PaymentStatusResponse
import com.parkgolf.app.data.remote.dto.payment.PreparePaymentRequest
import com.parkgolf.app.data.remote.dto.payment.PreparePaymentResponse
import com.parkgolf.app.domain.repository.PaymentRepository
import com.parkgolf.app.util.safeApiCall
import com.parkgolf.app.util.toResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PaymentRepositoryImpl @Inject constructor(
    private val paymentApi: PaymentApi
) : PaymentRepository {

    override suspend fun preparePayment(
        amount: Int,
        orderName: String,
        bookingId: Int?
    ): Result<PreparePaymentResponse> = safeApiCall {
        val request = PreparePaymentRequest(
            amount = amount,
            orderName = orderName,
            bookingId = bookingId
        )
        paymentApi.preparePayment(request).toResult("결제 준비에 실패했습니다")
    }

    override suspend fun confirmPayment(
        paymentKey: String,
        orderId: String,
        amount: Int
    ): Result<ConfirmPaymentResponse> = safeApiCall {
        val request = ConfirmPaymentRequest(
            paymentKey = paymentKey,
            orderId = orderId,
            amount = amount
        )
        paymentApi.confirmPayment(request).toResult("결제 승인에 실패했습니다")
    }

    override suspend fun confirmSplitPayment(
        paymentKey: String,
        orderId: String,
        amount: Int
    ): Result<ConfirmSplitPaymentResponse> = safeApiCall {
        val request = ConfirmPaymentRequest(
            paymentKey = paymentKey,
            orderId = orderId,
            amount = amount
        )
        paymentApi.confirmSplitPayment(request).toResult("분할결제 승인에 실패했습니다")
    }

    override suspend fun getPaymentByOrderId(orderId: String): Result<PaymentStatusResponse> = safeApiCall {
        paymentApi.getPaymentByOrderId(orderId).toResult("결제 상태 조회에 실패했습니다")
    }
}
