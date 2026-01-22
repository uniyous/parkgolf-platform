import SwiftUI

// MARK: - Time Slot Button

struct TimeSlotButton: View {
    let time: String
    let price: Int
    let available: Int
    let isPremium: Bool
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: {
            let impactFeedback = UIImpactFeedbackGenerator(style: .light)
            impactFeedback.impactOccurred()
            action()
        }) {
            VStack(spacing: 4) {
                HStack(spacing: 2) {
                    Text(time)
                        .font(.parkLabelLarge)
                        .fontWeight(.semibold)
                    if isPremium {
                        Text("💎")
                            .font(.system(size: 10))
                    }
                }

                PriceDisplay(amount: price, size: .small, showCurrency: true)

                HStack(spacing: 2) {
                    Circle()
                        .fill(availabilityColor)
                        .frame(width: 6, height: 6)
                    Text("\(available)석")
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
            .foregroundStyle(.white)
            .frame(width: 80, height: 70)
            .background(
                RoundedRectangle(cornerRadius: ParkRadius.md)
                    .fill(isSelected ? Color.parkPrimary : Color.white.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: ParkRadius.md)
                            .stroke(
                                isSelected ? Color.parkPrimary : Color.white.opacity(0.2),
                                lineWidth: isSelected ? 2 : 1
                            )
                    )
            )
            .scaleEffect(isSelected ? 1.02 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
        }
        .disabled(available == 0)
        .opacity(available == 0 ? 0.4 : 1)
    }

    private var availabilityColor: Color {
        if available == 0 {
            return .gray
        } else if available <= 2 {
            return .parkError
        } else if available <= 4 {
            return .parkWarning
        } else {
            return .parkSuccess
        }
    }
}

// MARK: - Time Slot Grid

struct TimeSlotGrid: View {
    let timeSlots: [TimeSlotData]
    @Binding var selectedSlotId: String?
    let onSelect: (TimeSlotData) -> Void

    var body: some View {
        LazyVGrid(columns: [
            GridItem(.adaptive(minimum: 80), spacing: ParkSpacing.xs)
        ], spacing: ParkSpacing.xs) {
            ForEach(timeSlots) { slot in
                TimeSlotButton(
                    time: slot.startTime,
                    price: slot.price,
                    available: slot.availableSlots,
                    isPremium: slot.isPremium,
                    isSelected: selectedSlotId == slot.id
                ) {
                    selectedSlotId = slot.id
                    onSelect(slot)
                }
            }
        }
    }
}

// MARK: - Time Slot Data Model

struct TimeSlotData: Identifiable {
    let id: String
    let startTime: String
    let endTime: String
    let price: Int
    let availableSlots: Int
    let maxCapacity: Int
    let isPremium: Bool
}

// MARK: - Preview

#Preview {
    ZStack {
        LinearGradient.parkBackground
            .ignoresSafeArea()

        VStack(spacing: 20) {
            Text("Time Slots")
                .font(.parkHeadlineLarge)
                .foregroundStyle(.white)

            TimeSlotGrid(
                timeSlots: [
                    TimeSlotData(id: "1", startTime: "09:00", endTime: "11:00", price: 25000, availableSlots: 8, maxCapacity: 8, isPremium: true),
                    TimeSlotData(id: "2", startTime: "10:00", endTime: "12:00", price: 22000, availableSlots: 4, maxCapacity: 8, isPremium: false),
                    TimeSlotData(id: "3", startTime: "11:00", endTime: "13:00", price: 22000, availableSlots: 2, maxCapacity: 8, isPremium: false),
                    TimeSlotData(id: "4", startTime: "14:00", endTime: "16:00", price: 20000, availableSlots: 0, maxCapacity: 8, isPremium: false),
                    TimeSlotData(id: "5", startTime: "15:00", endTime: "17:00", price: 25000, availableSlots: 6, maxCapacity: 8, isPremium: true),
                ],
                selectedSlotId: .constant("1"),
                onSelect: { _ in }
            )
            .padding()
            .glassCard()
        }
        .padding()
    }
}
