import Foundation
import SwiftUI

// MARK: - Game Search ViewModel

@MainActor
class GameSearchViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var games: [Game] = []
    @Published var searchQuery: String = ""
    @Published var selectedDate: Date = Date()
    @Published var selectedTimeOfDay: GameSearchParams.TimeOfDay = .all
    @Published var minPrice: String = ""
    @Published var maxPrice: String = ""
    @Published var selectedPlayerCount: Int? = nil
    @Published var sortBy: GameSearchParams.SortOption = .price
    @Published var sortOrder: GameSearchParams.SortOrder = .asc

    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var errorMessage: String?
    @Published var showFilterSheet = false

    @Published var currentPage = 1
    @Published var totalPages = 1
    @Published var totalCount = 0

    // Selected for booking
    @Published var selectedGame: Game?
    @Published var selectedTimeSlot: GameTimeSlot?
    @Published var showBookingForm = false

    // MARK: - Private Properties

    private let gameService = GameService()
    private var searchTask: Task<Void, Never>?

    // MARK: - Computed Properties

    var hasMorePages: Bool {
        currentPage < totalPages
    }

    var dateOptions: [Date] {
        (0..<14).compactMap { Calendar.current.date(byAdding: .day, value: $0, to: Date()) }
    }

    var activeFiltersCount: Int {
        var count = 0
        if selectedTimeOfDay != .all { count += 1 }
        if !minPrice.isEmpty || !maxPrice.isEmpty { count += 1 }
        if selectedPlayerCount != nil { count += 1 }
        return count
    }

    // MARK: - Search

    func search() {
        searchTask?.cancel()

        searchTask = Task {
            await performSearch(resetPage: true)
        }
    }

    func searchDebounced() {
        searchTask?.cancel()

        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms

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

        let params = GameSearchParams(
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

        do {
            let response = try await gameService.searchGames(params: params)

            if resetPage {
                games = response.data
            } else {
                games.append(contentsOf: response.data)
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
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko_KR")

        if Calendar.current.isDateInToday(date) {
            return "오늘"
        } else if Calendar.current.isDateInTomorrow(date) {
            return "내일"
        } else {
            formatter.dateFormat = "M/d (E)"
            return formatter.string(from: date)
        }
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

    func selectTimeSlot(game: Game, timeSlot: GameTimeSlot) {
        selectedGame = game
        selectedTimeSlot = timeSlot
        showBookingForm = true
    }
}
