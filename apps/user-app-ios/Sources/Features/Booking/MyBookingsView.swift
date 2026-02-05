import SwiftUI

// MARK: - My Bookings View

struct MyBookingsView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = MyBookingsViewModel()

    var body: some View {
        ZStack {
            LinearGradient.parkBackground
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Tab Selector
                tabSelector
                    .padding(.top, ParkSpacing.sm)

                // Content
                if viewModel.isLoading && viewModel.bookings.isEmpty {
                    ParkLoadingView(message: "예약 불러오는 중...")
                } else if let error = viewModel.errorMessage, viewModel.bookings.isEmpty {
                    ParkErrorView(message: error) {
                        viewModel.loadBookings()
                    }
                } else if viewModel.bookings.isEmpty {
                    emptyState
                } else {
                    bookingList
                }
            }
        }
        .sheet(item: $viewModel.bookingToCancel) { booking in
            CancelBookingSheet(
                booking: booking,
                onCancel: { reason in
                    viewModel.cancelBooking(booking, reason: reason)
                }
            )
        }
        .sheet(item: $viewModel.selectedBooking) { booking in
            BookingDetailSheet(booking: booking)
        }
        .task {
            await viewModel.loadBookingsAsync()

            // 알림에서 특정 예약 상세로 이동 요청 처리
            if let bookingId = appState.pendingBookingId {
                if let booking = viewModel.bookings.first(where: { $0.id == bookingId }) {
                    viewModel.selectedBooking = booking
                }
                appState.pendingBookingId = nil
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(.white)
                }
            }

            ToolbarItem(placement: .principal) {
                Text("예약")
                    .font(.parkHeadlineMedium)
                    .foregroundStyle(.white)
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }

    // MARK: - Tab Selector

    private var tabSelector: some View {
        HStack(spacing: 0) {
            ForEach(MyBookingsViewModel.BookingTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        viewModel.selectedTab = tab
                    }
                } label: {
                    VStack(spacing: ParkSpacing.xs) {
                        Text(tab.rawValue)
                            .font(.parkHeadlineSmall)
                            .foregroundStyle(viewModel.selectedTab == tab ? .white : .white.opacity(0.5))

                        Rectangle()
                            .fill(viewModel.selectedTab == tab ? Color.parkPrimary : Color.clear)
                            .frame(height: 3)
                            .clipShape(Capsule())
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.top, ParkSpacing.sm)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        ParkEmptyStateView(
            icon: viewModel.selectedTab == .upcoming ? "calendar.badge.plus" : "calendar.badge.clock",
            title: viewModel.selectedTab == .upcoming ? "예정된 예약이 없습니다" : "지난 예약이 없습니다",
            description: viewModel.selectedTab == .upcoming ?
                "새로운 라운드를 예약해 보세요!" :
                "아직 완료된 라운드가 없습니다",
            actionTitle: viewModel.selectedTab == .upcoming ? "예약하기" : nil
        ) {
            // Navigate to search
        }
    }

    // MARK: - Booking List

    private var bookingList: some View {
        ScrollView {
            LazyVStack(spacing: ParkSpacing.md) {
                ForEach(viewModel.bookings) { booking in
                    BookingListCard(
                        booking: booking,
                        onTap: {
                            viewModel.selectedBooking = booking
                        },
                        onCancel: booking.statusEnum.canCancel ? {
                            viewModel.bookingToCancel = booking
                        } : nil
                    )
                    .onAppear {
                        if booking.id == viewModel.bookings.last?.id {
                            viewModel.loadMore()
                        }
                    }
                }

                if viewModel.isLoadingMore {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .padding()
                }
            }
            .padding(ParkSpacing.md)
        }
        .refreshable {
            viewModel.loadBookings()
        }
    }
}

// MARK: - Booking List Card

struct BookingListCard: View {
    let booking: BookingResponse
    let onTap: () -> Void
    let onCancel: (() -> Void)?

