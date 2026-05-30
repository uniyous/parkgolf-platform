import SwiftUI

struct BookingExpiredCardView: View {
    let data: Any

    private var reason: String {
        (data as? [String: Any])?["reason"] as? String ?? "결제 시간이 초과되었습니다"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("⏰ \(reason)")
                .font(.subheadline)
                .foregroundColor(.orange)
            Text("다시 예약해 주세요")
                .font(.caption)
                .foregroundColor(.white.opacity(0.5))
        }
        .padding(12)
        .frame(minWidth: 280, maxWidth: 320, alignment: .leading)
        .background(Color.orange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.orange.opacity(0.2), lineWidth: 1)
        )
    }
}
