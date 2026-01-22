import SwiftUI

// MARK: - Booking Form View

struct BookingFormView: View {
    let game: Game
    let timeSlot: GameTimeSlot
    let selectedDate: Date

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: BookingFormViewModel

    init(game: Game, timeSlot: GameTimeSlot, selectedDate: Date) {
        self.game = game
        self.timeSlot = timeSlot
        self.selectedDate = selectedDate
        self._viewModel = StateObject(wrappedValue: BookingFormViewModel(
            game: game,
            timeSlot: timeSlot,
            selectedDate: selectedDate
        ))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: ParkSpacing.md) {
                        // Booking Info Card
                        bookingInfoCard

                        // Player Count
                        playerCountCard

                        // Special Requests
                        specialRequestsCard

                        // Payment Method
                        paymentMethodCard

                        // Price Summary
                        priceSummaryCard

                        // Terms
                        termsCard

                        // Spacer for bottom button
                        Spacer()
                            .frame(height: 100)
                    }
                    .padding(ParkSpacing.md)
                }

                // Bottom Button
                VStack {
                    Spacer()

                    GradientButton(
                        title: "💳 결제하기",
                        isLoading: viewModel.isLoading,
                        isDisabled: !viewModel.canProceed
                    ) {
                        viewModel.createBooking(user: appState.currentUser)
                    }
                    .padding(.horizontal, ParkSpacing.md)
                    .padding(.bottom, ParkSpacing.md)
                    .background(
                        LinearGradient(
                            colors: [Color.clear, Color.black.opacity(0.8)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .ignoresSafeArea()
                    )
                }
            }
            .navigationTitle("예약하기")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .foregroundStyle(.white)
                    }
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
            .alert("오류", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("확인") {
                    viewModel.errorMessage = nil
                }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
            .fullScreenCover(isPresented: $viewModel.showBookingComplete) {
                if let booking = viewModel.createdBooking {
                    BookingCompleteView(booking: booking)
                }
            }
        }
    }

    // MARK: - Booking Info Card

    private var bookingInfoCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                HStack {
                    Text("📋 예약 정보")
                        .font(.parkHeadlineSmall)
                        .foregroundStyle(.white)

                    Spacer()

                    if timeSlot.isPremium {
                        HStack(spacing: 4) {
                            Text("💎")
                            Text("프리미엄")
                                .font(.parkLabelSmall)
                        }
                        .foregroundStyle(Color.parkAccent)
                        .padding(.horizontal, ParkSpacing.xs)
                        .padding(.vertical, 2)
                        .background(Color.parkAccent.opacity(0.2))
                        .clipShape(Capsule())
                    }
                }

                Divider()
                    .background(Color.white.opacity(0.1))

                VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                    HStack {
                        Image(systemName: "building.2")
                            .frame(width: 20)
                        Text(game.clubName)
                    }

                    HStack {
                        Image(systemName: "flag")
                            .frame(width: 20)
                        Text(game.name)
                    }

                    HStack {
                        Image(systemName: "calendar")
                            .frame(width: 20)
                        Text(viewModel.formattedDate)
                    }

                    HStack {
                        Image(systemName: "clock")
                            .frame(width: 20)
                        Text("\(timeSlot.startTime) - \(timeSlot.endTime)")
                    }

                    HStack {
                        Image(systemName: "person.2")
                            .frame(width: 20)
                        Text("잔여 \(timeSlot.availableSlots)석")
                            .foregroundStyle(availabilityColor)
                    }
                }
                .font(.parkBodyMedium)
                .foregroundStyle(.white.opacity(0.8))
            }
        }
    }

    private var availabilityColor: Color {
        if timeSlot.availableSlots <= 2 {
            return .parkError
        } else if timeSlot.availableSlots <= 4 {
            return .parkWarning
        }
        return .parkSuccess
    }

    // MARK: - Player Count Card

    private var playerCountCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                Text("👥 인원 선택")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                HStack {
                    Button {
                        viewModel.decrementPlayerCount()
                    } label: {
                        Image(systemName: "minus.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(viewModel.playerCount > 1 ? .white : .white.opacity(0.3))
                    }
                    .disabled(viewModel.playerCount <= 1)

                    Spacer()

                    VStack {
                        Text("\(viewModel.playerCount)")
                            .font(.parkDisplayMedium)
                            .foregroundStyle(.white)

                        Text(playerCountLabel)
                            .font(.parkCaption)
                            .foregroundStyle(.white.opacity(0.6))
                    }

                    Spacer()

                    Button {
                        viewModel.incrementPlayerCount()
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(viewModel.playerCount < timeSlot.availableSlots ? Color.parkPrimary : .white.opacity(0.3))
                    }
                    .disabled(viewModel.playerCount >= timeSlot.availableSlots)
                }
                .padding(.vertical, ParkSpacing.sm)
            }
        }
    }

    private var playerCountLabel: String {
        if viewModel.playerCount == 1 {
            return "개인 라운드"
        } else if viewModel.playerCount == game.maxPlayers {
            return "풀 플라이트"
        }
        return "명"
    }

    // MARK: - Special Requests Card

    private var specialRequestsCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                Text("📝 요청사항 (선택)")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                GlassTextEditor(
                    placeholder: "카트 요청, 캐디 서비스 등 요청사항을 입력해주세요...",
                    text: $viewModel.specialRequests,
                    minHeight: 80
                )
            }
        }
    }

    // MARK: - Payment Method Card

    private var paymentMethodCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                Text("💳 결제 수단")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                VStack(spacing: ParkSpacing.xs) {
                    ForEach(PaymentMethod.allCases, id: \.self) { method in
                        PaymentMethodRow(
                            method: method,
                            isSelected: viewModel.selectedPaymentMethod == method
                        ) {
                            viewModel.selectedPaymentMethod = method
                        }
                    }
                }
            }
        }
    }

    // MARK: - Price Summary Card

    private var priceSummaryCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                Text("💰 결제 금액")
                    .font(.parkHeadlineSmall)
                    .foregroundStyle(.white)

                VStack(spacing: ParkSpacing.xs) {
                    PriceSummaryRow(
                        label: "기본 요금 (₩\(viewModel.formatPrice(timeSlot.price)) × \(viewModel.playerCount)명)",
                        amount: viewModel.basePrice
                    )

                    PriceSummaryRow(
                        label: "서비스 수수료 (3%)",
                        amount: viewModel.serviceFee
                    )

                    Divider()
                        .background(Color.white.opacity(0.2))

                    PriceSummaryRow(
                        label: "총 결제 금액",
                        amount: viewModel.totalPrice,
                        isTotal: true
                    )
                }
            }
        }
    }

    // MARK: - Terms Card

    private var termsCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                TermsCheckbox(
                    isChecked: $viewModel.agreedToTerms,
                    title: "이용약관에 동의합니다",
                    isRequired: true
                )

                TermsCheckbox(
                    isChecked: $viewModel.agreedToPrivacy,
                    title: "개인정보 처리방침에 동의합니다",
                    isRequired: true
                )
            }
        }
    }
}

