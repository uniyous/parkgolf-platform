import SwiftUI

// MARK: - Round Booking View

struct RoundBookingView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = RoundBookingViewModel()

    /// 타이틀 헤더 표시 여부 (탭에서 직접 접근 시 true, NavigationLink로 접근 시 false)
    var showTitle: Bool = true

    var body: some View {
        Group {
            if showTitle {
                // 탭에서 직접 접근 시: NavigationStack 포함
                NavigationStack {
                    roundBookingContent
                        .navigationBarHidden(true)
                }
            } else {
                // NavigationLink로 접근 시: 부모 NavigationStack 사용
                roundBookingContent
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
                            Text("라운드 예약")
                                .font(.parkHeadlineMedium)
                                .foregroundStyle(.white)
                        }
                    }
                    .toolbarBackground(.hidden, for: .navigationBar)
            }
        }
    }

    private var roundBookingContent: some View {
        ZStack {
            // Background
            LinearGradient.parkBackground
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Title Header (탭에서 직접 접근 시에만 표시)
                if showTitle {
                    titleHeader
                }

                // Search Header
                searchHeader

                // Date Selector
                dateSelector

                // Time of Day Filter
                timeOfDayFilter

                // Results
                if viewModel.isLoading && viewModel.rounds.isEmpty {
                    ParkLoadingView(message: "라운드 검색 중...")
                } else if viewModel.rounds.isEmpty {
                    ScrollView {
                        VStack {
                            Spacer().frame(height: 40)
                            if let error = viewModel.errorMessage {
                                ParkErrorView(message: error) {
                                    viewModel.search()
                                }
                            } else {
                                ParkEmptyStateView(
                                    icon: "magnifyingglass",
                                    title: "검색 결과가 없습니다",
                                    description: "다른 날짜나 검색어로 시도해보세요"
                                )
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .refreshable {
                        viewModel.search()
                    }
                } else {
                    roundList
                }
            }

            // 재검색 시 로딩 오버레이
            if viewModel.isLoading && !viewModel.rounds.isEmpty {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()

                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.white)
            }
        }
        .fullScreenCover(isPresented: $viewModel.showBookingForm, onDismiss: {
            if appState.bookingCompleteAction == .myBookings {
                appState.showMyBookingsSheet = true
            }
            appState.bookingCompleteAction = .none
        }) {
            if let round = viewModel.selectedRound,
               let timeSlot = viewModel.selectedTimeSlot {
                BookingFormView(
                    round: round,
                    timeSlot: timeSlot,
                    selectedDate: viewModel.selectedDate
                )
                .environmentObject(appState)
            }
        }
        .task {
            viewModel.search()
        }
    }

    // MARK: - Title Header

    private var titleHeader: some View {
        HStack {
            Text("라운드 예약")
                .font(.parkDisplaySmall)
                .foregroundStyle(.white)

            Spacer()
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.top, ParkSpacing.sm)
        .padding(.bottom, ParkSpacing.xs)
    }

    // MARK: - Search Header (시니어 UI: 필터 버튼 제거)

    private var searchHeader: some View {
        GlassSearchField(
            placeholder: "골프장, 코스 검색...",
            text: $viewModel.searchQuery
        ) {
            viewModel.search()
        }
        .accessibilityIdentifier("roundSearchField")
        .onChange(of: viewModel.searchQuery) { _, _ in
            viewModel.searchDebounced()
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.top, ParkSpacing.sm)
    }

    // MARK: - Date Selector

    private var dateSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: ParkSpacing.xxs) {
                ForEach(viewModel.dateOptions, id: \.self) { date in
                    DateChip(
                        date: date,
                        isSelected: Calendar.current.isDate(date, inSameDayAs: viewModel.selectedDate)
                    ) {
                        viewModel.selectDate(date)
                    }
                }
            }
            .padding(.horizontal, ParkSpacing.md)
        }
        .padding(.vertical, ParkSpacing.sm)
    }

    // MARK: - Time of Day Filter

    private var timeOfDayFilter: some View {
        HStack(spacing: ParkSpacing.xs) {
            ForEach(RoundSearchParams.TimeOfDay.allCases, id: \.self) { timeOfDay in
                FilterChip(
                    title: timeOfDay.displayName,
                    isSelected: viewModel.selectedTimeOfDay == timeOfDay
                ) {
                    viewModel.selectTimeOfDay(timeOfDay)
                }
            }

            Spacer()

            // Results count
            if viewModel.totalCount > 0 {
                Text("\(viewModel.totalCount)건")
                    .font(.parkLabelMedium)
                    .foregroundStyle(.white.opacity(0.6))
            }
        }
        .padding(.horizontal, ParkSpacing.md)
        .padding(.bottom, ParkSpacing.sm)
    }

    // MARK: - Round List

    private var roundList: some View {
        ScrollView {
            LazyVStack(spacing: ParkSpacing.md) {
                ForEach(viewModel.rounds) { round in
                    RoundCardView(round: round, selectedDate: viewModel.selectedDate) { timeSlot in
                        viewModel.selectTimeSlot(round: round, timeSlot: timeSlot)
                    }
                    .accessibilityIdentifier("roundCard_\(round.id)")
                    .onAppear {
                        if round.id == viewModel.rounds.last?.id {
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
            .padding(.horizontal, ParkSpacing.md)
            .padding(.bottom, ParkSpacing.xxl)
        }
        .refreshable {
            viewModel.search()
        }
    }
}

// MARK: - Date Chip

struct DateChip: View {
    let date: Date
    let isSelected: Bool
    let action: () -> Void

    private var weekday: String {
        DateHelper.toWeekday(date)
    }

    private var shortDate: String {
        DateHelper.toShortDate(date)
    }

    private var isWeekend: Bool {
        let weekdayNumber = Calendar.current.component(.weekday, from: date)
        return weekdayNumber == 1 || weekdayNumber == 7 // 일요일(1) 또는 토요일(7)
    }

    var body: some View {
        VStack(spacing: 4) {
            Text(weekday)
                .font(.parkBodyMedium)
                .fontWeight(.medium)
                .foregroundStyle(weekdayColor)

            Text(shortDate)
                .font(.parkBodyLarge)
                .fontWeight(.semibold)
                .foregroundStyle(isSelected ? .white : .white.opacity(0.9))
        }
        .frame(width: 56, height: 60)
        .background(
            RoundedRectangle(cornerRadius: ParkRadius.md)
                .fill(isSelected ? Color.parkPrimary : Color.white.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: ParkRadius.md)
                .stroke(isSelected ? Color.parkPrimary : Color.white.opacity(0.2), lineWidth: 1)
        )
        .contentShape(Rectangle())
        .onTapGesture {
            action()
        }
    }

    private var weekdayColor: Color {
        if isSelected {
            return .white
        } else if isWeekend {
            return .parkAccent
        } else {
            return .white.opacity(0.6)
        }
    }
}

// MARK: - Filter Chip (시니어 UI: 큰 터치 영역)

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Text(title)
            .font(.parkBodyLarge)
            .fontWeight(isSelected ? .semibold : .regular)
            .foregroundStyle(isSelected ? .white : .white.opacity(0.7))
            .padding(.horizontal, ParkSpacing.md)
            .padding(.vertical, ParkSpacing.sm)
            .frame(minHeight: 44)
            .background(
                RoundedRectangle(cornerRadius: ParkRadius.md)
                    .fill(isSelected ? Color.parkPrimary.opacity(0.3) : Color.white.opacity(0.1))
            )
            .overlay(
                RoundedRectangle(cornerRadius: ParkRadius.md)
                    .stroke(isSelected ? Color.parkPrimary.opacity(0.5) : Color.white.opacity(0.2), lineWidth: 1)
            )
            .contentShape(Rectangle())
            .onTapGesture {
                action()
            }
    }
}

// MARK: - Round Card View (시니어 UI: 단순화, 세로 리스트)

struct RoundCardView: View {
    let round: Round
    let selectedDate: Date
    let onSelectTimeSlot: (TimeSlot) -> Void

    @State private var showAllSlots = false

    private var displayedSlots: [TimeSlot] {
        guard let slots = round.timeSlots else { return [] }
        return showAllSlots ? slots : Array(slots.prefix(5))  // 5개로 축소
    }

    private var hasMoreSlots: Bool {
        (round.timeSlots?.count ?? 0) > 5
    }

    private var pricePerPerson: Int {
        round.pricePerPerson ?? round.basePrice
    }

    var body: some View {
        GlassCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                // Round Info (시니어 UI: 단순화)
                VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                    Text(round.clubName)
                        .font(.parkHeadlineLarge)
                        .foregroundStyle(.white)

                    Text("📍 \(round.club?.location ?? "") · \(round.name)")
                        .font(.parkBodyLarge)
                        .foregroundStyle(.white.opacity(0.7))

                    Text("\(pricePerPerson.formatted())원 /인 · \(round.durationText) · \(round.maxPlayers)명")
                        .font(.parkBodyLarge)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white.opacity(0.9))
                }
                .padding(ParkSpacing.md)

                // Time Slots (시니어 UI: 세로 리스트)
                if !displayedSlots.isEmpty {
                    Divider()
                        .background(Color.white.opacity(0.2))

                    VStack(spacing: ParkSpacing.xs) {
                        Text("예약 가능 시간")
                            .font(.parkBodyLarge)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.bottom, ParkSpacing.xs)

                        ForEach(displayedSlots, id: \.id) { slot in
                            SeniorTimeSlotRow(slot: slot) {
                                onSelectTimeSlot(slot)
                            }
                        }

                        if hasMoreSlots && !showAllSlots {
                            Button {
                                withAnimation(.spring(response: 0.3)) {
                                    showAllSlots = true
                                }
                            } label: {
                                Text("전체 \(round.timeSlots?.count ?? 0)개 시간 보기 ▼")
                                    .font(.parkBodyMedium)
                                    .foregroundStyle(.white.opacity(0.7))
                                    .padding(.top, ParkSpacing.xs)
                            }
                        }
                    }
                    .padding(ParkSpacing.md)
                    .background(Color.black.opacity(0.1))
                }
            }
        }
    }
}

