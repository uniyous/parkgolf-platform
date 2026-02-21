import SwiftUI

struct SlotCardView: View {
    let data: Any
    var onSelect: ((String, String) -> Void)?

    private var slots: [[String: Any]] {
        guard let dict = data as? [String: Any],
              let slots = dict["slots"] as? [[String: Any]] else { return [] }
        return slots
    }

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
            ForEach(Array(slots.enumerated()), id: \.offset) { _, slot in
                let id = slot["id"] as? String ?? ""
                let time = slot["time"] as? String ?? ""
                let courseName = slot["courseName"] as? String ?? ""
                let price = slot["price"] as? Int ?? 0

                Button {
                    onSelect?(id, time)
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 4) {
                            Image(systemName: "clock.fill")
                                .font(.system(size: 10))
                                .foregroundColor(Color.parkPrimary)
                            Text(time)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                        }

                        Text(courseName)
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))

                        Text("₩\(price.formatted())")
                            .font(.caption)
                            .foregroundColor(Color.parkPrimary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color.white.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
                }
                .disabled(onSelect == nil)
            }
        }
    }
}
