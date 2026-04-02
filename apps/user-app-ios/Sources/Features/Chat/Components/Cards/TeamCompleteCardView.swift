import SwiftUI

struct TeamCompleteCardView: View {
    let data: Any

    private var dict: [String: Any] {
        data as? [String: Any] ?? [:]
    }

    private var teamNumber: Int { dict["teamNumber"] as? Int ?? 1 }
    private var bookingNumber: String { dict["bookingNumber"] as? String ?? "" }
    private var clubName: String { dict["clubName"] as? String ?? "" }
    private var date: String { dict["date"] as? String ?? "" }
    private var slotTime: String { dict["slotTime"] as? String ?? "" }
    private var gameName: String { dict["gameName"] as? String ?? "" }
    private var totalPrice: Int { dict["totalPrice"] as? Int ?? 0 }
    private var paymentMethod: String { dict["paymentMethod"] as? String ?? "onsite" }

    private var participants: [[String: Any]] {
        dict["participants"] as? [[String: Any]] ?? []
    }

    private var paymentLabel: String {
        switch paymentMethod {
        case "dutchpay": return "더치페이"
        case "card": return "카드결제"
        default: return "현장결제"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(Color.parkPrimary)
                Text("팀\(teamNumber) 예약 완료")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(Color.parkPrimary)
            }

            // Info
            VStack(alignment: .leading, spacing: 8) {
                infoRow(icon: "mappin.circle.fill", value: clubName)
                infoRow(icon: "clock.fill", value: "\(date) \(slotTime) · \(gameName)")

                let names = participants.compactMap { $0["userName"] as? String }.joined(separator: ", ")
                if !names.isEmpty {
                    infoRow(icon: "person.2.fill", value: names)
                }
            }

            // Price
            HStack {
                Text(paymentLabel)
                    .font(.body)
                    .foregroundColor(.white.opacity(0.5))
                Spacer()
                Text("₩\(totalPrice.formatted())")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(Color.parkPrimary)
            }
            .padding(.top, 4)

            // Booking number
            if !bookingNumber.isEmpty {
                Text(bookingNumber)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.3))
                    .frame(maxWidth: .infinity, alignment: .center)
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
