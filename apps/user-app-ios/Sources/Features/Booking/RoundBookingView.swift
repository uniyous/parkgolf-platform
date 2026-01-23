import SwiftUI

// MARK: - Round Booking View

struct RoundBookingView: View {
    @Environment(\.dismiss) private var dismiss
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
                } else if let error = viewModel.errorMessage, viewModel.rounds.isEmpty {
                    ParkErrorView(message: error) {
                        viewModel.search()
                    }
                } else if viewModel.rounds.isEmpty {
                    ParkEmptyStateView(
                        icon: "magnifyingglass",
                        title: "검색 결과가 없습니다",
                        description: "다른 날짜나 검색어로 시도해보세요"
                    )
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
        .sheet(isPresented: $viewModel.showFilterSheet) {
            RoundFilterSheet(viewModel: viewModel)
        }
        .fullScreenCover(isPresented: $viewModel.showBookingForm) {
            if let round = viewModel.selectedRound,
               let timeSlot = viewModel.selectedTimeSlot {
                BookingFormView(
                    round: round,
                    timeSlot: timeSlot,
                    selectedDate: viewModel.selectedDate
                )
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

    // MARK: - Search Header

    private var searchHeader: some View {
        HStack(spacing: ParkSpacing.sm) {
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

            // Filter Button
            Button {
                viewModel.showFilterSheet = true
            } label: {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(.white)
                        .frame(width: 48, height: 48)
                        .background(Color.white.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: ParkRadius.md))
                        .overlay(
                            RoundedRectangle(cornerRadius: ParkRadius.md)
                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                        )

                    if viewModel.activeFiltersCount > 0 {
                        Text("\(viewModel.activeFiltersCount)")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 18, height: 18)
                            .background(Color.parkAccent)
                            .clipShape(Circle())
                            .offset(x: 4, y: -4)
                    }
                }
            }
            .accessibilityIdentifier("filterButton")
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
                    title: timeOfDay.rawValue,
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
        VStack(spacing: 2) {
            Text(weekday)
                .font(.parkLabelSmall)
                .foregroundStyle(weekdayColor)

            Text(shortDate)
                .font(.parkLabelMedium)
                .foregroundStyle(isSelected ? .white : .white.opacity(0.8))
        }
        .frame(width: 44, height: 48)
        .background(
            RoundedRectangle(cornerRadius: ParkRadius.sm)
                .fill(isSelected ? Color.parkPrimary : Color.white.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: ParkRadius.sm)
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

// MARK: - Filter Chip

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Text(title)
            .font(.parkLabelSmall)
            .foregroundStyle(isSelected ? .white : .white.opacity(0.6))
            .padding(.horizontal, ParkSpacing.sm)
            .padding(.vertical, ParkSpacing.xxs)
            .background(
                Capsule()
                    .fill(isSelected ? Color.parkPrimary.opacity(0.8) : Color.clear)
            )
            .overlay(
                Capsule()
                    .stroke(isSelected ? Color.clear : Color.white.opacity(0.3), lineWidth: 1)
            )
            .contentShape(Capsule())
            .onTapGesture {
                #if DEBUG
                print("⏰ [FilterChip] tapped: \(title)")
                #endif
                action()
            }
    }
}

// MARK: - Round Card View

struct RoundCardView: View {
    let round: Round
    let selectedDate: Date
    let onSelectTimeSlot: (TimeSlot) -> Void

    @State private var showAllSlots = false

    private var displayedSlots: [TimeSlot] {
        guard let slots = round.timeSlots else { return [] }
        return showAllSlots ? slots : Array(slots.prefix(6))
    }

    private var hasMoreSlots: Bool {
        (round.timeSlots?.count ?? 0) > 6
    }

    var body: some View {
        GlassCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                // Round Info
                VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                    HStack {
                        Text(round.name)
                            .font(.parkHeadlineMedium)
                            .foregroundStyle(.white)

                        Spacer()

                        if let range = round.priceRange {
                            PriceRangeDisplay(minPrice: range.min, maxPrice: range.max, size: .small)
                        }
                    }

                    HStack(spacing: ParkSpacing.md) {
                        Label(round.clubName, systemImage: "building.2")
                        Label(round.courseNames, systemImage: "flag")
                    }
                    .font(.parkBodySmall)
                    .foregroundStyle(.white.opacity(0.7))

                    HStack(spacing: ParkSpacing.md) {
                        Label(round.durationText, systemImage: "clock")
                        Label("최대 \(round.maxPlayers)명", systemImage: "person.2")
                    }
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.6))
                }
                .padding(ParkSpacing.md)

                // Time Slots
                if !displayedSlots.isEmpty {
                    Divider()
                        .background(Color.white.opacity(0.1))

                    VStack(spacing: ParkSpacing.sm) {
                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: ParkSpacing.xs),
                            GridItem(.flexible(), spacing: ParkSpacing.xs),
                            GridItem(.flexible(), spacing: ParkSpacing.xs)
                        ], spacing: ParkSpacing.xs) {
                            ForEach(displayedSlots, id: \.id) { slot in
                                TimeSlotChip(slot: slot) {
                                    onSelectTimeSlot(slot)
                                }
                            }
                        }

                        if hasMoreSlots && !showAllSlots {
                            Button {
                                withAnimation(.spring(response: 0.3)) {
                                    showAllSlots = true
                                }
                            } label: {
                                Text("+ \((round.timeSlots?.count ?? 0) - 6)개 더보기")
                                    .font(.parkLabelSmall)
                                    .foregroundStyle(.white)
                            }
                        }
                    }
                    .padding(ParkSpacing.md)
                }
            }
        }
    }
}

