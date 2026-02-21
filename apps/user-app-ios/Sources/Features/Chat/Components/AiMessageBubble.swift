import SwiftUI

struct AiMessageBubble: View {
    let content: String
    let actions: [ChatAction]?
    let createdAt: Date
    var onClubSelect: ((String, String) -> Void)?
    var onSlotSelect: ((String, String) -> Void)?

    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                // AI avatar + name
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 10))
                        .foregroundColor(Color.parkPrimary)
                        .frame(width: 20, height: 20)
                        .background(Color.parkPrimary.opacity(0.2))
                        .clipShape(Circle())

                    Text("AI 예약 도우미")
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundColor(Color.parkPrimary)
                }

                HStack(alignment: .bottom, spacing: 6) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(content)
                            .font(.subheadline)
                            .foregroundColor(.white)

                        if let actions = actions {
                            ForEach(Array(actions.enumerated()), id: \.offset) { _, action in
                                actionView(for: action)
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    Text(DateHelper.toKoreanTime(createdAt))
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.4))
                }
            }

            Spacer(minLength: 40)
        }
    }

    @ViewBuilder
    private func actionView(for action: ChatAction) -> some View {
        switch action.type {
        case .showClubs:
            ClubCardView(data: action.data.value, onSelect: onClubSelect)
        case .showSlots:
            SlotCardView(data: action.data.value, onSelect: onSlotSelect)
        case .showWeather:
            WeatherCardView(data: action.data.value)
        case .bookingComplete:
            BookingCompleteCardView(data: action.data.value)
        case .confirmBooking:
            EmptyView()
        }
    }
}
