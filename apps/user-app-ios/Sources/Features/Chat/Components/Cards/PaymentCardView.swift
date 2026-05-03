import SwiftUI
import Combine

struct PaymentCardView: View {
    let data: Any
    var onPaymentComplete: ((Bool) -> Void)?
    var onRequestPayment: ((String, String, Int) -> Void)?

    // 백엔드 saga-scheduler가 10분 후 PAYMENT_TIMEOUT 트리거하므로 10초 버퍼 (이중 결제 방지)
    private static let PAYMENT_TIMEOUT_SECONDS = 9 * 60 + 50  // 9분 50초

    @State private var remainingSeconds: Int = PaymentCardView.PAYMENT_TIMEOUT_SECONDS
    @State private var isExpired = false
    @State private var startDate = Date()

    private var dict: [String: Any] {
        data as? [String: Any] ?? [:]
    }

    private var clubName: String { dict["clubName"] as? String ?? "" }
    private var date: String { dict["date"] as? String ?? "" }
    private var time: String { dict["time"] as? String ?? "" }
    private var playerCount: Int { dict["playerCount"] as? Int ?? 0 }
    private var amount: Int { dict["amount"] as? Int ?? 0 }
    private var orderId: String { dict["orderId"] as? String ?? "" }

    private var timerColor: Color {
        if remainingSeconds <= 0 { return .red }
        if remainingSeconds <= 60 { return .yellow }
        return .white.opacity(0.6)
    }

    private var timerText: String {
        let minutes = remainingSeconds / 60
        let seconds = remainingSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: "creditcard.fill")
                    .foregroundColor(Color.parkPrimary)
                Text("카드결제")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
            }

            // Info rows
            VStack(alignment: .leading, spacing: 8) {
                infoRow(icon: "mappin.circle.fill", value: clubName)
                infoRow(icon: "calendar", value: "\(date) \(time)")
                infoRow(icon: "person.2.fill", value: "\(playerCount)명")

                HStack(spacing: 8) {
                    Image(systemName: "wonsign")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.4))
                        .frame(width: 16)
                    Text("₩\(amount.formatted())")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(Color.parkPrimary)
                }
            }

            // Timer
            HStack(spacing: 6) {
                Image(systemName: "timer")
                    .font(.system(size: 12))
                Text(isExpired ? "결제 시간 만료" : "남은 시간 \(timerText)")
                    .font(.body)
                    .fontWeight(.medium)
            }
            .foregroundColor(timerColor)
            .frame(maxWidth: .infinity, alignment: .center)

            // Buttons
            if isExpired {
                Text("결제 시간이 만료되었습니다")
                    .font(.body)
                    .foregroundColor(.red.opacity(0.8))
                    .frame(maxWidth: .infinity, alignment: .center)
            } else {
                HStack(spacing: 10) {
                    Button {
                        onPaymentComplete?(false)
                    } label: {
                        Text("예약 취소")
                            .font(.body)
                            .fontWeight(.medium)
                            .foregroundColor(.white.opacity(0.7))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Color.white.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    Button {
                        onRequestPayment?(orderId, "\(clubName) 예약", amount)
                    } label: {
                        Text("결제하기")
                            .font(.body)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Color.parkPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.parkPrimary.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.parkPrimary.opacity(0.2), lineWidth: 1)
        )
        .onAppear {
            startDate = Date()
        }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
            let elapsed = Int(Date().timeIntervalSince(startDate))
            let remaining = max(0, PaymentCardView.PAYMENT_TIMEOUT_SECONDS - elapsed)
            remainingSeconds = remaining
            if remaining <= 0 {
                isExpired = true
            }
        }
    }

    private func infoRow(icon: String, value: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.4))
                .frame(width: 16)
            Text(value)
                .font(.body)
                .foregroundColor(.white.opacity(0.7))
        }
    }
}
