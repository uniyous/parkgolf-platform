import Foundation
import SwiftUI

// MARK: - Round Booking ViewModel

@MainActor
class RoundBookingViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var rounds: [Round] = []
    @Published var searchQuery: String = ""
    @Published var selectedDate: Date = DateHelper.tomorrow()
    @Published var selectedTimeOfDay: RoundSearchParams.TimeOfDay = .all
    @Published var minPrice: String = ""
    @Published var maxPrice: String = ""
    @Published var selectedPlayerCount: Int? = nil
    @Published var sortBy: RoundSearchParams.SortOption = .price
    @Published var sortOrder: RoundSearchParams.SortOrder = .asc

    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var errorMessage: String?
    @Published var showFilterSheet = false

    @Published var currentPage = 1
    @Published var totalPages = 1
    @Published var totalCount = 0

    // Selected for booking
    @Published var selectedRound: Round?
    @Published var selectedTimeSlot: TimeSlot?
    @Published var showBookingForm = false

    // MARK: - Private Properties

    private let roundService = RoundService()
    private var searchTask: Task<Void, Never>?

    // MARK: - Computed Properties

    var hasMorePages: Bool {
        currentPage < totalPages
    }

    var dateOptions: [Date] {
        DateHelper.dateRange(days: 30)
    }

    var activeFiltersCount: Int {
        var count = 0
        if !minPrice.isEmpty || !maxPrice.isEmpty { count += 1 }
        if selectedPlayerCount != nil { count += 1 }
        return count
    }

    // MARK: - Search

    func search() {
        #if DEBUG
        print("🔍 [RoundBookingViewModel] search() called - timeOfDay: \(selectedTimeOfDay.rawValue)")
        #endif
        searchTask?.cancel()

        searchTask = Task {
            await performSearch(resetPage: true)
        }
    }

    func searchDebounced() {
        searchTask?.cancel()

        searchTask = Task {
            try? await Task.sleep(nanoseconds: Configuration.Debounce.search)

            guard !Task.isCancelled else { return }

            await performSearch(resetPage: true)
        }
    }

    func loadMore() {
        guard hasMorePages, !isLoadingMore else { return }

        Task {
            await performSearch(resetPage: false)
        }
    }

    private func performSearch(resetPage: Bool) async {
        if resetPage {
            isLoading = true
            currentPage = 1
        } else {
            isLoadingMore = true
            currentPage += 1
        }

        errorMessage = nil

        let params = RoundSearchParams(
            query: searchQuery.isEmpty ? nil : searchQuery,
            date: selectedDate,
            timeOfDay: selectedTimeOfDay,
            minPrice: Int(minPrice),
            maxPrice: Int(maxPrice),
            minPlayers: selectedPlayerCount,
            sortBy: sortBy,
            sortOrder: sortOrder,
            page: currentPage,
            limit: 20
        )

        #if DEBUG
        print("📡 [RoundBookingViewModel] API 호출 - timeOfDay: \(params.timeOfDay?.rawValue ?? "nil"), timeRange: \(params.timeOfDay?.timeRange ?? ("nil", "nil"))")
        #endif

        do {
            let response = try await roundService.searchRounds(params: params)

            if resetPage {
                rounds = response.data
            } else {
                rounds.append(contentsOf: response.data)
            }

            totalPages = response.totalPages
            totalCount = response.total
        } catch {
            if !Task.isCancelled {
                errorMessage = error.localizedDescription
            }
        }

        isLoading = false
        isLoadingMore = false
    }

    // MARK: - Date Selection

    func selectDate(_ date: Date) {
        selectedDate = date
        search()
    }

    func formatDate(_ date: Date) -> String {
        DateHelper.toRelativeDate(date)
    }

    // MARK: - Time of Day Selection

    func selectTimeOfDay(_ timeOfDay: RoundSearchParams.TimeOfDay) {
        #if DEBUG
        print("⏰ [RoundBookingViewModel] selectTimeOfDay called: \(timeOfDay.rawValue)")
        #endif
        selectedTimeOfDay = timeOfDay
        search()
    }

    // MARK: - Filters

    func applyFilters() {
        showFilterSheet = false
        search()
    }

    func resetFilters() {
        selectedTimeOfDay = .all
        minPrice = ""
        maxPrice = ""
        selectedPlayerCount = nil
        sortBy = .price
        sortOrder = .asc
    }

    // MARK: - Booking

    func selectTimeSlot(round: Round, timeSlot: TimeSlot) {
        selectedRound = round
        selectedTimeSlot = timeSlot
        showBookingForm = true
    }
}
