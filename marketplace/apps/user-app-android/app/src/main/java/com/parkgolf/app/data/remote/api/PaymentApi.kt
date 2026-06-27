package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.payment.AbandonPaymentRequest
import com.parkgolf.app.data.remote.dto.payment.ConfirmPaymentRequest
import com.parkgolf.app.data.remote.dto.payment.ConfirmPaymentResponse
import com.parkgolf.app.data.remote.dto.payment.ConfirmSplitPaymentResponse
import com.parkgolf.app.data.remote.dto.payment.PaymentStatusResponse
import com.parkgolf.app.data.remote.dto.payment.PreparePaymentRequest
import com.parkgolf.app.data.remote.dto.payment.PreparePaymentResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface PaymentApi {

    @POST("api/user/payments/prepare")
    suspend fun preparePayment(@Body request: PreparePaymentRequest): ApiResponse<PreparePaymentResponse>

    @POST("api/user/payments/confirm")
    suspend fun confirmPayment(@Body request: ConfirmPaymentRequest): ApiResponse<ConfirmPaymentResponse>

    @POST("api/user/payments/split/confirm")
    suspend fun confirmSplitPayment(@Body request: ConfirmPaymentRequest): ApiResponse<ConfirmSplitPaymentResponse>

    @GET("api/user/payments/order/{orderId}")
    suspend fun getPaymentByOrderId(@Path("orderId") orderId: String): ApiResponse<PaymentStatusResponse>

    /**
     * 결제 중단 통지 (Toss 결제 실패/취소)
     * payment.status=ABORTED + outbox booking.paymentFailed → PAYMENT_FAILED Saga
     */
    @POST("api/user/payments/{orderId}/abandon")
    suspend fun abandonPayment(
        @Path("orderId") orderId: String,
        @Body request: AbandonPaymentRequest,
    ): ApiResponse<PaymentStatusResponse>
}
