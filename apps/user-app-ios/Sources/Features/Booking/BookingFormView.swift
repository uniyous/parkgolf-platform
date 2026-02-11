import SwiftUI

// MARK: - Booking Form View (시니어 UI)

struct BookingFormView: View {
    let round: Round
    let timeSlot: TimeSlot
    let selectedDate: Date

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel: BookingFormViewModel

    init(round: Round, timeSlot: TimeSlot, selectedDate: Date) {
        self.round = round
        self.timeSlot = timeSlot
        self.selectedDate = selectedDate
        self._viewModel = StateObject(wrappedValue: BookingFormViewModel(
            round: round,
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
                    // 시니어 UI: 단일 카드 레이아웃
                    GlassCard {
                        VStack(spacing: 0) {
                            // 예약 정보
                            bookingInfoSection

                            sectionDivider

                            // 인원 선택
                            playerCountSection

                            sectionDivider

                            // 결제 방법
                            paymentMethodSection

                            sectionDivider

                            // 결제 금액
                            priceSection

                            sectionDivider

                            // 약관 동의
                            termsSection
                        }
                    }
                    .padding(ParkSpacing.md)

                    // Spacer for bottom button
                    Spacer()
                        .frame(height: 100)
                }

                // Bottom Button
                VStack {
                    Spacer()

                    GradientButton(
                        title: (viewModel.isLoading || viewModel.isPaymentProcessing) ? "처리 중..." : "₩\(viewModel.formatPrice(viewModel.totalPrice)) 예약하기",
                        isLoading: viewModel.isLoading || viewModel.isPaymentProcessing,
                        isDisabled: !viewModel.canProceed || viewModel.isPaymentProcessing
                    ) {
                        viewModel.createBooking(user: appState.currentUser)
                    }
                    .frame(height: 64)
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
            .navigationTitle("예약 확인")
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
            .sheet(isPresented: $viewModel.showPaymentSheet) {
                if let prepareData = viewModel.paymentPrepareData {
                    TossPaymentView(
                        clientKey: Configuration.Payment.tossClientKey,
                        orderId: prepareData.orderId,
                        orderName: prepareData.orderName,
                        amount: prepareData.amount,
                        onResult: { outcome in
                            viewModel.showPaymentSheet = false
                            viewModel.handlePaymentResult(outcome, user: appState.currentUser)
                        },
                        isPresented: $viewModel.showPaymentSheet
                    )
                }
            }
            .fullScreenCover(isPresented: $viewModel.showBookingComplete, onDismiss: {
                if appState.bookingCompleteAction != .none {
                    dismiss()
                }
            }) {
                if let booking = viewModel.createdBooking {
                    BookingCompleteView(booking: booking)
                        .environmentObject(appState)
                }
            }
        }
    }

    // MARK: - Section Divider

    private var sectionDivider: some View {
        Divider()
            .background(Color.white.opacity(0.2))
            .padding(.vertical, ParkSpacing.md)
    }

    // MARK: - Booking Info Section (시니어 UI: 단순화)

    private var bookingInfoSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            Text(round.clubName)
                .font(.parkHeadlineLarge)
                .foregroundStyle(.white)

            if let location = round.club?.location {
                Text("📍 \(location)")
                    .font(.parkBodyLarge)
                    .foregroundStyle(.white.opacity(0.7))
            }

            Text("📅 \(viewModel.formattedDate)")
                .font(.parkBodyLarge)
                .foregroundStyle(.white.opacity(0.9))

            Text("🕐 \(timeSlot.startTime)")
                .font(.parkBodyLarge)
                .foregroundStyle(.white.opacity(0.9))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Player Count Section (시니어 UI: 버튼 토글)

    private var playerCountSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            Text("인원 선택")
                .font(.parkBodyLarge)
                .fontWeight(.semibold)
                .foregroundStyle(.white.opacity(0.9))

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: ParkSpacing.sm) {
                ForEach(1...min(timeSlot.availableSlots, 4), id: \.self) { count in
                    Button {
                        viewModel.playerCount = count
                    } label: {
                        Text("\(count)명")
                            .font(.parkBodyLarge)
                            .fontWeight(.medium)
                            .foregroundStyle(viewModel.playerCount == count ? Color.parkSuccess : .white.opacity(0.7))
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(
                                RoundedRectangle(cornerRadius: ParkRadius.md)
                                    .fill(viewModel.playerCount == count ? Color.parkSuccess.opacity(0.3) : Color.white.opacity(0.1))
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: ParkRadius.md)
                                    .stroke(viewModel.playerCount == count ? Color.parkSuccess.opacity(0.5) : Color.white.opacity(0.2), lineWidth: 1)
                            )
                    }
                }
            }
        }
    }

    // MARK: - Payment Method Section (시니어 UI: 2개만)

    private var paymentMethodSection: some View {
        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
            Text("결제 방법")
                .font(.parkBodyLarge)
                .fontWeight(.semibold)
                .foregroundStyle(.white.opacity(0.9))

            HStack(spacing: ParkSpacing.sm) {
                ForEach([PaymentMethod.onsite, PaymentMethod.card], id: \.self) { method in
                    let isCardDisabled = method == .card && viewModel.totalPrice <= 0
                    Button {
                        if !isCardDisabled {
                            viewModel.selectedPaymentMethod = method
                        }
                    } label: {
                        VStack(spacing: ParkSpacing.xs) {
                            Text(method.icon)
                                .font(.system(size: 28))
                            Text(method.displayName)
                                .font(.parkBodyLarge)
                                .fontWeight(.medium)
                            if isCardDisabled {
                                Text("무료 게임은 현장결제만 가능")
                                    .font(.parkLabelSmall)
                                    .foregroundStyle(.white.opacity(0.4))
                            }
                        }
                        .foregroundStyle(
                            isCardDisabled ? .white.opacity(0.3) :
                            viewModel.selectedPaymentMethod == method ? Color.parkSuccess : .white.opacity(0.7)
                        )
                        .frame(maxWidth: .infinity)
                        .frame(height: 80)
                        .background(
                            RoundedRectangle(cornerRadius: ParkRadius.lg)
                                .fill(
                                    isCardDisabled ? Color.white.opacity(0.05) :
                                    viewModel.selectedPaymentMethod == method ? Color.parkSuccess.opacity(0.3) : Color.white.opacity(0.1)
                                )
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: ParkRadius.lg)
                                .stroke(
                                    isCardDisabled ? Color.white.opacity(0.1) :
                                    viewModel.selectedPaymentMethod == method ? Color.parkSuccess.opacity(0.5) : Color.white.opacity(0.2), lineWidth: 1
                                )
                        )
                    }
                    .disabled(isCardDisabled)
                }
            }
        }
    }

    // MARK: - Price Section (시니어 UI: 큰 금액 표시)

    private var priceSection: some View {
        VStack(spacing: ParkSpacing.sm) {
            Text("총 결제 금액")
                .font(.parkBodyLarge)
                .fontWeight(.semibold)
                .foregroundStyle(.white.opacity(0.9))

            Text("₩\(viewModel.formatPrice(viewModel.totalPrice))")
                .font(.parkDisplayMedium)
                .foregroundStyle(.white)

            Text("(\(viewModel.playerCount)명 × ₩\(viewModel.formatPrice(timeSlot.price)))")
                .font(.parkBodyLarge)
                .foregroundStyle(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Terms Section (시니어 UI: 1개로 통합)

    private var termsSection: some View {
        Button {
            viewModel.agreedToTerms.toggle()
            viewModel.agreedToPrivacy = viewModel.agreedToTerms
        } label: {
            HStack(alignment: .top, spacing: ParkSpacing.sm) {
                Image(systemName: viewModel.agreedToTerms ? "checkmark.square.fill" : "square")
                    .font(.system(size: 24))
                    .foregroundStyle(viewModel.agreedToTerms ? Color.parkPrimary : .white.opacity(0.4))

                Text("이용약관 및 개인정보처리방침에 동의합니다")
                    .font(.parkBodyLarge)
                    .foregroundStyle(.white.opacity(0.9))
                    .multilineTextAlignment(.leading)

                Spacer()
            }
        }
    }
}

// MARK: - Booking Form ViewModel

@MainActor
class BookingFormViewModel: ObservableObject {
    // MARK: - Properties

    let round: Round
    let timeSlot: TimeSlot
    let selectedDate: Date

    @Published var playerCount: Int = 2
    @Published var selectedPaymentMethod: PaymentMethod = .onsite
    @Published var agreedToTerms: Bool = false
    @Published var agreedToPrivacy: Bool = false

    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showBookingComplete = false
    @Published var createdBooking: BookingResponse?

    // Payment
    @Published var showPaymentSheet = false
    @Published var paymentPrepareData: PreparePaymentResponse?
    @Published var isPaymentProcessing = false

    private let bookingService = BookingService()
    private let paymentService = PaymentService()

    // MARK: - Init

    init(round: Round, timeSlot: TimeSlot, selectedDate: Date) {
        self.round = round
        self.timeSlot = timeSlot
        self.selectedDate = selectedDate
        // 기본 인원 조정
        self.playerCount = min(2, timeSlot.availableSlots)
    }

    // MARK: - Computed Properties

    var formattedDate: String {
        DateHelper.toKoreanFullDate(selectedDate)
    }

    var totalPrice: Int {
        timeSlot.price * playerCount
    }

    var canProceed: Bool {
        agreedToTerms && agreedToPrivacy && playerCount > 0
    }

    // MARK: - Actions

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

        // 카드결제 재시도: 이전 결제 시도에서 돌아온 경우 기존 예약으로 재시도
        if selectedPaymentMethod == .card && createdBooking != nil && paymentPrepareData != nil {
            errorMessage = nil
            showPaymentSheet = true
            return
        }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                let request = CreateBookingRequest(
                    gameId: round.id,
                    gameTimeSlotId: timeSlot.id,
                    bookingDate: DateHelper.toISODateString(selectedDate),
                    playerCount: playerCount,
                    paymentMethod: selectedPaymentMethod.rawValue,
                    specialRequests: nil,
                    userEmail: user.email,
                    userName: user.name,
                    userPhone: user.phone,
                    idempotencyKey: UUID().uuidString
                )

                let booking = try await bookingService.createBooking(request: request)
                createdBooking = booking

                if selectedPaymentMethod == .card {
                    // Card payment: prepare payment and show Toss SDK
                    let prepareRequest = PreparePaymentRequest(
                        amount: totalPrice,
                        orderName: "\(round.clubName) - \(timeSlot.startTime)",
                        bookingId: booking.id
                    )
                    let prepareResponse = try await paymentService.preparePayment(request: prepareRequest)
                    paymentPrepareData = prepareResponse
                    isLoading = false
                    showPaymentSheet = true
                } else {
                    // Onsite payment: go directly to completion
                    showBookingComplete = true
                    isLoading = false
                }
            } catch {
                errorMessage = translateErrorMessage(error)
                isLoading = false
            }
        }
    }

    func handlePaymentResult(_ outcome: TossPaymentOutcome, user: User?) {
        switch outcome {
        case .success(let paymentKey, let orderId, let amount):
            isPaymentProcessing = true
            Task {
                do {
                    let confirmRequest = ConfirmPaymentRequest(
                        paymentKey: paymentKey,
                        orderId: orderId,
                        amount: amount
                    )
                    _ = try await paymentService.confirmPayment(request: confirmRequest)
                    isPaymentProcessing = false
                    showBookingComplete = true
                } catch {
                    // Fallback: check payment status by orderId
                    do {
                        let status = try await paymentService.getPaymentByOrderId(orderId: orderId)
                        if status.status == "DONE" || status.status == "APPROVED" {
                            isPaymentProcessing = false
                            showBookingComplete = true
                        } else {
                            isPaymentProcessing = false
                            errorMessage = "결제 승인 실패: \(error.localizedDescription) (status: \(status.status))"
                        }
                    } catch let fallbackError {
                        isPaymentProcessing = false
                        errorMessage = "결제 승인 실패: \(error.localizedDescription.isEmpty ? fallbackError.localizedDescription : error.localizedDescription)"
                    }
                }
            }

        case .failure(_, let errorMessage):
            self.errorMessage = errorMessage

        case .cancelled:
            break
        }
    }

    private func translateErrorMessage(_ error: Error) -> String {
        let message = error.localizedDescription

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
        round: Round(
            id: 1,
            name: "주말 특가 라운드",
            code: "WEEKEND01",
            description: nil,
            clubId: 1,
            clubName: "서울파크골프장",
            club: RoundClub(id: 1, name: "서울파크골프장", location: "서울", address: "서울시 강남구", phone: nil),
            frontNineCourseId: 1,
            backNineCourseId: nil,
            frontNineCourse: RoundCourse(id: 1, name: "A코스", code: nil, holeCount: 9),
            backNineCourse: nil,
            totalHoles: 9,
            estimatedDuration: 120,
            breakDuration: nil,
            maxPlayers: 4,
            basePrice: 45000,
            pricePerPerson: 45000,
            weekendPrice: 50000,
            holidayPrice: 55000,
            status: "ACTIVE",
            isActive: true,
            timeSlots: nil
        ),
        timeSlot: TimeSlot(
            id: 1,
            gameId: 1,
            date: nil,
            startTime: "06:00",
            endTime: "08:00",
            maxPlayers: 4,
            bookedPlayers: 1,
            availablePlayers: 3,
            price: 45000,
            isPremium: false,
            status: nil
        ),
        selectedDate: Date()
    )
    .environmentObject(AppState())
}
