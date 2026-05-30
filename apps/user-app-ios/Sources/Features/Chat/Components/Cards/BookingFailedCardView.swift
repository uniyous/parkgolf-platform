import SwiftUI

struct BookingFailedCardView: View {
    let data: Any

    private var reason: String {
        (data as? [String: Any])?["reason"] as? String ?? "예약에 실패했습니다"
    }

    var body: some View {
        Text("❌ \(reason)")
            .font(.subheadline)
            .foregroundColor(.red.opacity(0.8))
            .padding(12)
            .frame(minWidth: 280, maxWidth: 320, alignment: .leading)
            .background(Color.red.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.red.opacity(0.2), lineWidth: 1)
            )
    }
}