// MARK: - Payment Method Row

struct PaymentMethodRow: View {
    let method: PaymentMethod
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? Color.parkPrimary : .white.opacity(0.4))

                Text(method.icon)
                Text(method.displayName)
                    .foregroundStyle(.white)

                Spacer()
            }
            .padding(.vertical, ParkSpacing.xs)
        }
    }
}

// MARK: - Terms Checkbox

struct TermsCheckbox: View {
    @Binding var isChecked: Bool
    let title: String
    var isRequired: Bool = false

    var body: some View {
        Button {
            isChecked.toggle()
        } label: {
            HStack(spacing: ParkSpacing.sm) {
                Image(systemName: isChecked ? "checkmark.square.fill" : "square")
                    .foregroundStyle(isChecked ? Color.parkPrimary : .white.opacity(0.4))

                Text(title)
                    .font(.parkBodySmall)
                    .foregroundStyle(.white.opacity(0.8))

                if isRequired {
                    Text("(필수)")
                        .font(.parkCaption)
                        .foregroundStyle(Color.parkError)
                }

                Spacer()
            }
        }
    }
}

// MARK: - Booking Form ViewModel

@MainActor
class BookingFormViewModel: ObservableObject {
    // MARK: - Properties

    let game: Game
    let timeSlot: GameTimeSlot
    let selectedDate: Date

    @Published var playerCount: Int = 1
    @Published var specialRequests: String = ""
    @Published var selectedPaymentMethod: PaymentMethod = .card
    @Published var agreedToTerms: Bool = false
    @Published var agreedToPrivacy: Bool = false

    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showBookingComplete = false
    @Published var createdBooking: BookingResponse?

