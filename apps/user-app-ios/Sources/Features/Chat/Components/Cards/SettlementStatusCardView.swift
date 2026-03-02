import SwiftUI
import Combine

struct SettlementStatusCardView: View {
    let data: Any
    var currentUserId: Int?
    var onSplitPaymentComplete: ((Bool, String) -> Void)?
    var onRequestSplitPayment: ((String, Int) -> Void)?
    var onSendReminder: (() -> Void)?
    var onRefresh: (() -> Void)?

    private var dict: [String: Any] {
        data as? [String: Any] ?? [:]
    }

    private var bookingNumber: String { dict["bookingNumber"] as? String ?? "" }
    private var clubName: String { dict["clubName"] as? String ?? "" }
    private var date: String { dict["date"] as? String ?? "" }
    private var slotTime: String { dict["slotTime"] as? String ?? "" }
    private var courseName: String { dict["courseName"] as? String ?? "" }
    private var totalAmount: Int { dict["totalAmount"] as? Int ?? 0 }
    private var expiredAt: String? { dict["expiredAt"] as? String }

    private var bookerId: Int? {
        if let id = dict["bookerId"] as? Int { return id }
        if let idStr = dict["bookerId"] as? String, let id = Int(idStr) { return id }
        return nil
    }

    private var participants: [[String: Any]] {
        dict["participants"] as? [[String: Any]] ?? []
    }

    private var isBooker: Bool {
        guard let uid = currentUserId, let bid = bookerId else { return true }
        return uid == bid
    }

    var body: some View {
        if isBooker {
            bookerDashboard
        } else if let myParticipant = findMyParticipant() {
            let status = myParticipant["status"] as? String ?? ""
            if status == "PAID" {
                participantPaidView(myParticipant)
            } else {
                participantPaymentView(myParticipant)
            }
        } else {
            bookerDashboard
        }
    }

    // MARK: - Booker Dashboard

