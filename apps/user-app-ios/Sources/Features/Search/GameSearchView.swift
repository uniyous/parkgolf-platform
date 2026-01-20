import SwiftUI

// MARK: - Game Search View

struct GameSearchView: View {
    @StateObject private var viewModel = GameSearchViewModel()

    var body: some View {
        ZStack {
            // Background
            LinearGradient.parkBackground
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                searchHeader

                // Date Selector
                dateSelector

                // Time of Day Filter
                timeOfDayFilter

                // Results
                if viewModel.isLoading && viewModel.games.isEmpty {
                    ParkLoadingView(message: "라운드 검색 중...")
                } else if let error = viewModel.errorMessage, viewModel.games.isEmpty {
                    ParkErrorView(message: error) {
                        viewModel.search()
                    }
                } else if viewModel.games.isEmpty {
                    ParkEmptyStateView(
                        icon: "magnifyingglass",
                        title: "검색 결과가 없습니다",
                        description: "다른 날짜나 검색어로 시도해보세요"
                    )
                } else {
                    gameList
                }
            }
        }
        .sheet(isPresented: $viewModel.showFilterSheet) {
            FilterSheet(viewModel: viewModel)
        }
        .fullScreenCover(isPresented: $viewModel.showBookingForm) {
            if let game = viewModel.selectedGame,
               let timeSlot = viewModel.selectedTimeSlot {
                BookingFormView(
                    game: game,
                    timeSlot: timeSlot,
                    selectedDate: viewModel.selectedDate
                )
            }
        }
        .task {
            viewModel.search()
        }
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
            .accessibilityIdentifier("gameSearchField")
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
            HStack(spacing: ParkSpacing.xs) {
                ForEach(viewModel.dateOptions, id: \.self) { date in
                    DateChip(
                        title: viewModel.formatDate(date),
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
            ForEach(GameSearchParams.TimeOfDay.allCases, id: \.self) { timeOfDay in
                FilterChip(
                    title: timeOfDay.rawValue,
                    isSelected: viewModel.selectedTimeOfDay == timeOfDay
                ) {
                    viewModel.selectedTimeOfDay = timeOfDay
                    viewModel.search()
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

    // MARK: - Game List

    private var gameList: some View {
        ScrollView {
            LazyVStack(spacing: ParkSpacing.md) {
                ForEach(viewModel.games) { game in
                    GameCardView(game: game, selectedDate: viewModel.selectedDate) { timeSlot in
                        viewModel.selectTimeSlot(game: game, timeSlot: timeSlot)
                    }
                    .accessibilityIdentifier("gameCard_\(game.id)")
                    .onAppear {
                        if game.id == viewModel.games.last?.id {
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
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.parkLabelMedium)
                .foregroundStyle(isSelected ? .white : .white.opacity(0.7))
                .padding(.horizontal, ParkSpacing.md)
                .padding(.vertical, ParkSpacing.xs)
                .background(
                    RoundedRectangle(cornerRadius: ParkRadius.full)
                        .fill(isSelected ? Color.parkPrimary : Color.white.opacity(0.1))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: ParkRadius.full)
                        .stroke(isSelected ? Color.parkPrimary : Color.white.opacity(0.2), lineWidth: 1)
                )
        }
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
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
        }
    }
}

// MARK: - Game Card View

struct GameCardView: View {
    let game: Game
    let selectedDate: Date
    let onSelectTimeSlot: (GameTimeSlot) -> Void

    @State private var showAllSlots = false

    private var displayedSlots: [GameTimeSlot] {
        guard let slots = game.timeSlots else { return [] }
        return showAllSlots ? slots : Array(slots.prefix(6))
    }

    private var hasMoreSlots: Bool {
        (game.timeSlots?.count ?? 0) > 6
    }

    var body: some View {
        GlassCard(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                // Game Info
                VStack(alignment: .leading, spacing: ParkSpacing.xs) {
                    HStack {
                        Text(game.name)
                            .font(.parkHeadlineMedium)
                            .foregroundStyle(.white)

                        Spacer()

                        if let range = game.priceRange {
                            PriceRangeDisplay(minPrice: range.min, maxPrice: range.max, size: .small)
                        }
                    }

                    HStack(spacing: ParkSpacing.md) {
                        Label(game.clubName, systemImage: "building.2")
                        Label(game.courseNames, systemImage: "flag")
                    }
                    .font(.parkBodySmall)
                    .foregroundStyle(.white.opacity(0.7))

                    HStack(spacing: ParkSpacing.md) {
                        Label(game.durationText, systemImage: "clock")
                        Label("최대 \(game.maxPlayers)명", systemImage: "person.2")
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
                            GridItem(.adaptive(minimum: 70), spacing: ParkSpacing.xs)
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
                                Text("+ \((game.timeSlots?.count ?? 0) - 6)개 더보기")
                                    .font(.parkLabelSmall)
                                    .foregroundStyle(Color.parkPrimary)
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
    let slot: GameTimeSlot
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                HStack(spacing: 2) {
                    Text(slot.startTime)
                        .font(.parkLabelMedium)
                    if slot.isPremium {
                        Text("💎")
                            .font(.system(size: 8))
                    }
                }

                Text("₩\(slot.price / 1000)k")
                    .font(.parkCaption)
                    .foregroundStyle(.white.opacity(0.7))

                HStack(spacing: 2) {
                    Circle()
                        .fill(availabilityColor)
                        .frame(width: 5, height: 5)
                    Text("\(slot.availableSlots)")
                        .font(.system(size: 9))
                        .foregroundStyle(.white.opacity(0.6))
                }
            }
            .foregroundStyle(.white)
            .frame(width: 70, height: 54)
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

// MARK: - Filter Sheet

struct FilterSheet: View {
    @ObservedObject var viewModel: GameSearchViewModel
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
                                ForEach(GameSearchParams.SortOption.allCases, id: \.self) { option in
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
                                ForEach(GameSearchParams.SortOrder.allCases, id: \.self) { order in
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
    GameSearchView()
}
