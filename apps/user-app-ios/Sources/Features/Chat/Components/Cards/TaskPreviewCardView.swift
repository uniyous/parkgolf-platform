import SwiftUI

struct TaskPreviewCardView: View {
    let data: Any

    private var dataDict: [String: Any]? {
        data as? [String: Any]
    }

    var body: some View {
        let location = dataDict?["location"] as? String
        let date = dataDict?["date"] as? String ?? "오늘"
        let playerCount = dataDict?["playerCount"] as? Int

        VStack(alignment: .leading, spacing: 8) {
            Text("네! 검색할게요 🏌️")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.9))

            HStack(spacing: 8) {
                if let location = location {
                    tagView("📍 \(location)")
                }
                if let count = playerCount {
                    tagView("👥 \(count)명")
                }
                tagView("📅 \(date)")
            }
        }
        .padding(12)
        .frame(minWidth: 280, maxWidth: 320, alignment: .leading)
        .background(Color.parkPrimary.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.parkPrimary.opacity(0.2), lineWidth: 1)
        )
    }

    private func tagView(_ text: String) -> some View {
        Text(text)
            .font(.caption)
            .foregroundColor(.white.opacity(0.6))
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(Color.white.opacity(0.1))
            .clipShape(Capsule())
    }
}