    private var bookerDashboard: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: "chart.bar.fill")
                    .foregroundColor(Color.parkPrimary)
                Text("정산 현황")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
            }

            // Info
            VStack(alignment: .leading, spacing: 6) {
                infoRow(icon: "mappin.circle.fill", value: clubName)
                infoRow(icon: "calendar", value: "\(date) \(slotTime)")
                if !courseName.isEmpty {
                    infoRow(icon: "flag.fill", value: courseName)
                }
            }

            // Progress
            let paidCount = participants.filter { ($0["status"] as? String) == "PAID" }.count
            let totalCount = participants.count

            VStack(spacing: 6) {
                HStack {
                    Text("결제 현황")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                    Spacer()
                    Text("\(paidCount)/\(totalCount)")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(Color.parkPrimary)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 6)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.parkPrimary)
                            .frame(width: totalCount > 0 ? geo.size.width * CGFloat(paidCount) / CGFloat(totalCount) : 0, height: 6)
                    }
                }
                .frame(height: 6)
            }

            // Participant list
            ForEach(Array(participants.enumerated()), id: \.offset) { _, participant in
                let name = participant["userName"] as? String ?? ""
                let amount = participant["amount"] as? Int ?? 0
                let status = participant["status"] as? String ?? "PENDING"

                HStack {
                    Text(name)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                    Spacer()
                    Text("₩\(amount.formatted())")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                    Text(status == "PAID" ? "완료" : "대기")
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundColor(status == "PAID" ? .green : .yellow)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(status == "PAID" ? Color.green.opacity(0.15) : Color.yellow.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }

            // Countdown
            if let expiredAt = expiredAt {
                CountdownView(expiredAt: expiredAt)
            }

            // Actions
            let allPaid = paidCount == totalCount && totalCount > 0
            if !allPaid {
                HStack(spacing: 8) {
                    if onSendReminder != nil {
                        Button {
                            onSendReminder?()
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "bell.fill")
                                    .font(.system(size: 10))
                                Text("리마인더")
                                    .font(.caption2)
                            }
                            .foregroundColor(.white.opacity(0.6))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.white.opacity(0.05))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }

                    if onRefresh != nil {
                        Button {
                            onRefresh?()
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "arrow.clockwise")
                                    .font(.system(size: 10))
                                Text("새로고침")
                                    .font(.caption2)
                            }
                            .foregroundColor(Color.parkPrimary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.parkPrimary.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                }
            }

            // Booking number
            if !bookingNumber.isEmpty {
                Text(bookingNumber)
                    .font(.caption2)
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

    // MARK: - Participant Payment View

    private func participantPaymentView(_ participant: [String: Any]) -> some View {
        let amount = participant["amount"] as? Int ?? 0
        let orderId = participant["orderId"] as? String ?? ""

        return VStack(spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "creditcard.fill")
                    .foregroundColor(Color.parkPrimary)
                Text("결제 요청")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
            }

            // 골프장/날짜/시간 정보
            if !clubName.isEmpty || !date.isEmpty || !slotTime.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    if !clubName.isEmpty {
                        infoRow(icon: "mappin.circle.fill", value: clubName)
                    }
                    if !courseName.isEmpty {
                        infoRow(icon: "flag.fill", value: courseName)
                    }
                    let dateTime = [date, slotTime].filter { !$0.isEmpty }.joined(separator: " ")
                    if !dateTime.isEmpty {
                        infoRow(icon: "calendar", value: dateTime)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Text("₩\(amount.formatted())")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)

            Text("더치페이 결제 금액")
                .font(.caption)
                .foregroundColor(.white.opacity(0.5))

            Button {
                onRequestSplitPayment?(orderId, amount)
            } label: {
                Text("결제하기")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.parkPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .disabled(orderId.isEmpty)
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Color.parkPrimary.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.parkPrimary.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Participant Paid View

    private func participantPaidView(_ participant: [String: Any]) -> some View {
        let amount = participant["amount"] as? Int ?? 0

        return VStack(spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(Color.parkPrimary)
                Text("결제 완료")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(Color.parkPrimary)
            }

            Text("₩\(amount.formatted())")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.white)
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Color.parkPrimary.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.parkPrimary.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Helpers

    private func findMyParticipant() -> [String: Any]? {
        guard let uid = currentUserId else { return nil }
        return participants.first { p in
            if let id = p["userId"] as? Int { return id == uid }
            if let idStr = p["userId"] as? String, let id = Int(idStr) { return id == uid }
            return false
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

// MARK: - Countdown View

private struct CountdownView: View {
    let expiredAt: String

    @State private var remainingSeconds: Int = 0
    @State private var expDate: Date?

    private var timerText: String {
        let minutes = remainingSeconds / 60
        let seconds = remainingSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    var body: some View {
        if remainingSeconds > 0 {
            HStack(spacing: 4) {
                Image(systemName: "timer")
                    .font(.system(size: 10))
                Text("남은 시간 \(timerText)")
                    .font(.caption2)
            }
            .foregroundColor(remainingSeconds <= 60 ? .yellow : .white.opacity(0.5))
            .frame(maxWidth: .infinity, alignment: .center)
            .onAppear { parseExpDate() }
            .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
                updateRemaining()
            }
        } else if remainingSeconds == 0 {
            Text("결제 시간 만료")
                .font(.caption2)
                .foregroundColor(.red.opacity(0.8))
                .frame(maxWidth: .infinity, alignment: .center)
                .onAppear { parseExpDate() }
        }
    }

    private func parseExpDate() {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        expDate = formatter.date(from: expiredAt) ?? ISO8601DateFormatter().date(from: expiredAt)
        updateRemaining()
    }

    private func updateRemaining() {
        guard let expDate = expDate else { return }
        remainingSeconds = max(0, Int(expDate.timeIntervalSinceNow))
    }
}
