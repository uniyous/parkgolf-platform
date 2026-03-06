import SwiftUI

struct ConfirmGroupCardView: View {
    let data: Any
    var onConfirm: ((String) -> Void)?
    var onCancel: (() -> Void)?

    @State private var selectedPaymentMethod: String = "onsite"

    private var dict: [String: Any] {
        data as? [String: Any] ?? [:]
    }

    private var clubName: String { dict["clubName"] as? String ?? "" }
    private var date: String { dict["date"] as? String ?? "" }
    private var teamCount: Int { dict["teamCount"] as? Int ?? 0 }
    private var maxParticipants: Int { dict["maxParticipants"] as? Int ?? 0 }
    private var totalPrice: Int { dict["totalPrice"] as? Int ?? 0 }
    private var slots: [[String: Any]] {
        dict["slots"] as? [[String: Any]] ?? []
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: "person.3.fill")
                    .foregroundColor(Color.parkPrimary)
                Text("그룹 예약 (\(teamCount)팀)")
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
            }

            // Club + Date
            VStack(alignment: .leading, spacing: 6) {
                infoRow(icon: "mappin.circle.fill", value: clubName)
                infoRow(icon: "calendar", value: date)
            }

            // Slot list
            VStack(spacing: 6) {
                ForEach(Array(slots.enumerated()), id: \.offset) { index, slot in
                    let slotTime = slot["slotTime"] as? String ?? ""
                    let gameName = slot["gameName"] as? String ?? ""
                    let price = slot["price"] as? Int ?? 0

                    HStack {
                        Text("팀\(index + 1)")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(Color.parkPrimary)
                            .frame(width: 30, alignment: .leading)
                        Text(slotTime)
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.7))
                        Text("·")
                            .foregroundColor(.white.opacity(0.3))
                        Text(gameName)
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.6))
                        Spacer()
                        Text("₩\(price.formatted())")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.7))
                    }
                    .padding(.vertical, 6)
                    .padding(.horizontal, 10)
                    .background(Color.white.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }

            // Summary
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("최대 \(maxParticipants)명")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.5))
                }
                Spacer()
                Text("예상 총액 ₩\(totalPrice.formatted())")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(Color.parkPrimary)
            }

            // Payment method
            VStack(alignment: .leading, spacing: 8) {
                Text("결제 방법")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.white.opacity(0.6))

                paymentOption(label: "현장결제", value: "onsite", icon: "banknote.fill")
                paymentOption(label: "더치페이", value: "dutchpay", icon: "person.2.circle.fill")
            }

            // Buttons
            HStack(spacing: 10) {
                Button {
                    onCancel?()
                } label: {
                    Text("취소")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.white.opacity(0.7))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                Button {
                    onConfirm?(selectedPaymentMethod)
                } label: {
                    Text("예약 확인")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.parkPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
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
    }

    private func paymentOption(label: String, value: String, icon: String) -> some View {
        Button {
            selectedPaymentMethod = value
        } label: {
            HStack(spacing: 8) {
                Image(systemName: selectedPaymentMethod == value ? "circle.inset.filled" : "circle")
                    .font(.system(size: 14))
                    .foregroundColor(selectedPaymentMethod == value ? Color.parkPrimary : .white.opacity(0.4))
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.6))
                Text(label)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
                Spacer()
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 10)
            .background(selectedPaymentMethod == value ? Color.parkPrimary.opacity(0.15) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    private func infoRow(icon: String, value: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.4))
                .frame(width: 16)
            Text(value)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.7))
        }
    }
}