// MARK: - Senior Time Slot Row (시니어 UI: 큰 터치 영역, 세로 리스트)

struct SeniorTimeSlotRow: View {
    let slot: TimeSlot
    let action: () -> Void

    private var availabilityText: String {
        if slot.availableSlots == 0 {
            return "매진"
        } else if slot.availableSlots <= 2 {
            return "마감임박"
        }
        return "\(slot.availableSlots)자리 남음"
    }

    private var availabilityColor: Color {
        if slot.availableSlots <= 2 {
            return .parkError
        }
        return .parkSuccess
    }

    var body: some View {
        Button(action: action) {
            HStack {
                Text(slot.startTime)
                    .font(.parkBodyLarge)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)

                Spacer()

                Text(availabilityText)
                    .font(.parkBodyLarge)
                    .foregroundStyle(availabilityColor)
            }
            .padding(.horizontal, ParkSpacing.md)
            .frame(height: 56)
            .background(
                RoundedRectangle(cornerRadius: ParkRadius.md)
                    .fill(slot.isPremium ? Color.parkAccent.opacity(0.2) : Color.white.opacity(0.1))
            )
            .overlay(
                RoundedRectangle(cornerRadius: ParkRadius.md)
                    .stroke(slot.isPremium ? Color.parkAccent.opacity(0.5) : Color.white.opacity(0.3), lineWidth: 1)
            )
        }
        .disabled(slot.availableSlots == 0)
        .opacity(slot.availableSlots == 0 ? 0.4 : 1)
        .accessibilityIdentifier("timeSlot_\(slot.id)")
    }
}



// MARK: - Preview

#Preview {
    RoundBookingView()
}
