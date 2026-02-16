import SwiftUI

// MARK: - Booking Complete View

struct BookingCompleteView: View {
    let booking: BookingResponse

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @State private var showConfetti = false

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: ParkSpacing.lg) {
                        // 1. Success Message + Booking Number
                        successCard

                        // 2. Booking Details
                        bookingDetailsCard

                        // 3. Action Buttons
                        actionButtons

                        // 4. Notice
                        noticeCard
                    }
                    .padding(.horizontal, ParkSpacing.md)
                    .padding(.top, ParkSpacing.xl)
                    .padding(.bottom, ParkSpacing.xxl)
                }
            }
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 18, weight: .medium))
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

    // MARK: - 1. Success Card (체크 + 메시지 + 예약번호)

    private var successCard: some View {
        GlassCard(padding: ParkSpacing.xl) {
            VStack(spacing: ParkSpacing.lg) {
                // Animated Checkmark
                ZStack {
                    Circle()
                        .fill(Color.parkSuccess.opacity(0.3))
                        .frame(width: 80, height: 80)

                    Circle()
                        .stroke(Color.parkSuccess.opacity(0.5), lineWidth: 2)
                        .frame(width: 80, height: 80)

                    Text("✅")
                        .font(.system(size: 40))
                        .scaleEffect(showConfetti ? 1.0 : 0)
                        .rotationEffect(.degrees(showConfetti ? 0 : -180))
                }
                .animation(.spring(response: 0.6, dampingFraction: 0.7), value: showConfetti)

                // Title
                Text("예약이 완료되었습니다!")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)

                // Subtitle
                Text("라운드 예약이 성공적으로 완료되었습니다.\n예약 확인 메일이 발송되었습니다.")
                    .font(.parkBodyLarge)
                    .foregroundStyle(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)

                // Booking Number Box
                VStack(spacing: ParkSpacing.xs) {
                    Text("예약번호")
                        .font(.parkLabelLarge)
                        .foregroundStyle(Color.parkSuccess.opacity(0.9))

                    Text(booking.bookingNumber)
                        .font(.system(size: 22, weight: .bold, design: .monospaced))
                        .foregroundStyle(.white)
                        .tracking(3)
                        .textSelection(.enabled)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, ParkSpacing.md)
                .padding(.horizontal, ParkSpacing.lg)
                .background(
                    RoundedRectangle(cornerRadius: ParkRadius.lg)
                        .fill(Color.parkSuccess.opacity(0.2))
                        .overlay(
                            RoundedRectangle(cornerRadius: ParkRadius.lg)
                                .stroke(Color.parkSuccess.opacity(0.4), lineWidth: 2)
                        )
                )
            }
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - 2. Booking Details Card

    private var bookingDetailsCard: some View {
        GlassCard(padding: ParkSpacing.lg) {
            VStack(alignment: .leading, spacing: ParkSpacing.lg) {
                // Section Title
                Text("예약 상세 정보")
                    .font(.system(size: 22, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)

                // Game Info Box
                gameInfoBox

                // Info Grid (2x2)
                infoGrid

                // Special Requests (conditional)
                if let specialRequests = booking.specialRequests, !specialRequests.isEmpty {
                    specialRequestsBox(specialRequests)
                }

                // Payment Summary
                paymentSummaryBox
            }
        }
    }

    // MARK: - Game Info Box

    private var gameInfoBox: some View {
        HStack(alignment: .top, spacing: ParkSpacing.md) {
            // Emoji Box
            ZStack {
                RoundedRectangle(cornerRadius: ParkRadius.lg)
                    .fill(
                        LinearGradient(
                            colors: [Color(red: 0.2, green: 0.8, blue: 0.5).opacity(0.3),
                                     Color(red: 0.1, green: 0.6, blue: 0.4).opacity(0.3)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                Text("🏌️")
                    .font(.system(size: 36))
            }
            .frame(width: 80, height: 80)

            // Info
            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                if let gameName = booking.gameName {
                    Text(gameName)
                        .font(.parkHeadlineMedium)
                        .foregroundStyle(.white)
                }

                if let clubName = booking.clubName {
                    Text(clubName)
                        .font(.parkBodyMedium)
                        .foregroundStyle(.white.opacity(0.7))
                }

                // Tags
                HStack(spacing: ParkSpacing.xs) {
                    InfoTag(text: "\(booking.playerCount)명")

                    if let courseNames = booking.courseNames {
                        InfoTag(text: courseNames, isAccent: true)
                    }
                }
                .padding(.top, ParkSpacing.xxs)
            }

            Spacer()
        }
        .padding(ParkSpacing.md)
        .background(
            RoundedRectangle(cornerRadius: ParkRadius.lg)
                .fill(Color.white.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: ParkRadius.lg)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
        )
    }

    // MARK: - Info Grid (2x2)

    private var infoGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: ParkSpacing.sm) {
            InfoGridItem(label: "예약 날짜", value: booking.formattedDate)
            InfoGridItem(label: "예약 시간", value: booking.startTime)
            InfoGridItem(label: "플레이어 수", value: "\(booking.playerCount)명")
            InfoGridItem(label: "결제 방법", value: paymentMethodDisplay)
        }
    }

    private var paymentMethodDisplay: String {
        if let method = booking.paymentMethod,
           let pm = PaymentMethod(rawValue: method) {
            return "\(pm.icon) \(pm.displayName)"
        }
        return "결제 완료"
    }

    // MARK: - Special Requests Box

    private func specialRequestsBox(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: ParkSpacing.xs) {
            Text("특별 요청사항")
                .font(.parkLabelLarge)
                .fontWeight(.semibold)
                .foregroundStyle(Color(red: 1.0, green: 0.85, blue: 0.4))

            Text(text)
                .font(.parkBodyMedium)
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(ParkSpacing.md)
        .background(
            RoundedRectangle(cornerRadius: ParkRadius.lg)
                .fill(Color(red: 1.0, green: 0.75, blue: 0.2).opacity(0.2))
                .overlay(
                    RoundedRectangle(cornerRadius: ParkRadius.lg)
                        .stroke(Color(red: 1.0, green: 0.75, blue: 0.2).opacity(0.4), lineWidth: 1)
                )
        )
    }

    // MARK: - Payment Summary Box

    private var paymentSummaryBox: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.xs) {
            Text("결제 완료 금액")
                .font(.parkBodyLarge)
                .fontWeight(.semibold)
                .foregroundStyle(Color.parkSuccess.opacity(0.9))

            Text(formatPrice(booking.totalPrice))
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            if booking.pricePerPerson > 0 {
                Text("(기본요금: \(formatPrice(booking.pricePerPerson * booking.playerCount))원\(booking.serviceFee > 0 ? " + 수수료: \(formatPrice(booking.serviceFee))원" : ""))")
                    .font(.parkLabelMedium)
                    .foregroundStyle(Color.parkSuccess.opacity(0.7))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(ParkSpacing.lg)
        .background(
            RoundedRectangle(cornerRadius: ParkRadius.lg)
                .fill(Color.parkSuccess.opacity(0.2))
                .overlay(
                    RoundedRectangle(cornerRadius: ParkRadius.lg)
                        .stroke(Color.parkSuccess.opacity(0.4), lineWidth: 2)
                )
        )
    }

    // MARK: - 3. Action Buttons

    private var actionButtons: some View {
        HStack(spacing: ParkSpacing.sm) {
            // 새로운 예약하기
            Button {
                appState.bookingCompleteAction = .newBooking
                dismiss()
            } label: {
                Text("새로운 예약하기")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(
                        RoundedRectangle(cornerRadius: ParkRadius.lg)
                            .fill(Color.parkSuccess.opacity(0.2))
                            .overlay(
                                RoundedRectangle(cornerRadius: ParkRadius.lg)
                                    .stroke(Color.parkSuccess.opacity(0.4), lineWidth: 2)
                            )
                    )
            }

            // 내 예약 보기
            Button {
                appState.bookingCompleteAction = .myBookings
                dismiss()
            } label: {
                Text("내 예약 보기")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(
                        RoundedRectangle(cornerRadius: ParkRadius.lg)
                            .fill(Color.white.opacity(0.1))
                            .overlay(
                                RoundedRectangle(cornerRadius: ParkRadius.lg)
                                    .stroke(Color.white.opacity(0.3), lineWidth: 2)
                            )
                    )
            }
        }
    }

    // MARK: - 4. Notice Card

    private var noticeCard: some View {
        GlassCard(padding: ParkSpacing.lg) {
            VStack(alignment: .leading, spacing: ParkSpacing.md) {
                Text("예약 안내사항")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)

                VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                    NoticeItem(text: "예약 확인 메일을 확인해주세요.")
                    NoticeItem(text: "예약 변경/취소는 예약일 3일 전까지 가능합니다.")
                    NoticeItem(text: "당일 취소 시 취소 수수료가 부과될 수 있습니다.")
                    NoticeItem(text: "골프장 이용 시 드레스 코드를 준수해주세요.")
                    NoticeItem(text: "문의사항이 있으시면 고객센터로 연락주세요.")
                }
            }
        }
    }

    // MARK: - Helpers

    private func formatPrice(_ price: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return "₩\(formatter.string(from: NSNumber(value: price)) ?? "\(price)")"
    }
}

