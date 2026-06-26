import SwiftUI
import TossPayments

// MARK: - Payment Outcome

enum TossPaymentOutcome {
    case success(paymentKey: String, orderId: String, amount: Int)
    case failure(errorCode: String, errorMessage: String)
    case cancelled
}

// MARK: - TossPaymentView (API/Redirect 방식 - 웹과 동일)

struct TossPaymentView: View {
    let clientKey: String
    let orderId: String
    let orderName: String
    let amount: Int
    let onResult: (TossPaymentOutcome) -> Void

    @Binding var isPresented: Bool

    var body: some View {
        TossPaymentsView(
            clientKey: clientKey,
            paymentMethod: .카드,
            paymentInfo: DefaultPaymentInfo(
                amount: Double(amount),
                orderId: orderId,
                orderName: orderName
            ),
            isPresented: $isPresented
        )
        .onSuccess { paymentKey, orderId, amount in
            onResult(.success(paymentKey: paymentKey, orderId: orderId, amount: Int(amount)))
        }
        .onFail { errorCode, errorMessage, _ in
            if errorCode == "PAY_PROCESS_CANCELED" || errorCode == "USER_CANCEL" {
                onResult(.cancelled)
            } else {
                onResult(.failure(errorCode: errorCode, errorMessage: errorMessage))
            }
        }
    }
}
