package com.parkgolf.app.presentation.feature.payment

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import com.parkgolf.app.BuildConfig
import com.tosspayments.paymentsdk.TossPayments
import com.tosspayments.paymentsdk.model.TossPaymentResult
import com.tosspayments.paymentsdk.model.paymentinfo.TossCardPaymentInfo

/**
 * TossPayments API 방식 (결제창) 결제 Activity
 *
 * Widget 방식과 달리 위젯 전용 키가 필요 없으며,
 * 일반 API 클라이언트 키로 결제창을 바로 열 수 있습니다.
 */
class PaymentActivity : ComponentActivity() {

    private val orderId: String by lazy { intent.getStringExtra(EXTRA_ORDER_ID) ?: "" }
    private val orderName: String by lazy { intent.getStringExtra(EXTRA_ORDER_NAME) ?: "" }
    private val amount: Int by lazy { intent.getIntExtra(EXTRA_AMOUNT, 0) }

    private val tossPayments = TossPayments(BuildConfig.TOSS_CLIENT_KEY)

    // SDK 결제 결과 수신 launcher
    private val paymentResultLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        when (result.resultCode) {
            TossPayments.RESULT_PAYMENT_SUCCESS -> {
                val success = result.data?.getParcelableExtra<TossPaymentResult.Success>(
                    TossPayments.EXTRA_PAYMENT_RESULT_SUCCESS
                )
                if (success != null) {
                    handlePaymentSuccess(success)
                } else {
                    setResult(RESULT_CANCELED)
                    finish()
                }
            }
            TossPayments.RESULT_PAYMENT_FAILED -> {
                val fail = result.data?.getParcelableExtra<TossPaymentResult.Fail>(
                    TossPayments.EXTRA_PAYMENT_RESULT_FAILED
                )
                if (fail != null) {
                    handlePaymentFailed(fail)
                } else {
                    setResult(RESULT_CANCELED)
                    finish()
                }
            }
            else -> {
                setResult(RESULT_CANCELED)
                finish()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 바로 결제창 실행 (Widget UI 없이)
        val paymentInfo = TossCardPaymentInfo(
            orderId = orderId,
            orderName = orderName,
            amount = amount.toLong()
        )

        tossPayments.requestCardPayment(this, paymentInfo, paymentResultLauncher)
    }

    private fun handlePaymentSuccess(success: TossPaymentResult.Success) {
        val resultIntent = Intent().apply {
            putExtra(EXTRA_PAYMENT_KEY, success.paymentKey)
            putExtra(EXTRA_ORDER_ID, success.orderId)
            putExtra(EXTRA_AMOUNT, success.amount.toInt())
        }
        setResult(RESULT_OK, resultIntent)
        finish()
    }

    private fun handlePaymentFailed(fail: TossPaymentResult.Fail) {
        if (fail.errorCode == "PAY_PROCESS_CANCELED" || fail.errorCode == "USER_CANCEL") {
            setResult(RESULT_CANCELED)
        } else {
            val resultIntent = Intent().apply {
                putExtra(EXTRA_ERROR_CODE, fail.errorCode)
                putExtra(EXTRA_ERROR_MESSAGE, fail.errorMessage)
            }
            setResult(RESULT_PAYMENT_FAILED, resultIntent)
        }
        finish()
    }

    companion object {
        const val EXTRA_ORDER_ID = "extra_order_id"
        const val EXTRA_ORDER_NAME = "extra_order_name"
        const val EXTRA_AMOUNT = "extra_amount"
        const val EXTRA_PAYMENT_KEY = "extra_payment_key"
        const val EXTRA_ERROR_CODE = "extra_error_code"
        const val EXTRA_ERROR_MESSAGE = "extra_error_message"
        const val RESULT_PAYMENT_FAILED = 2

        fun createIntent(
            context: Context,
            orderId: String,
            orderName: String,
            amount: Int
        ): Intent {
            return Intent(context, PaymentActivity::class.java).apply {
                putExtra(EXTRA_ORDER_ID, orderId)
                putExtra(EXTRA_ORDER_NAME, orderName)
                putExtra(EXTRA_AMOUNT, amount)
            }
        }
    }
}
