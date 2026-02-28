import SwiftUI

struct ConfirmBookingCardView: View {
    let data: Any
    var onConfirm: ((String) -> Void)?
    var onCancel: (() -> Void)?

    @State private var selectedPaymentMethod: String = "onsite"

    private var dict: [String: Any] {
        data as? [String: Any] ?? [:]
    }

    private var clubName: String { dict["clubName"] as? String ?? "" }
    private var date: String { dict["date"] as? String ?? "" }
    private var time: String { dict["time"] as? String ?? "" }
    private var playerCount: Int { dict["playerCount"] as? Int ?? 0 }
    private var price: Int { dict["price"] as? Int ?? 0 }
    private var groupMode: Bool { dict["groupMode"] as? Bool ?? false }
    private var teamNumber: Int? { dict["teamNumber"] as? Int }
    private var members: [[String: Any]]? { dict["members"] as? [[String: Any]] }
    private var pricePerPerson: Int? { dict["pricePerPerson"] as? Int }

    private var headerTitle: String {
        if let teamNumber = teamNumber {
            return "팀\(teamNumber) 예약 정보 확인"
        }
        return "예약 정보 확인"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: "clipboard.fill")
                    .foregroundColor(Color.parkPrimary)
                Text(headerTitle)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
            }

            // Info rows
            VStack(alignment: .leading, spacing: 8) {
                infoRow(icon: "mappin.circle.fill", value: clubName)
                infoRow(icon: "calendar", value: date)
                infoRow(icon: "clock.fill", value: time)

                if let members = members, !members.isEmpty {
                    let names = members.compactMap { $0["userName"] as? String }.joined(separator: ", ")
                    infoRow(icon: "person.2.fill", value: "\(members.count)명 · \(names)")
                } else {
                    infoRow(icon: "person.2.fill", value: "\(playerCount)명")
                }

                HStack(spacing: 8) {
                    Image(systemName: "wonsign")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.4))
                        .frame(width: 16)
                    Text("₩\(price.formatted())")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(Color.parkPrimary)
                    if let perPerson = pricePerPerson {
                        Text("(1인당 ₩\(perPerson.formatted()))")
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
            }

            // Payment method selection
            VStack(alignment: .leading, spacing: 8) {
                Text("결제 방법")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.white.opacity(0.6))

                if groupMode {
                    paymentOption(label: "더치페이", value: "dutchpay", icon: "person.2.circle.fill")
                }
                paymentOption(label: "현장결제", value: "onsite", icon: "banknote.fill")
                paymentOption(label: "카드결제", value: "card", icon: "creditcard.fill")
            }

            // Buttons
            HStack(spacing: 10) {
                Button {
                    onCancel?()
                } label: {
                    Text("취소")
                        .font(.caption)
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
                        .font(.caption)
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
        .onAppear {
            selectedPaymentMethod = groupMode ? "dutchpay" : "onsite"
        }
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
                    .font(.caption)
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
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))
        }
    }
}
