import SwiftUI

struct ClubCardView: View {
    let data: Any
    var onSelect: ((String, String) -> Void)?

    private var clubs: [[String: Any]] {
        guard let dict = data as? [String: Any],
              let clubs = dict["clubs"] as? [[String: Any]] else { return [] }
        return clubs
    }

    var body: some View {
        VStack(spacing: 8) {
            ForEach(Array(clubs.enumerated()), id: \.offset) { _, club in
                let id = club["id"] as? String ?? ""
                let name = club["name"] as? String ?? ""
                let address = club["address"] as? String ?? ""

                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(name)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)

                        HStack(spacing: 4) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.5))
                            Text(address)
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.5))
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    if onSelect != nil {
                        Button {
                            onSelect?(id, name)
                        } label: {
                            Text("선택하기")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(Color.parkPrimary)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.parkPrimary.opacity(0.2))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                }
                .padding(12)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
            }
        }
    }
}