    private let bookingService = BookingService()
    private let serviceFeeRate: Double = 0.03

    // MARK: - Init

    init(game: Game, timeSlot: GameTimeSlot, selectedDate: Date) {
        self.game = game
        self.timeSlot = timeSlot
        self.selectedDate = selectedDate
    }

    // MARK: - Computed Properties

    var formattedDate: String {
        DateHelper.toKoreanFullDate(selectedDate)
    }

    var basePrice: Int {
        timeSlot.price * playerCount
    }

    var serviceFee: Int {
        Int(Double(basePrice) * serviceFeeRate)
    }

    var totalPrice: Int {
        basePrice + serviceFee
    }

    var canProceed: Bool {
        agreedToTerms && agreedToPrivacy && playerCount > 0
    }

    // MARK: - Actions

    func incrementPlayerCount() {
        guard playerCount < timeSlot.availableSlots else { return }
        playerCount += 1
    }

    func decrementPlayerCount() {
        guard playerCount > 1 else { return }
        playerCount -= 1
    }

    func formatPrice(_ price: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: price)) ?? "\(price)"
    }

    func createBooking(user: User?) {
        guard canProceed else { return }
        guard let user = user else {
            errorMessage = "사용자 정보를 찾을 수 없습니다."
            return
        }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                let request = CreateBookingRequest(
                    gameId: game.id,
                    gameTimeSlotId: timeSlot.id,
                    bookingDate: DateHelper.toISODateString(selectedDate),
                    playerCount: playerCount,
                    paymentMethod: selectedPaymentMethod.rawValue,
                    specialRequests: specialRequests.isEmpty ? nil : specialRequests,
                    userEmail: user.email,
                    userName: user.name,
                    userPhone: user.phoneNumber,
                    idempotencyKey: UUID().uuidString
                )

                let booking = try await bookingService.createBooking(request: request)
                createdBooking = booking
                showBookingComplete = true
            } catch {
                errorMessage = translateErrorMessage(error)
            }

            isLoading = false
        }
    }

    private func translateErrorMessage(_ error: Error) -> String {
        let message = error.localizedDescription

        // 에러 메시지 한글 변환
        if message.contains("Not enough capacity") {
            return "잔여 인원이 부족합니다."
        } else if message.contains("Selected time slot is not available") {
            return "선택한 시간대는 더 이상 예약할 수 없습니다."
        } else if message.contains("Game time slot not found") {
            return "선택한 예약 시간을 찾을 수 없습니다."
        } else if message.contains("Request is already being processed") {
            return "이미 처리 중인 요청입니다. 잠시 후 다시 시도해 주세요."
        } else if message.contains("BOOK_002") {
            return "해당 시간대는 예약할 수 없습니다."
        } else if message.contains("BOOK_006") || message.contains("BOOK_007") {
            return "유효하지 않은 예약 날짜입니다."
        }

        return message
    }
}

// MARK: - Preview

#Preview {
    BookingFormView(
        game: Game(
            id: 1,
            name: "주말 특가 라운드",
            code: "WEEKEND01",
            description: nil,
            clubId: 1,
            clubName: "서울파크골프장",
            club: GameClub(id: 1, name: "서울파크골프장", location: nil, address: "서울시 강남구", phone: nil),
            frontNineCourseId: 1,
            backNineCourseId: nil,
            frontNineCourse: GameCourse(id: 1, name: "A코스", code: nil, holeCount: 9),
            backNineCourse: nil,
            totalHoles: 9,
            estimatedDuration: 120,
            breakDuration: nil,
            maxPlayers: 4,
            basePrice: 25000,
            pricePerPerson: 25000,
            weekendPrice: 30000,
            holidayPrice: 35000,
            status: "ACTIVE",
            isActive: true,
            timeSlots: nil
        ),
        timeSlot: GameTimeSlot(
            id: 1,
            gameId: 1,
            date: nil,
            startTime: "09:00",
            endTime: "11:00",
            maxPlayers: 8,
            bookedPlayers: 2,
            availablePlayers: 6,
            price: 25000,
            isPremium: true,
            status: nil
        ),
        selectedDate: Date()
    )
    .environmentObject(AppState())
}