// MARK: - Detail Row (used by MyBookingsView)

struct DetailRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .top) {
            Image(systemName: icon)
                .frame(width: 24)
                .foregroundStyle(.white.opacity(0.6))

            Text(label)
                .foregroundStyle(.white.opacity(0.6))
                .frame(width: 72, alignment: .leading)

            Text(value)
                .foregroundStyle(.white)

            Spacer()
        }
        .font(.parkBodyLarge)
    }
}

// MARK: - Info Tag

struct InfoTag: View {
    let text: String
    var isAccent: Bool = false

    var body: some View {
        Text(text)
            .font(.parkLabelMedium)
            .fontWeight(.medium)
            .foregroundStyle(isAccent ? Color(red: 0.4, green: 0.9, blue: 0.6) : .white.opacity(0.9))
            .padding(.horizontal, ParkSpacing.sm)
            .padding(.vertical, ParkSpacing.xxs)
            .background(
                Capsule()
                    .fill(isAccent ? Color(red: 0.2, green: 0.8, blue: 0.5).opacity(0.2) : Color.white.opacity(0.2))
            )
    }
}

// MARK: - Info Grid Item

struct InfoGridItem: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.xs) {
            Text(label)
                .font(.parkLabelMedium)
                .foregroundStyle(.white.opacity(0.6))

