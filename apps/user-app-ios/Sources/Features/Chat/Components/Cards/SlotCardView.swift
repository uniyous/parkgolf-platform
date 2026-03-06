import SwiftUI

struct SlotCardView: View {
    let data: Any
    var onSelect: ((String, String, Int, String?, String?, String?) -> Void)?
    var selectedSlotId: String?

    private var dataDict: [String: Any]? {
        data as? [String: Any]
    }

    private var slots: [[String: Any]] {
        guard let dict = dataDict,
              let slots = dict["slots"] as? [[String: Any]] else { return [] }
        return slots
    }

    private var clubId: String? {
        dataDict?["clubId"] as? String
    }

    private var clubName: String? {
        dataDict?["clubName"] as? String
    }

    private var hasSelection: Bool { selectedSlotId != nil }

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
            ForEach(Array(slots.enumerated()), id: \.offset) { _, slot in
                let id = slot["id"] as? String ?? ""
                let time = slot["time"] as? String ?? ""
                let gameName = slot["gameName"] as? String ?? ""
                let price = slot["price"] as? Int ?? 0
                let isSelected = selectedSlotId == id
                let isDisabled = hasSelection && !isSelected

                Button {
                    if !isDisabled {
                        onSelect?(id, time, price, clubId, clubName, gameName)
                    }
                } label: {
                    ZStack(alignment: .topTrailing) {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack(spacing: 4) {
                                Image(systemName: "clock.fill")
                                    .font(.system(size: 10))
                                    .foregroundColor(isSelected ? Color.parkPrimary : Color.parkPrimary)
                                Text(time)
                                    .font(.body)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)
                            }

                            Text(gameName)
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.6))

                            Text("₩\(price.formatted())")
                                .font(.subheadline)
                                .foregroundColor(Color.parkPrimary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        if isSelected {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundColor(Color.parkPrimary)
                        }
                    }
                    .padding(12)
                    .background(Color.white.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                isSelected ? Color.parkPrimary.opacity(0.4) : Color.white.opacity(0.1),
                                lineWidth: isSelected ? 1.5 : 1
                            )
                    )
                    .opacity(isDisabled ? 0.5 : 1.0)
                }
                .disabled(onSelect == nil || isDisabled)
            }
        }
    }
}
