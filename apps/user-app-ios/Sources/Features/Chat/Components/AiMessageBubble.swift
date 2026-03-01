import SwiftUI

struct AiMessageBubble: View {
    let content: String
    let actions: [ChatAction]?
    let createdAt: Date
    var showLabel: Bool = true
    var onClubSelect: ((String, String) -> Void)?
    var onSlotSelect: ((String, String, Int, String?, String?) -> Void)?
    var onConfirmBooking: ((String) -> Void)?
    var onCancelBooking: (() -> Void)?
    var onPaymentComplete: ((Bool) -> Void)?
    var onRequestPayment: ((String, String, Int) -> Void)?
    var onConfirmGroup: ((String) -> Void)?
    var onCancelGroup: (() -> Void)?
    var onTeamConfirm: (([TeamConfirmData]) -> Void)?
    var onSplitPaymentComplete: ((Bool, String) -> Void)?
    var onRequestSplitPayment: ((String, Int) -> Void)?
    var onNextTeam: (() -> Void)?
    var onFinish: (() -> Void)?
    var onSendReminder: (() -> Void)?
    var onRefresh: (() -> Void)?
    var currentUserId: Int?
    var selectedClubId: String?
    var selectedSlotId: String?

    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                // AI avatar + name (hidden for consecutive AI messages)
                if showLabel {
                    HStack(spacing: 6) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 10))
                            .foregroundColor(.white)
                            .frame(width: 24, height: 24)
                            .background(
                                LinearGradient(
                                    colors: [Color.parkPrimary, Color.parkPrimary.opacity(0.7)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .clipShape(Circle())
                            .shadow(color: Color.parkPrimary.opacity(0.3), radius: 3)

                        Text("AI 예약 도우미")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundColor(Color.parkPrimary)
                    }
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
                    .background(Color.parkPrimary.opacity(0.10))
                    .overlay(
                        Rectangle()
                            .fill(Color.parkPrimary)
                            .frame(width: 3),
                        alignment: .leading
                    )
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
            ClubCardView(
                data: action.data.value,
                onSelect: onClubSelect,
                selectedClubId: selectedClubId
            )
        case .showSlots:
            SlotCardView(
                data: action.data.value,
                onSelect: onSlotSelect,
                selectedSlotId: selectedSlotId
            )
        case .showWeather:
            WeatherCardView(data: action.data.value)
        case .bookingComplete:
            BookingCompleteCardView(data: action.data.value)
        case .confirmBooking:
            ConfirmBookingCardView(
                data: action.data.value,
                onConfirm: onConfirmBooking,
                onCancel: onCancelBooking
            )
        case .showPayment:
            PaymentCardView(
                data: action.data.value,
                onPaymentComplete: onPaymentComplete,
                onRequestPayment: onRequestPayment
            )
        case .confirmGroup:
            ConfirmGroupCardView(
                data: action.data.value,
                onConfirm: onConfirmGroup,
                onCancel: onCancelGroup
            )
        case .selectMembers:
            SelectParticipantsCardView(
                data: action.data.value,
                onConfirm: onTeamConfirm,
                onCancel: onCancelGroup
            )
        case .settlementStatus:
            SettlementStatusCardView(
                data: action.data.value,
                currentUserId: currentUserId,
                onSplitPaymentComplete: onSplitPaymentComplete,
                onRequestSplitPayment: onRequestSplitPayment,
                onSendReminder: onSendReminder,
                onRefresh: onRefresh
            )
        case .teamComplete:
            TeamCompleteCardView(
                data: action.data.value,
                onNextTeam: onNextTeam,
                onFinish: onFinish
            )
        case .splitPayment:
            EmptyView()
        }
    }
}