// MARK: - Time Slot Chip

struct TimeSlotChip: View {
    let slot: TimeSlot
    let action: () -> Void

    private var priceText: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return "\(formatter.string(from: NSNumber(value: slot.price)) ?? "\(slot.price)")원"
    }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 0) {
                HStack(spacing: 2) {
                    Text(slot.startTime)
                        .font(.parkLabelMedium)
                    if slot.isPremium {
                        Text("💎")
                            .font(.system(size: 8))
                    }
                }

                Text(priceText)
                    .font(.system(size: 9))
                    .foregroundStyle(.white.opacity(0.7))

                Spacer().frame(height: 2)

                HStack(spacing: 2) {
                    Circle()
                        .fill(availabilityColor)
                        .frame(width: 5, height: 5)
                    Text("\(slot.availableSlots)명")
                        .font(.system(size: 9))
                        .foregroundStyle(.white)
                }
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(Color.white.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: ParkRadius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: ParkRadius.sm)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
        }
        .disabled(slot.availableSlots == 0)
        .opacity(slot.availableSlots == 0 ? 0.4 : 1)
        .accessibilityIdentifier("timeSlot_\(slot.id)")
    }

    private var availabilityColor: Color {
        switch slot.availabilityStatus {
        case .available: return .parkSuccess
        case .limited: return .parkWarning
        case .almostFull: return .parkError
        case .soldOut: return .gray
        }
    }
}

// MARK: - Round Filter Sheet

struct RoundFilterSheet: View {
    @ObservedObject var viewModel: RoundBookingViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient.parkBackground
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: ParkSpacing.lg) {
                        // Price Range
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            Text("💰 가격대")
                                .font(.parkHeadlineSmall)
                                .foregroundStyle(.white)

                            HStack(spacing: ParkSpacing.sm) {
                                GlassTextField(
                                    placeholder: "최소",
                                    text: $viewModel.minPrice,
                                    keyboardType: .numberPad
                                )

                                Text("~")
                                    .foregroundStyle(.white.opacity(0.5))

                                GlassTextField(
                                    placeholder: "최대",
                                    text: $viewModel.maxPrice,
                                    keyboardType: .numberPad
                                )
                            }
                        }
                        .padding()
                        .glassCard()

                        // Player Count
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            Text("👥 인원")
                                .font(.parkHeadlineSmall)
                                .foregroundStyle(.white)

                            HStack(spacing: ParkSpacing.xs) {
                                ForEach([1, 2, 3, 4], id: \.self) { count in
                                    FilterChip(
                                        title: "\(count)명\(count == 4 ? "+" : "")",
                                        isSelected: viewModel.selectedPlayerCount == count
                                    ) {
                                        viewModel.selectedPlayerCount = viewModel.selectedPlayerCount == count ? nil : count
                                    }
                                }
                            }
                        }
                        .padding()
                        .glassCard()

                        // Sort
                        VStack(alignment: .leading, spacing: ParkSpacing.sm) {
                            Text("📊 정렬")
                                .font(.parkHeadlineSmall)
                                .foregroundStyle(.white)

                            VStack(spacing: ParkSpacing.xs) {
                                ForEach(RoundSearchParams.SortOption.allCases, id: \.self) { option in
                                    HStack {
                                        Image(systemName: viewModel.sortBy == option ? "checkmark.circle.fill" : "circle")
                                            .foregroundStyle(viewModel.sortBy == option ? Color.parkPrimary : .white.opacity(0.4))

                                        Text(option.rawValue)
                                            .foregroundStyle(.white)

                                        Spacer()
                                    }
                                    .padding(.vertical, ParkSpacing.xs)
                                    .contentShape(Rectangle())
                                    .onTapGesture {
                                        viewModel.sortBy = option
                                    }
                                }
                            }

                            HStack(spacing: ParkSpacing.sm) {
                                ForEach(RoundSearchParams.SortOrder.allCases, id: \.self) { order in
                                    FilterChip(
                                        title: order.rawValue,
                                        isSelected: viewModel.sortOrder == order
                                    ) {
                                        viewModel.sortOrder = order
                                    }
                                }
                            }
                        }
                        .padding()
                        .glassCard()
                    }
                    .padding()
                }

                // Bottom Buttons
                VStack {
                    Spacer()

                    HStack(spacing: ParkSpacing.sm) {
                        GradientButton(
                            title: "초기화",
                            style: .ghost
                        ) {
                            viewModel.resetFilters()
                        }

                        GradientButton(
                            title: "적용하기"
                        ) {
                            viewModel.applyFilters()
                        }
                    }
                    .padding()
                    .background(
                        LinearGradient(
                            colors: [Color.clear, Color.black.opacity(0.5)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                }
            }
            .navigationTitle("상세 필터")
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

// MARK: - Preview

#Preview {
    RoundBookingView()
}
