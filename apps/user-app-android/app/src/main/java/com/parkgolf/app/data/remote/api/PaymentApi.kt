package com.parkgolf.app.data.remote.api

import com.parkgolf.app.data.remote.dto.common.ApiResponse
import com.parkgolf.app.data.remote.dto.payment.ConfirmPaymentRequest
import com.parkgolf.app.data.remote.dto.payment.ConfirmPaymentResponse
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
    suspend fun confirmSplitPayment(@Body request: ConfirmPaymentRequest): ApiResponse<ConfirmPaymentResponse>

    @GET("api/user/payments/order/{orderId}")
    suspend fun getPaymentByOrderId(@Path("orderId") orderId: String): ApiResponse<PaymentStatusResponse>
}