            Text(value)
                .font(.parkBodyLarge)
                .fontWeight(.semibold)
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(ParkSpacing.md)
        .background(
            RoundedRectangle(cornerRadius: ParkRadius.lg)
                .fill(Color.white.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: ParkRadius.lg)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
        )
    }
}

// MARK: - Notice Item

struct NoticeItem: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: ParkSpacing.xs) {
            Text("•")
                .foregroundStyle(.white.opacity(0.5))

            Text(text)
                .font(.parkBodyMedium)
                .foregroundStyle(.white.opacity(0.8))
                .lineSpacing(2)

            Spacer()
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
            gameTimeSlotId: 1,
            gameName: "주말 특가 라운드",
            gameCode: "AB",
            frontNineCourseId: 1,
            frontNineCourseName: "A코스",
            backNineCourseId: 2,
            backNineCourseName: "B코스",
            clubId: 1,
            clubName: "서울파크골프장",
            bookingDate: "2024-01-25",
            startTime: "09:00",
            endTime: "11:00",
            playerCount: 4,
            pricePerPerson: 25000,
            serviceFee: 3000,
            totalPrice: 103000,
            status: "CONFIRMED",
            paymentMethod: "card",
            specialRequests: "카트 요청드립니다",
            notes: nil,
            userEmail: nil,
            userName: nil,
            userPhone: nil,
            canCancel: true,
            createdAt: "2024-01-20T10:00:00Z",
            updatedAt: nil
        )
    )
}
