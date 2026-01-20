import SwiftUI

// MARK: - Booking Complete View

struct BookingCompleteView: View {
    let booking: BookingResponse

    @Environment(\.dismiss) private var dismiss
    @State private var showConfetti = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                // Content
                ScrollView {
                    VStack(spacing: ParkSpacing.lg) {
                        // Success Icon
                        successHeader

                        // Booking Number
                        bookingNumberCard

                        // Booking Details
                        bookingDetailsCard

                        // Notice
                        noticeCard

                        // Actions
                        actionButtons
                    }
                    .padding(ParkSpacing.md)
                    .padding(.top, ParkSpacing.xl)
                }
            }
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .foregroundStyle(.white)
                    }
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
            .onAppear {
                withAnimation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.2)) {
                    showConfetti = true
                }
            }
        }
    }

    // MARK: - Success Header

    private var successHeader: some View {
        VStack(spacing: ParkSpacing.md) {
            // Animated Success Icon
            ZStack {
                Circle()
                    .fill(Color.parkSuccess.opacity(0.2))
                    .frame(width: 120, height: 120)
                    .scaleEffect(showConfetti ? 1.0 : 0.5)
                    .opacity(showConfetti ? 1.0 : 0)

                Circle()
                    .fill(Color.parkSuccess.opacity(0.3))
                    .frame(width: 90, height: 90)
                    .scaleEffect(showConfetti ? 1.0 : 0.5)
                    .opacity(showConfetti ? 1.0 : 0)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(Color.parkSuccess)
                    .scaleEffect(showConfetti ? 1.0 : 0)
                    .rotationEffect(.degrees(showConfetti ? 0 : -180))
            }
            .animation(.spring(response: 0.6, dampingFraction: 0.7), value: showConfetti)

            VStack(spacing: ParkSpacing.xs) {
                Text("예약이 완료되었습니다!")
                    .font(.parkDisplaySmall)
                    .foregroundStyle(.white)

                Text("예약 확인 메일이 발송되었습니다")
                    .font(.parkBodyMedium)
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .padding(.vertical, ParkSpacing.lg)
    }

    // MARK: - Booking Number Card

    private var bookingNumberCard: some View {
        GlassCard {
            VStack(spacing: ParkSpacing.sm) {
                Text("예약번호")
                    .font(.parkLabelMedium)
                    .foregroundStyle(.white.opacity(0.6))

                Text(booking.bookingNumber)
                    .font(.parkDisplayMedium)
                    .foregroundStyle(Color.parkPrimary)
                    .textSelection(.enabled)

                Button {
                    UIPasteboard.general.string = booking.bookingNumber
                    let impactFeedback = UINotificationFeedbackGenerator()
                    impactFeedback.notificationOccurred(.success)
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "doc.on.doc")
                        Text("복사하기")
                    }
                    .font(.parkLabelSmall)
                    .foregroundStyle(.white.opacity(0.6))
                }
            }
        }
    }

    // MARK: - Booking Details Card

    private var bookingDetailsCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.md) {
                Text("📋 예약 상세")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                    if let gameName = booking.gameName {
                        DetailRow(icon: "flag", label: "게임", value: gameName)
                    }

                    if let clubName = booking.clubName {
                        DetailRow(icon: "building.2", label: "골프장", value: clubName)
                    }

                    if let courseNames = booking.courseNames {
                        DetailRow(icon: "map", label: "코스", value: courseNames)
                    }

                    DetailRow(icon: "calendar", label: "날짜", value: booking.formattedDate)

                    DetailRow(icon: "clock", label: "시간", value: booking.timeRange)

                    DetailRow(icon: "person.2", label: "인원", value: "\(booking.playerCount)명")

                    if let specialRequests = booking.specialRequests, !specialRequests.isEmpty {
                        DetailRow(icon: "text.bubble", label: "요청사항", value: specialRequests)
                    }
                }

                Divider()
                    .background(Color.white.opacity(0.2))

                HStack {
                    Text("총 결제 금액")
                        .font(.parkBodyMedium)
                        .foregroundStyle(.white.opacity(0.8))

                    Spacer()

                    PriceDisplay(amount: booking.totalPrice, size: .large, color: .parkPrimary)
                }
            }
        }
    }

    // MARK: - Notice Card

    private var noticeCard: some View {
        GlassCard(padding: ParkSpacing.md) {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                HStack {
                    Image(systemName: "info.circle.fill")
                        .foregroundStyle(Color.parkInfo)
                    Text("이용 안내")
                        .font(.parkHeadlineSmall)
                        .foregroundStyle(.white)
                }

                VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                    NoticeItem(text: "라운드 3일 전까지 무료 취소 가능합니다")
                    NoticeItem(text: "당일 취소는 수수료가 발생할 수 있습니다")
                    NoticeItem(text: "드레스 코드를 확인해주세요")
                    NoticeItem(text: "문의사항은 고객센터로 연락해주세요")
                }
            }
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        VStack(spacing: ParkSpacing.sm) {
            GradientButton(
                title: "🔍 새로운 예약하기",
                style: .secondary
            ) {
                dismiss()
            }

            GradientButton(
                title: "📋 내 예약 보기"
            ) {
                // Navigate to my bookings
                dismiss()
            }
        }
    }
}

// MARK: - Detail Row

struct DetailRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .top) {
            Image(systemName: icon)
                .frame(width: 20)
                .foregroundStyle(.white.opacity(0.6))

            Text(label)
                .foregroundStyle(.white.opacity(0.6))
                .frame(width: 60, alignment: .leading)

            Text(value)
                .foregroundStyle(.white)

            Spacer()
        }
        .font(.parkBodySmall)
    }
}

// MARK: - Notice Item

struct NoticeItem: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: ParkSpacing.xs) {
            Text("•")
                .foregroundStyle(.white.opacity(0.4))

            Text(text)
                .font(.parkBodySmall)
                .foregroundStyle(.white.opacity(0.7))
        }
    }
}

// MARK: - Preview

#Preview {
    BookingCompleteView(
        booking: BookingResponse(
            id: 1,
            bookingNumber: "BK-20240125-001",
            userId: 1,
            gameId: 1,
            gameName: "주말 특가 라운드",
            clubName: "서울파크골프장",
            courseNames: "A코스, B코스",
            gameTimeSlotId: 1,
            bookingDate: "2024-01-25",
            startTime: "09:00",
            endTime: "11:00",
            playerCount: 4,
            status: "CONFIRMED",
            totalPrice: 103000,
            serviceFee: 3000,
            pricePerPerson: 25000,
            paymentMethod: "CREDIT_CARD",
            specialRequests: "카트 요청드립니다",
            createdAt: "2024-01-20T10:00:00Z",
            updatedAt: nil
        )
    )
}
