import SwiftUI

struct BookingCompleteCardView: View {
    let data: Any

    private var dict: [String: Any] {
        data as? [String: Any] ?? [:]
    }

    private var confirmationNumber: String {
        dict["confirmationNumber"] as? String ?? ""
    }

    private var details: [String: Any] {
        dict["details"] as? [String: Any] ?? [:]
    }

    private var date: String {
        details["date"] as? String ?? ""
    }

    private var time: String {
        details["time"] as? String ?? ""
    }

    private var playerCount: Int {
        details["playerCount"] as? Int ?? 0
    }

    private var totalPrice: Int {
        details["totalPrice"] as? Int ?? 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(Color.parkPrimary)
                Text("예약 완료")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(Color.parkPrimary)
            }

            VStack(alignment: .leading, spacing: 8) {
                infoRow(icon: "number", label: "예약번호", value: confirmationNumber)
                infoRow(icon: "calendar", label: nil, value: "\(date) \(time)")
                infoRow(icon: "person.2.fill", label: nil, value: "\(playerCount)명")
                infoRow(icon: "wonsign", label: nil, value: "₩\(totalPrice.formatted())")
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

    private func infoRow(icon: String, label: String?, value: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.4))
                .frame(width: 16)

            if let label = label {
                Text(label)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.4))
            }

            Text(value)
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))
        }
    }
}