    var body: some View {
        Button(action: onTap) {
            GlassCard(padding: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    // Header
                    HStack {
                        StatusBadge(status: .init(from: booking.status), size: .small)

                        Spacer()

                        Text(booking.bookingNumber)
                            .font(.parkCaption)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .padding(ParkSpacing.md)

                    Divider()
                        .background(Color.white.opacity(0.1))

                    // Content
                    VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                        if let gameName = booking.gameName {
                            Text(gameName)
                                .font(.parkHeadlineMedium)
                                .foregroundStyle(.white)
                        }

                        HStack(spacing: ParkSpacing.md) {
                            if let clubName = booking.clubName {
                                Label(clubName, systemImage: "building.2")
                            }

                            if let courseNames = booking.courseNames {
                                Label(courseNames, systemImage: "flag")
                            }
                        }
                        .font(.parkBodySmall)
                        .foregroundStyle(.white.opacity(0.7))

                        HStack(spacing: ParkSpacing.lg) {
                            Label(booking.formattedDate, systemImage: "calendar")
                            Label(booking.startTime, systemImage: "clock")
                            Label("\(booking.playerCount)명", systemImage: "person.2")
                        }
                        .font(.parkCaption)
                        .foregroundStyle(.white.opacity(0.6))
                    }
                    .padding(ParkSpacing.md)

                    // Footer
                    if onCancel != nil || true {
                        Divider()
                            .background(Color.white.opacity(0.1))

                        HStack {
                            PriceDisplay(amount: booking.totalPrice, size: .medium, color: .parkPrimary)

                            Spacer()

                            if let onCancel = onCancel {
                                SmallButton(
                                    title: "취소",
                                    icon: "xmark",
                                    color: .parkError.opacity(0.8)
                                ) {
                                    onCancel()
                                }
                            }

                            Image(systemName: "chevron.right")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(.white.opacity(0.4))
                        }
                        .padding(ParkSpacing.md)
                    }
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - My Bookings ViewModel

@MainActor
class MyBookingsViewModel: ObservableObject {
    enum BookingTab: String, CaseIterable {
        case upcoming = "예정된 예약"
        case past = "지난 예약"
    }

    @Published var selectedTab: BookingTab = .upcoming {
        didSet {
            if oldValue != selectedTab {
                loadBookings()
            }
        }
    }

    @Published var bookings: [BookingResponse] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var errorMessage: String?

    @Published var currentPage = 1
    @Published var totalPages = 1

    @Published var bookingToCancel: BookingResponse?
    @Published var selectedBooking: BookingResponse?

    private let bookingService = BookingService()

    var hasMorePages: Bool {
        currentPage < totalPages
    }

    func loadBookings() {
        Task {
            await loadBookingsAsync()
        }
    }

    func loadBookingsAsync() async {
        isLoading = true
        errorMessage = nil

        do {
            let allBookings = try await bookingService.getMyBookings(status: nil, page: 1)

            // 클라이언트에서 탭에 따라 필터링
            let now = Date()
            if selectedTab == .upcoming {
                bookings = allBookings.filter { booking in
                    guard let date = DateHelper.fromISODateString(booking.bookingDate) else { return false }
                    return date >= Calendar.current.startOfDay(for: now) &&
                           (booking.status == "PENDING" || booking.status == "SLOT_RESERVED" || booking.status == "CONFIRMED")
                }
            } else {
                bookings = allBookings.filter { booking in
                    guard let date = DateHelper.fromISODateString(booking.bookingDate) else { return true }
                    return date < Calendar.current.startOfDay(for: now) ||
                           booking.status == "COMPLETED" || booking.status == "CANCELLED" || booking.status == "NO_SHOW"
                }
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func loadMore() {
        // 페이지네이션 미지원 - 전체 목록을 한번에 로드
    }

    func cancelBooking(_ booking: BookingResponse, reason: String?) {
        Task {
            do {
                try await bookingService.cancelBooking(id: booking.id, reason: reason)
                // Remove from list or reload
                bookings.removeAll { $0.id == booking.id }
                bookingToCancel = nil
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Cancel Booking Sheet

struct CancelBookingSheet: View {
    let booking: BookingResponse
    let onCancel: (String?) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selectedReason: CancellationReason?
    @State private var customReason: String = ""

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: ParkSpacing.lg) {
                        // Warning
                        HStack(spacing: ParkSpacing.sm) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(Color.parkWarning)
                            Text("다음 예약을 취소하시겠습니까?")
                                .font(.parkHeadlineSmall)
                                .foregroundStyle(.white)
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.parkWarning.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))

                        // Booking Info
                        GlassCard {
                            VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                if let gameName = booking.gameName {
                                    Text(gameName)
                                        .font(.parkHeadlineMedium)
                                        .foregroundStyle(.white)
                                }

                                Text(booking.formattedDate)
                                    .font(.parkBodyMedium)
                                    .foregroundStyle(.white.opacity(0.7))

                                Text("\(booking.startTime) - \(booking.endTime)")
                                    .font(.parkBodySmall)
                                    .foregroundStyle(.white.opacity(0.6))
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        // Reason Selection
                        GlassCard {
                            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                                Text("📋 취소 사유 선택")
                                    .font(.parkHeadlineSmall)
                                    .foregroundStyle(.white)

                                VStack(spacing: ParkSpacing.xs) {
                                    ForEach(CancellationReason.allCases, id: \.self) { reason in
                                        Button {
                                            selectedReason = reason
                                        } label: {
                                            HStack {
                                                Image(systemName: selectedReason == reason ? "checkmark.circle.fill" : "circle")
                                                    .foregroundStyle(selectedReason == reason ? Color.parkPrimary : .white.opacity(0.4))

                                                Text(reason.rawValue)
                                                    .foregroundStyle(.white)

                                                Spacer()
                                            }
                                            .padding(.vertical, ParkSpacing.xs)
                                        }
                                    }
                                }

                                if selectedReason == .other {
                                    GlassTextEditor(
                                        placeholder: "취소 사유를 입력해주세요...",
                                        text: $customReason,
                                        minHeight: 60
                                    )
                                }
                            }
                        }

                        // Notice
                        HStack(spacing: ParkSpacing.sm) {
                            Image(systemName: "info.circle")
                                .foregroundStyle(Color.parkInfo)

                            Text("3일 전까지 무료 취소 가능합니다")
                                .font(.parkBodySmall)
                                .foregroundStyle(.white.opacity(0.7))
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.parkInfo.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))

                        Spacer()
                            .frame(height: 80)
                    }
                    .padding()
                }

                // Bottom Button
                VStack {
                    Spacer()

                    GradientButton(
                        title: "예약 취소하기",
                        icon: "xmark.circle",
                        style: .destructive,
                        isDisabled: selectedReason == nil
                    ) {
                        let reason = selectedReason == .other ? customReason : selectedReason?.rawValue
                        onCancel(reason)
                        dismiss()
                    }
                    .padding()
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
            .navigationTitle("예약 취소")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") {
                        dismiss()
                    }
                    .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Booking Detail Sheet

struct BookingDetailSheet: View {
    let booking: BookingResponse

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: ParkSpacing.md) {
                        // Status
                        HStack {
                            StatusBadge(status: .init(from: booking.status), size: .large)
                            Spacer()
                            Text(booking.bookingNumber)
                                .font(.parkLabelMedium)
                                .foregroundStyle(.white.opacity(0.5))
                        }
                        .padding()
                        .glassCard()

                        // Game Info
                        GlassCard {
                            VStack(alignment: .leading, spacing: ParkSpacing.md) {
                                Text("🏌️ 라운드 정보")
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
                                }
                            }
                        }

                        // Special Requests
                        if let requests = booking.specialRequests, !requests.isEmpty {
                            GlassCard {
                                VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                                    Text("📝 요청사항")
                                        .font(.parkHeadlineSmall)
                                        .foregroundStyle(.white)

                                    Text(requests)
                                        .font(.parkBodyMedium)
                                        .foregroundStyle(.white.opacity(0.8))
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }

                        // Payment Info
                        GlassCard {
                            VStack(alignment: .leading, spacing: ParkSpacing.md) {
                                Text("💰 결제 정보")
                                    .font(.parkHeadlineSmall)
                                    .foregroundStyle(.white)

                                VStack(spacing: ParkSpacing.xs) {
                                    PriceSummaryRow(
                                        label: "기본 요금 (\(booking.playerCount)명)",
                                        amount: booking.totalPrice - booking.serviceFee
                                    )
                                    PriceSummaryRow(
                                        label: "서비스 수수료",
                                        amount: booking.serviceFee
                                    )

                                    Divider()
                                        .background(Color.white.opacity(0.2))

                                    PriceSummaryRow(
                                        label: "총 결제 금액",
                                        amount: booking.totalPrice,
                                        isTotal: true,
                                        color: .parkPrimary
                                    )
                                }

                                if let paymentMethod = booking.paymentMethod {
                                    HStack {
                                        Text("결제 수단")
                                            .font(.parkBodySmall)
                                            .foregroundStyle(.white.opacity(0.6))

                                        Spacer()

                                        if let method = PaymentMethod(rawValue: paymentMethod) {
                                            Text("\(method.icon) \(method.displayName)")
                                                .font(.parkBodySmall)
                                                .foregroundStyle(.white)
                                        }
                                    }
                                }
                            }
                        }

                        // Timeline
                        GlassCard {
                            VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                                Text("📅 예약 기록")
                                    .font(.parkHeadlineSmall)
                                    .foregroundStyle(.white)

                                VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                                    HStack {
                                        Text("예약일시")
                                            .foregroundStyle(.white.opacity(0.6))
                                        Spacer()
                                        Text(formatDateTime(booking.createdAt))
                                            .foregroundStyle(.white)
                                    }
                                    .font(.parkBodySmall)

                                    if let updatedAt = booking.updatedAt {
                                        HStack {
                                            Text("수정일시")
                                                .foregroundStyle(.white.opacity(0.6))
                                            Spacer()
                                            Text(formatDateTime(updatedAt))
                                                .foregroundStyle(.white)
                                        }
                                        .font(.parkBodySmall)
                                    }
                                }
                            }
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("예약 상세")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("닫기") {
                        dismiss()
                    }
                    .foregroundStyle(.white)
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
    }

    private func formatDateTime(_ dateString: String) -> String {
        DateHelper.iso8601ToDateTime(dateString) ?? dateString
    }
}

// MARK: - Preview

#Preview {
    MyBookingsView()
}
